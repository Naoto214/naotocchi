"""Time Canvas submission and forced raster readback with paired source times, outside the resident model."""
import argparse
import json
import os
from pathlib import Path
from statistics import median

from playwright.sync_api import sync_playwright

from verify_perf import SCENES

MEASURE = """async ({scene,modes,samples,dpr,split,builds})=>{
 const [region,time,season,weather]=scene;
 const renderers={};
 for(const label of modes){
   const path=builds[label]?'/perf-build/'+label+'/paint.mjs':'/game/beauty/paint.mjs';
   renderers[label]=(await import(path)).composeNature;
 }
 const {DAYPARTS}=await import('/game/home-dayparts.mjs');
 const width=390,height=585,rect={left:0,top:0,width,height};
 const canvas=document.createElement('canvas');canvas.width=width*dpr;canvas.height=height*dpr;
 const ctx=canvas.getContext('2d',{willReadFrequently:false});ctx.scale(dpr,dpr);
 const effects=Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam caustics reflections'
   .split(' ').map(k=>[k,true]));
 const settings={region,time,season,weather,effects,count:28,speed:1,strength:1,compareSplit:split,split:.5,
   fall:{count:1,size:1,speed:1,wind:1},leafColor:'mixed'};
 const api=window.HomeBeauty={settings,sampleClock:t=>t};
 const image=new Image();image.src='/game/'+DAYPARTS[region][time];await image.decode();
 function measure(mode,t){
   settings.variant=builds[mode]?.mode??mode;
   ctx.drawImage(image,0,0,width,height);ctx.getImageData(0,0,1,1);
   const start=performance.now();
   renderers[mode](ctx,rect,rect,{image,previous:null,alpha:1},t,false);
   const submitted=performance.now();ctx.getImageData(0,0,canvas.width,canvas.height);
   return [submitted-start,performance.now()-start];
 }
 const result=Object.fromEntries(modes.map(mode=>[mode,[]]));
 // Rotate the first mode and alternate direction every full cycle to balance cache/order effects.
 for(let i=0;i<samples+8;i++){
   const t=24.5+(i-8)*.23,order=modes.slice(i%modes.length).concat(modes.slice(0,i%modes.length));
   if(Math.floor(i/modes.length)%2)order.reverse();
   for(const mode of order){const value=measure(mode,t);if(i>=8)result[mode].push(value);}
 }
 return result;
}"""


def main(a):
    with sync_playwright() as pw:
        browser=getattr(pw,a.engine).launch(**({'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
            'args':['--no-sandbox']} if a.engine=='chromium' else {'executable_path':os.getenv('WEBKIT_PATH')}))
        page=browser.new_page(viewport={'width':390,'height':585},device_scale_factor=a.dpr)
        page.route('**/paint-cost',lambda route:route.fulfill(body='<!doctype html><title>Canvas timing</title>',
            content_type='text/html',headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}))
        builds={label:{'root':url.rstrip('/'),'mode':mode} for label,url,mode in (a.build or [])}
        def load_build(route):
            label,name=route.request.url.split('/perf-build/',1)[1].split('/',1)
            response=route.fetch(url=builds[label]['root']+'/game/beauty/'+name)
            assert response.ok,response.url
            route.fulfill(response=response)
        if builds:
            page.route('**/perf-build/**',load_build)
        page.goto(a.url+'/paint-cost')
        result={'engine':a.engine,'browser':browser.version,'affinity':sorted(os.sched_getaffinity(0)),
            'css':[390,585],'split':a.split,'dpr':a.dpr,'pixels':[390*a.dpr,585*a.dpr],'secondsPerStep':.23,
            'columns':['submitMs','submitAndReadbackMs'],'url':a.url,'builds':builds,'rows':{}}
        a.out.parent.mkdir(exist_ok=True,parents=True)
        for scene in a.scenes:
            rows=page.evaluate(MEASURE,dict(scene=SCENES[scene],modes=list(builds) if builds else a.modes,samples=a.samples,dpr=a.dpr,split=a.split,builds=builds))
            assert all(len(v)==a.samples for v in rows.values())
            result['rows'][scene]={k:[[round(x,3) for x in t] for t in v] for k,v in rows.items()}
            print(scene,{k:[round(median(col),2) for col in zip(*v)] for k,v in rows.items()},flush=True)
            a.out.write_text(json.dumps(result,separators=(',',':'))+'\n')
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--url',default='http://127.0.0.1:8197')
    cli.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    cli.add_argument('--scenes',choices=SCENES,nargs='+',default=['forest-leaves','country-leaves'])
    cli.add_argument('--modes',choices=['E3plus','A','B','C'],nargs='+',default=['E3plus','A','B','C'])
    cli.add_argument('--build',nargs=3,action='append',metavar=('LABEL','URL','MODE'),
                     help='Pair separately served builds within one browser and Canvas')
    cli.add_argument('--split',action='store_true')
    cli.add_argument('--samples',type=int,default=48)
    cli.add_argument('--dpr',type=int,choices=[1,2],default=1)
    cli.add_argument('--out',type=Path,required=True)
    main(cli.parse_args())
