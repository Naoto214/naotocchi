"""Restore a real quiescent river household and observe the native normal scheduler and neighbor exits."""
import argparse
import gzip
import json
from pathlib import Path
from unittest.mock import patch

from matrix_capture_river import observer,old,prior


def inject(name,source):
    source=observer(name,source)
    if 'production-model' not in name:
        return source
    js=Path(__file__).with_name('matrix-river-exits.js').read_text()
    source=old.legacy.once(source,'    let checkpoint;',js+'\n    let checkpoint;')
    source=old.legacy.once(source,'    function step(dt,flags={}){','''    function step(dt,flags={}){
      if(qa.riverWatching && clock>=74.5 && clock<76 && Math.round(clock*20)%2===0)
        qa.riverSamples.push({clock, actors:structuredClone(actors)});''')
    return source


def replay(browser,base,frame,opening,to=120):
    with patch.object(prior.v9,'patched',inject),prior.v9.native_page(browser,base,'river_lake',28,375,'v12',True) as (page,_,meta):
        warm=prior.current_opening(page,meta)
        prior.match_opening(page,meta,warm,opening)
        page.evaluate(prior.baseline.INK)
        page.evaluate(prior.v9.TRACKS.replace("if (!r.active) throw Error('ambient arrival without recorded route');", "if (!r.active) return;"))
        page.evaluate(prior.baseline.v8.AGE_PROBE)
        page.evaluate(prior.baseline.v8.PAINT_PROBE)
        page.evaluate("""() => {HomeMobilityDiagnostics.enable(); HomeCastTrial.apply({paused:false});
          touchQA.manual=true;touchQA.log=null;touchQA.paint();touchQA.ageActive=true;}""")
        restored=page.evaluate("""s=>{touchQA.riverRestore(s);return touchQA.riverSnapshot();}""",frame)
        old.require(restored==frame,'donor did not round-trip')
        page.evaluate("""() => {
          const qa=touchQA;qa.riverWatching=true;qa.riverSamples=[];qa.riverEvents=[];
          globalThis.HomeV12CurveEvent=(type,details)=>{
            if(details.clock<100)qa.riverEvents.push({type,...structuredClone(details)});
          };
        }""")
        # Native timestep is exactly .05. Stay on its grid even at fractional checkpoint clocks.
        first=round(frame['state']['clock']*20)
        page.evaluate('ticks=>touchQA.advance(ticks*.05,true)',round((to*20)-first))
        info=page.evaluate("""() => {
          const q=touchQA;
          const cuts=[[74.65,'before'],[75.15,'second helper'],[75.35,'owner'],[75.65,'after']];
          const frames=cuts.map(([t,name])=>{
            const row=q.riverSamples.reduce((a,b)=>Math.abs(b.clock-t)<Math.abs(a.clock-t)?b:a);
            return {name,clock:row.clock,feet:row.actors.map(b=>[b.key,b.x,b.y,b.w,b.h]),
              exits:q.riverExits(row.actors)};
          });
          const ev=q.riverEvents;
          const plan=ev.find(e=>e.type==='plan'&&e.found&&e.owner==='companion:sekizou'&&e.clock>74&&e.clock<76);
          let staged=[];
          if(plan){
            const proto=q.riverSamples.filter(r=>r.clock<=plan.clock).at(-1).actors;
            const rows=structuredClone(proto);
            staged.push({name:'initial',exits:q.riverExits(rows)});
            for(const part of [...plan.stages,{key:plan.owner,to:plan.q}]){
              const row=rows.find(v=>v.key===part.key);
              for(const [name,p] of [['via',part.via],['to',part.to]])if(p){
                row.x=p.x;row.y=p.y;
                staged.push({name:part.key+'/'+name,exits:q.riverExits(rows)});
              }
            }
          }
          return {frames,staged,events:ev,clock:q.matrixState().clock,seed:q.readSeed(),feet:q.opening(),safety:q.ageSafety,
            ownTrips:q.matrixTracks.read()};
        }""")
        info.update(scripts=meta['hashes'],restoredSHA256=old.digest(old.canonical(restored).encode()))
        return info


def main():
    import zipfile
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True);parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--url',required=True);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    if args.source.suffix=='.gz':
        r=json.load(gzip.open(args.source))['attempts'][-1]
        frame=r['quiescent']; old.require(r['matched'],'original event differs from CI')
    else:
        frame=json.loads(args.source.read_bytes())['opening']
    with zipfile.ZipFile(args.archive) as z:
        cell=json.loads(gzip.decompress(z.read('river_lake-28-375.json.gz')))
    old.require(bool(frame) and not frame['relief'] and not frame['state']['manualGoals'],'need a quiescent household')
    opening=cell['arms']['v11-foot']['naturalOpening']['state']
    with old.sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
        result=replay(b,args.url,frame,opening,120)
        result['browser']=b.version
        args.out.write_bytes(gzip.compress((old.canonical(result)+'\n').encode(),mtime=0));b.close()
        print('source clock, goal, searches',frame['state']['clock'],[(e['type'],round(e['clock'],2),e.get('found'),e.get('accepted')) for e in result['events'] if e['owner']=='companion:sekizou' and e['clock']<79],flush=True)


if __name__=='__main__':
    main()
