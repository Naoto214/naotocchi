"""Measure actual native V5 planner decisions on unchanged, independently probed positions."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
REGIONS=('forest','river_lake','city','home','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake')
HEIGHT={320:568,375:812,390:844,430:932}

def once(source,needle,new):
    assert source.count(needle)==1,needle
    return source.replace(needle,new)


def instrument(source):
    # The probe runs an exact copy of move()'s target and path decision before
    # applying the route, timer, event or stat writes. In particular, legacy
    # routes, detours, reachable() and manual intent checks still execute.
    start="function move(key,p,source='tap'){"
    end='    function idle(a){'
    block=source[source.index(start):source.index(end)]
    block=once(block,start,"window.qaNativePaused=()=>paused;window.qaDryMove=function(key,p){const source='drag',manualGoals=new Map(),retryingKey=null;")
    block=once(block,'if(source!==\'ambient\'&&retryingKey!==key)a.manualUntil=clock+12;','')
    suffix="a.route=path.slice(1);a.target=path[0];a.source=source;"
    assert block.count(suffix)==1
    block=block[:block.index(suffix)]+'return {x:q.x,y:q.y,waypoints:path.length};\n    };\n'
    return once(source,start,block+start)

HIT_ANCHOR='function down(e){'
HIT_EXPOSE="""window.qaNativeHit=(x,y)=>{const el=doc.elementFromPoint(x,y);
 return el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')?
 hit(point({clientX:x,clientY:y}),el):null;};"""
QUERY="""({radii, directions})=>{
  const cast=HomeCastTrial.inspect(),p=NaotocchiHomeViewport.residentPresentation();
  const result={};
  for(const kind of ['pet','partner','companion']){
    const a=cast.find(a=>a.kind===kind);
    if(!a)continue;
    const attempts=[];
    for(const radius of radii)for(let i=0;i<directions;i++){
      const radians=2*Math.PI*i/directions;
      const goal={x:a.x+radius*Math.cos(radians)/p.scaleX,y:a.y+radius*Math.sin(radians)/p.scaleY};
      const chosen=qaDryMove(a.key,goal);
      const error=chosen?Math.hypot((chosen.x-goal.x)*p.scaleX,(chosen.y-goal.y)*p.scaleY):null;
      attempts.push(chosen?[+error.toFixed(2),chosen.waypoints]:null);
    }
    result[kind]={key:a.key,attempts};
  }
  return result;
}"""
POSE="JSON.stringify(HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.target,a.route,a.activity,a.source]))"


def read_out(path):
    return json.loads(path.read_text()) if path.is_file() else {'rows':{}}

def seed_signature(url,width,region,count,layout,extra):
    if layout=='fixed' or not extra:return 'v2'
    source=urlopen(url,timeout=30).read().decode()
    # Read the executed public selector, including wide-screen amendments,
    # rather than depending on a particular serialization of its candidate table.
    probe="""
