"""Profile only the comparison Canvas compositor on decoded production WebPs.

Example: taskset -c 4 python verify_cost.py http://127.0.0.1:8195 evidence/compositor-cost.json
"""
import argparse
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

# Choose a visible, region-specific workload for both candidate and reference.
SCENES = {
    'home': ('evening','autumn','rain'), 'forest': ('day','summer','sunny'),
    'river_lake': ('day','summer','sunny'), 'city': ('night','autumn','rain'),
    'countryside': ('evening','summer','sunny'), 'mountain': ('morning','autumn','cloudy'),
    'snow': ('evening','winter','snow'), 'sea': ('evening','summer','sunny'),
    'jungle': ('day','summer','rain'), 'desert': ('day','summer','sunny'),
    'deepsea': ('day','summer','sunny'), 'star_stop': ('night','winter','sunny'),
    'memory_lake': ('night','summer','sunny'),
}
EFFECTS = 'water particles light contact motion canopy shafts depth gusts magic ground waves foam caustics reflections'.split()

MEASURE = """async ({region,scene,effects,rounds,warm,disable})=>{
 const [time,season,weather]=scene;
 const {composeNature}=await import('/game/beauty/paint.mjs');
 const {DAYPARTS}=await import('/game/home-dayparts.mjs');
 const width=390,height=585,rect={left:0,top:0,width,height};
 const target=document.createElement('canvas');target.width=width;target.height=height;
 const ctx=target.getContext('2d',{willReadFrequently:false});
 const flags=Object.fromEntries(effects.map(k=>[k,!disable.includes(k)]));
 const results={previous:{cold:[],warm:[]},E3:{cold:[],warm:[]},empty:[]};
 const url='/game/'+DAYPARTS[region][time];
 // Each trial gets a new identity for the compositors' WeakMap caches.
 // Decode and base blit occur before the timer. Base raster is synchronized.
 async function image(){const im=new Image();im.src=url;await im.decode();return im;}
 function render(im,variant,seconds,blank=false){
   window.HomeBeauty={sampleClock:x=>x,settings:{region,time,weather,season,variant,count:1,
     speed:1,strength:1,effects:flags,compareSplit:false,split:.5}};
   ctx.drawImage(im,0,0,width,height);ctx.getImageData(0,0,1,1);
   const start=performance.now();
   if(!blank)composeNature(ctx,rect,rect,{image:im,previous:null,alpha:1},seconds,false,{region,contain:false});
   const submit=performance.now();ctx.getImageData(0,0,width,height);
   const end=performance.now();return [submit-start,end-submit,end-start];
 }
 for(let i=0;i<rounds;i++){
   const order=i%2?['E3','previous']:['previous','E3'];
   for(const variant of order){
     const im=await image();
     results[variant].cold.push(render(im,variant,15.25));
     for(let j=0;j<warm;j++)results[variant].warm.push(render(im,variant,15.5+j*.25));
     results.empty.push(render(im,variant,0,true));
   }
 }
 return results;
}"""

def quantiles(values):
    ordered=sorted(values)
    def at(q):return round(ordered[max(0,math.ceil(q*len(ordered))-1)],3)
    return dict(p50=at(.5),p95=at(.95),max=at(1))

def summary(rows):
    return {key:quantiles([r[i] for r in rows]) for i,key in enumerate(('submitMs','readbackMs','totalMs'))}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base')
    parser.add_argument('out',type=Path)
    parser.add_argument('--region',action='append',choices=SCENES)
    parser.add_argument('--disable',action='append',choices=EFFECTS,default=[])
    parser.add_argument('--software',action='store_true',help='Force software Canvas to isolate CPU raster cost from GPU synchronization')
    parser.add_argument('--override',type=Path,help='Diagnostic only: serve this local module instead of same-name file in deployed build')
    parser.add_argument('--cpu-tiles',action='store_true',help='Diagnostic only: keep newly constructed intermediate 2D tile surfaces on CPU')
    parser.add_argument('--rounds',type=int,default=7)
    parser.add_argument('--warm',type=int,default=12)
    args=parser.parse_args()
    out={'softwareCanvas':args.software,'cpuTilesProbe':args.cpu_tiles,'override':args.override.name if args.override else None,'size':[390,585],'rounds':args.rounds,'warmPerRound':args.warm,
         'disabledEffects':args.disable,'rows':{},'affinity':sorted(os.sched_getaffinity(0)) if hasattr(os,'sched_getaffinity') else None}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']+(['--disable-gpu','--disable-accelerated-2d-canvas'] if args.software else []))
        page=browser.new_page(viewport={'width':390,'height':585},device_scale_factor=1)
        page.route('**/cost-probe',lambda route:route.fulfill(body='<!doctype html><title>Canvas cost</title>',
                    content_type='text/html',headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}))
        if args.override:
            page.route('**/game/beauty/'+args.override.name,lambda route:route.fulfill(path=args.override,content_type='application/javascript'))
        if args.cpu_tiles:
            page.add_init_script("""for(const proto of [HTMLCanvasElement.prototype,OffscreenCanvas.prototype]){
              const previous=proto.getContext;
              proto.getContext=function(type,attributes,...rest){
                if(type==='2d' && attributes?.willReadFrequently===undefined)attributes={...attributes,willReadFrequently:true};
                return previous.call(this,type,attributes,...rest);
              }
            }""")
        page.goto(args.base.rstrip('/')+'/cost-probe')
        out['browser']=browser.version
        out['crossOriginIsolated']=page.evaluate('crossOriginIsolated')
        for region in args.region or SCENES:
            raw=page.evaluate(MEASURE,dict(region=region,scene=SCENES[region],effects=EFFECTS,
                                 rounds=args.rounds,warm=args.warm,disable=args.disable))
            entry={'scene':SCENES[region], 'empty':summary(raw['empty'])}
            for mode in ('previous','E3'):
                entry[mode]={phase:summary(rows) for phase,rows in raw[mode].items()}
            out['rows'][region]=entry
            args.out.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
            print(region,entry['E3']['cold']['submitMs'],entry['E3']['warm']['submitMs'],flush=True)
        browser.close()

if __name__=='__main__':main()
