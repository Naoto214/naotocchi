"""Use the measured native browser's navigation, art, and live peers to classify original wander points."""
import argparse
import json
import os
from pathlib import Path
from unittest.mock import patch
import matrix_worker_v11 as house

HERE=Path(__file__).resolve().parent
HOOK="globalThis.HomeGoalDiagnostics?.proposal(a,raw,p,scene.navigation?.intentScale,clock);"
CHECK=r"""
if (qa.ageActive) {
  const audit=qa.wanderTopology ||= {draws:0,terrain:0,visibleOnTerrain:0,
    freeOnTerrain:0,staticExact:0,staticUnresolved:0,withCheckedAlternative:0,points:[]};
  audit.draws++;
  const nav=scene.navigation, see=scene.planVisibility(a), valid=nav.valid(raw);
  if(valid)audit.terrain++;
  if(valid && see(raw))audit.visibleOnTerrain++;
  if(valid && free(a,raw)){
    audit.freeOnTerrain++;
    const same=q=>q&&Math.hypot(q.x-raw.x,q.y-raw.y)<1e-5;
    const toRaw=r=>r?.length && same(r.at(-1))&&r.every((q,i)=>nav.segmentSafe(i?r[i-1]:a,q,see));
    const direct=nav.segmentSafe(a,raw,see);
    const connected=direct||!!toRaw(nav.route(a,raw,b,see))||!!toRaw(nav.referenceRoute?.(a,raw,b,see))
      ||!!toRaw(nav.reachable?.(a,raw,b,see,same));
    if(connected)audit.staticExact++;else audit.staticUnresolved++;
    const alternative=chooseWanderGoal(a,raw,true);
    if(alternative!==raw)audit.withCheckedAlternative++;
    const row={key:a.key,clock,from:[a.x,a.y],raw:[raw.x,raw.y],scale:[nav.intentScale.x,nav.intentScale.y],
      direct,connected,alt:alternative===raw?null:[alternative.x,alternative.y],chosen:[p.x,p.y]};
    audit.points.push(row);
    (qa.measuringWander ||= new Map()).set(a.key,row);
  }
}"""
def instrument(name,source):
    s=house.instrument(name,source)
    if "function chooseWanderGoal(a,raw)" not in s:return s
    once=house.old.legacy.once
    s=once(s,"function chooseWanderGoal(a,raw) {","function chooseWanderGoal(a,raw,diagnose=false) {")
    s=once(s,"if (nav.valid(raw) && free(a, raw)) return raw;","if (!diagnose && nav.valid(raw) && free(a, raw)) return raw;")
    s=once(s,"if (!stillSeeking && castWidth <= scene.width * 2.55) return raw;",
           "if (!diagnose && !stillSeeking && castWidth <= scene.width * 2.55) return raw;")
    s=once(s,HOOK,HOOK+CHECK)
    mark="    function move(key,p,source='tap',{pointerDrop=false}={}){"
    s=once(s,mark,r"""    function move(key,p,source='tap',opts={}){
      const row=qa.measuringWander?.get(key);
      if(row && (source!=='ambient' || row.raw[0]!==p.x || row.raw[1]!==p.y))qa.measuringWander.delete(key);
      const ok=topologyMeasureMove(key,p,source,opts),a=actor(key);
      if(row && qa.measuringWander?.get(key)===row){
        row.accepted=ok; const endpoint=ok&&(a.route?.at(-1)||a.target);
        row.endpoint=endpoint?[endpoint.x,endpoint.y]:null;
      }
      return ok;
    }
"""+mark.replace("function move","function topologyMeasureMove"))
    mark="if(mobility?.enabled)mobility.hop(a,p,clock);"
    s=once(s,mark,r"""if(a.source==='ambient'){
      const witness=qa.measuringWander?.get(a.key);
      if(witness){witness.end=[p.x,p.y];witness.actual=(witness.actual||0)+Math.hypot((p.x-a.x)*witness.scale[0],(p.y-a.y)*witness.scale[1]);}
    }
"""+mark)
    mark="emit('arrive',a,a.source);"
    return once(s,mark,r"""if(a.source==='ambient'){
      const witness=qa.measuringWander?.get(a.key);
      if(witness){witness.arrived=true;qa.measuringWander.delete(a.key);}
    }
"""+mark)

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('url');ap.add_argument('out',type=Path)
    ap.add_argument('--regions',nargs='+',default=['forest','river_lake','home'])
    ap.add_argument('--counts',nargs='+',type=int,default=[20,28]);ap.add_argument('--widths',nargs='+',type=int,default=[320,390])
    args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    with house.old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        try:
            for region in args.regions:
                for count in args.counts:
                    for width in args.widths:
                        coord=(region,count,width);file=args.out/f'{region}-{count}-{width}.json'
                        if file.exists():continue
                        with patch.object(house.v9,'patched',instrument),house.v9.native_page(browser,args.url,*coord,'v11',True) as room:
                            page,touch,start=room
                            result,state=house.baseline.natural_aging(page,touch,start,house.baseline.v8.subjects()[coord],True)
                            audit=page.evaluate('touchQA.wanderTopology')
                            assert audit and audit['draws']>0 and abs(state['clock']-300)<.01
                            file.write_text(json.dumps(dict(region=region,count=count,width=width,source=start['hashes'],
                                clock=state['clock'],safety=result['safety'],audit=audit),indent=2)+'\n')
                            print(coord,audit['draws'],audit['freeOnTerrain'],audit['staticUnresolved'],flush=True)
        finally:browser.close()
