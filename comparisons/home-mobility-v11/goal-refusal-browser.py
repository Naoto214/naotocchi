"""Find real post-refusal forward routes at native browser feet, then physically replay if one exists."""
import argparse
import json
import os
from pathlib import Path
import subprocess
from unittest.mock import patch
import matrix_worker_v11 as house
HERE=Path(__file__).resolve().parent
model_cache={}
def transform(source,mode):
    key=(source,mode)
    if key not in model_cache:
        code="const fs=require('fs');process.stdout.write(require('./goal-after-refusal.cjs').patchAfterRefusal(fs.readFileSync(0,'utf8'),{shadow:process.argv[1]==='shadow',policy:process.argv[1]==='ray'?'ray':'pivot'}))"
        model_cache[key]=subprocess.run(['node','-e',code,mode],cwd=HERE,input=source,text=True,capture_output=True,check=True).stdout
    return model_cache[key]
def instruments(mode):
    def apply(name,source):
        if "production-model" in name:source=transform(source,mode)
        s=house.instrument(name,source)
        if 'HomeRefusedWanderAudit?.(' not in s:return s
        once=house.old.legacy.once
        marker='globalThis.HomeRefusedWanderAudit?.(a,p,checked,clock,scene.navigation?.intentScale);'
        s=once(s,marker,r"""if(qa.ageActive){
          const audit=qa.postRefusal ||= {declines:0,offers:[],pending:new Map()};
          audit.declines++;
          if(checked){
            const sc=scene.navigation.intentScale;
            const row={key:a.key,clock:clock,raw:[p.x,p.y],origin:[a.x,a.y],scale:[sc.x,sc.y],
              route:checked.map(q=>[q.x,q.y]),arrived:false,travel:0};
            audit.offers.push(row);audit.pending.set(a.key,row);
          }
        }""")
        mark="    function move(key,p,source='tap',{pointerDrop=false}={}){"
        s=once(s,mark,mark+r"""const watch=qa.postRefusal?.pending.get(key);
          if(watch && (source!=='ambient'||watch.raw[0]!==p.x||watch.raw[1]!==p.y))qa.postRefusal.pending.delete(key);
          """)
        mark='if(mobility?.enabled)mobility.hop(a,p,clock);'
        s=once(s,mark,r"""if(a.source==='ambient'){
          const w=qa.postRefusal?.pending.get(a.key);
          if(w){w.end=[p.x,p.y];w.travel+=Math.hypot((p.x-a.x)*w.scale[0],(p.y-a.y)*w.scale[1]);}
        }
"""+mark)
        mark="emit('arrive',a,a.source);"
        return once(s,mark,r"""if(a.source==='ambient'){
          const w=qa.postRefusal?.pending.get(a.key);
          if(w){w.arrived=true;w.end=[a.x,a.y];qa.postRefusal.pending.delete(a.key);}
        }
"""+mark)
    return apply

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('url');ap.add_argument('out',type=Path)
    ap.add_argument('--regions',nargs='+',default=['forest','river_lake','home']);ap.add_argument('--counts',nargs='+',type=int,default=[28,20]);ap.add_argument('--widths',nargs='+',type=int,default=[320,390]);ap.add_argument('--mode',choices=['shadow','active','ray'],default='shadow')
    args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    with house.old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        try:
            for region in args.regions:
                for count in args.counts:
                    for width in args.widths:
                        coord=(region,count,width);out=args.out/f'{args.mode}-{region}-{count}-{width}.json'
                        if out.exists():continue
                        with patch.object(house.v9,'patched',instruments(args.mode)),house.v9.native_page(browser,args.url,*coord,'v11-foot',True) as (page,touch,meta):
                            result,state=house.baseline.natural_aging(page,touch,meta,house.baseline.v8.subjects()[coord],True)
                            data=page.evaluate("(()=>{const a=touchQA.postRefusal;return {declines:a?.declines||0,offers:a?.offers||[]}})()")
                            assert abs(state['clock']-300)<.01
                            out.write_text(json.dumps(dict(mode=args.mode,region=region,count=count,width=width,source=meta['hashes'],clock=state['clock'],safety=result['safety'],**data),indent=2)+'\n')
                            print(coord,data['declines'],len(data['offers']),flush=True)
        finally:browser.close()
