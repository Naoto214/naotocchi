"""Audit recorded live poses and the same poses with only the recorded participants moved. No simulation runs here."""
import argparse
from collections import defaultdict
import gzip
import json
from pathlib import Path
from unittest.mock import patch
from matrix_replay_river import inject,old,prior


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True)
    p.add_argument('--capture',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    args=p.parse_args();raw=args.capture.read_bytes();r=json.loads(gzip.decompress(raw))['attempts'][-1]
    rows=[e for e in r['events'] if e['event']['clock']>=73.9]
    old.require(r['matched'],'native event did not reproduce')
    with old.sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
        with patch.object(prior.v9,'patched',inject),prior.v9.native_page(b,args.url,'river_lake',28,375,'v12',True) as (page,_,meta):
            old.require(meta['hashes']==r['scripts'],'different model from the certified original')
            records=page.evaluate("""captures=>{
              const stages=[], frames=[];
              const trace=(name,clock,actors,output)=>{
                const raw=touchQA.riverExits(actors);
                output.push({name,clock,exits:Object.fromEntries(Object.entries(raw).map(([k,row])=>[k,Object.fromEntries(Object.entries(row).map(([r,v])=>[r,v.length]))]))});
              };
              for(const {event,snapshot} of captures)trace(event.type+(event.helper?' '+event.helper:''),event.clock,snapshot.state.actors,frames);
              const {event:plan,snapshot:begin}=captures.find(e=>e.event.type==='plan'&&e.event.found);
              const actors=structuredClone(begin.state.actors);
              trace('before',plan.clock,actors,stages);
              for(const part of [...plan.stages,{key:plan.owner,to:plan.q}]) {
                const actor=actors.find(a=>a.key===part.key);
                for(const [what,q] of [['via',part.via],['to',part.to]])if(q) {
                  actor.x=q.x;actor.y=q.y;trace(part.key+' '+what,null,actors,stages);
                }
              }
              return {frames,stages};
            }""",rows)
        b.close()
    worst=defaultdict(dict)
    for group,series in records.items():
        original=series[0]
        for sample in series[1:]:
            losses={r:[k for k,v in original['exits'].items() if v[r] and not sample['exits'][k][r]] for r in ('3','8','16')}
            worst[group][sample['name']]=losses
    result={'nativeCaptureSHA256':old.digest(raw),'matched':r['matched'],'scripts':meta['hashes'],'records':records,'lastExitDisappeared':worst}
    args.out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print(dict(worst))


if __name__=='__main__':
    main()