const nav={initialPoint:()=>null,project:p=>[p.x,p.z],valid:()=>true};
const [w,h,region,n,gain]=process.argv.slice(2);
const seats=module.exports.withOpeningSeats(nav,{region},+w,+h,'?layout=optimized&extra='+gain);
const hints={};
for(let i=0;i<+n;i++){const p=seats.initialPoint(i,+n);if(p)hints[i]=p;}
process.stdout.write(JSON.stringify(hints));
"""
    hints=json.loads(subprocess.check_output(
        ['node','-',str(width),str(HEIGHT[width]-52),region,str(count),str(extra)],
        input=source+'\n'+probe,text=True))
    if not hints:return 'v2'
    return hashlib.sha256(json.dumps(hints,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:16]


def run(args):
    base=args.url.rstrip('/')
    game=base+'/game/'
    original=urlopen(game+'home-production-model.js',timeout=30).read()
    probe=instrument(original.decode())
    d=urlopen(game+'home-production-diorama-limit.js',timeout=30).read().decode()
    hit=once(d,HIT_ANCHOR,HIT_EXPOSE+HIT_ANCHOR)
    gain_file=urlopen(game+'limit-seating.js',timeout=30).read()
    out=read_out(args.out)
    out.update(nativeModelSha256=hashlib.sha256(original).hexdigest(),
               optimizedSeatsSha256=hashlib.sha256(gain_file).hexdigest(),
               radiiCss=args.radii,directions=args.directions,phase=args.phase)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        out['chromium']=browser.version
        for width in args.widths:
            context=browser.new_context(viewport={'width':width,'height':HEIGHT[width]-52},
                is_mobile=True,has_touch=True,device_scale_factor=2)
            context.route('**/home-production-model.js*',lambda r:r.fulfill(content_type='application/javascript',body=probe))
            context.route('**/home-production-diorama-limit.js*',lambda r:r.fulfill(content_type='application/javascript',body=hit))
            context.add_init_script(path=ROOT/'geometry_capture.js')
            for count in args.counts:
                for region in args.regions:
                    for layout in args.layouts:
                        groups={}
                        for gain in args.extras:
                            sig=seed_signature(game+'limit-seating.js',width,region,count,layout,gain)
                            groups.setdefault(sig,[]).append(gain)
                        for sig,size_list in groups.items():
                            extra=0 if layout=='fixed' else size_list[0]
                            key=f'{width}/{region}/{count}/{layout}/{extra}'
                            existing=out['rows'].get(key)
                            if existing and existing.get('seed','v2')==sig and existing['appliesTo']==size_list:continue
                            if layout=='optimized' and sig=='v2' and args.fixed_reference:
                                measured=read_out(args.fixed_reference)
                                assert measured['nativeModelSha256']==out['nativeModelSha256']
                                baseline_key=f'{width}/{region}/{count}/fixed/0'
                                fixed=measured['rows'].get(baseline_key)
                                if fixed:
                                    out['rows'][key]={**fixed,'appliesTo':size_list,
                                        'taps':{str(g):fixed['taps'][str(g)] for g in size_list},
                                        'seed':'v2','sameSeatsAs':baseline_key}
                                    args.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
                                    continue
                            page=context.new_page()
                            try:
                                print('opening',key,flush=True)
                                page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                                query=dict(region=region,count=count,extra=extra,layout=layout,
                                           clock=0,paused=1,time='day',variant='B',compareSplit=0)
                                page.goto(game+'limit.html?'+urlencode(query),wait_until='domcontentloaded',timeout=120000)
                                page.wait_for_function("""n=>window.qaLastScene?.navigation && window.HomeCastTrial?.inspect().length===n
                                  && NaotocchiHomeViewport?.residentPresentation?.() && HomeBeauty.paintRect?.width
                                  && JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').world?.loaded && window.HomeCastTrial.ready""",arg=count,timeout=180000,polling=150)
                                page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(img=>img.decode()))")
                                if args.phase=='moved':
                                    page.evaluate("""()=>{HomeCastTrial.apply({paused:false});for(let i=0;i<80;i++)
                                       qaNative.step(.1,{blocked:false,reducedMotion:false});HomeCastTrial.apply({paused:true})}""")
                                page.evaluate((ROOT/'verify_interact_hits.js').read_text())
                                pose=page.evaluate(POSE)
                                taps={}
                                for size in size_list:
                                    page.evaluate('extra=>HomeCastTrial.apply({extra})',size)
                                    taps[size]=page.evaluate('qaTapHits()')
                                    assert page.evaluate(POSE)==pose,key
                                tic=time.monotonic()
                                print('planning',key,flush=True)
                                assert not page.evaluate('qaNativePaused()'),'model blocked during dry-run'
                                routes=page.evaluate(QUERY,{'radii':args.radii,'directions':args.directions})
                                assert page.evaluate(POSE)==pose,key
                                out['rows'][key]=dict(appliesTo=size_list,taps=taps,routes=routes,
                                    seed=sig,
                                    poseSha256=hashlib.sha256(pose.encode()).hexdigest(),
                                    cpuTestWallSeconds=round(time.monotonic()-tic,3))
                                if args.record_feet:
                                    out['rows'][key]['nativeAtReady']=json.loads(pose)
                                    out['rows'][key]['afterRoute']=page.evaluate("""()=>({
                                      settings:HomeCastTrial.settings,region:HomeBeauty.settings.region,
                                      projection:NaotocchiHomeViewport.residentPresentation(),
                                      inputs:qaSyncCaptures.map(s=>({size:[s.scene.width,s.scene.height],hints:s.points})),
                                      cast:HomeCastTrial.inspect().map(a=>[a.key,a.foot.x,a.foot.y,a.depth])})""")
                                args.out.parent.mkdir(exist_ok=True,parents=True)
                                args.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
                                print(key,'routed',out['rows'][key]['cpuTestWallSeconds'],flush=True)
                            finally:page.close()
            context.close()
        browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--widths',nargs='+',type=int,choices=list(HEIGHT),default=list(HEIGHT))
    p.add_argument('--regions',nargs='+',choices=REGIONS,default=REGIONS)
    p.add_argument('--counts',nargs='+',type=int,default=[28]);p.add_argument('--extras',nargs='+',type=int,default=[0,5,10,15,20])
    p.add_argument('--layouts',nargs='+',choices=['fixed','optimized'],default=['fixed'])
    p.add_argument('--radii',nargs='+',type=int,default=[12]);p.add_argument('--directions',type=int,default=4)
    p.add_argument('--phase',choices=['initial','moved'],default='initial')
    p.add_argument('--fixed-reference',type=Path,help='reuse an already measured initial layout only for identical V2 seeds')
    p.add_argument('--record-feet',action='store_true',help='also save the actual coordinates used in a startup diagnosis')
    run(p.parse_args())
