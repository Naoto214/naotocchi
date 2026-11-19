"""Measure paired Canvas passes without residents, including deferred raster readback."""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

from verify_v6 import SCENES

MEASURE = """async ([region,time,season,weather])=>{
 const {composeNature}=await import('/game/beauty/paint.mjs');
 const {DAYPARTS}=await import('/game/home-dayparts.mjs');
 const width=390,height=585,rect={left:0,top:0,width,height};
 const target=document.createElement('canvas');target.width=width;target.height=height;
 const ctx=target.getContext('2d',{willReadFrequently:false});
 const effects=Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam caustics reflections'.split(' ').map(k=>[k,true]));
 const anchor={sampleClock:x=>x,settings:{region,time,season,weather,effects,count:1,speed:1,strength:1,compareSplit:false,split:.5,
   fall:{count:1,size:1,speed:1,wind:1}}};
 window.HomeBeauty=anchor;
 const im=new Image();im.src='/game/'+DAYPARTS[region][time];await im.decode();
 function measure(variant,t){
   anchor.settings.variant=variant;
   ctx.drawImage(im,0,0,width,height);ctx.getImageData(0,0,1,1);
   const start=performance.now();
   composeNature(ctx,rect,rect,{image:im,previous:null,alpha:1},t,false);
   const submitted=performance.now();ctx.getImageData(0,0,width,height);
   return [submitted-start,performance.now()-start];
 }
 const samples={E3:[],E3plus:[]};
 for(let i=-4;i<48;i++){
   const t=24.5+i*.23;
   for(const v of (i%2?['E3plus','E3']:['E3','E3plus'])){
     const pair=measure(v,t);if(i>=0)samples[v].push(pair);
   }
 }
 return samples;
}"""

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8196')
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--scenes',choices=SCENES,nargs='+',default=list(SCENES))
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    with sync_playwright() as pw:
        browser=getattr(pw,args.engine).launch(**(
            {'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if args.engine=='chromium' else {}))
        page=browser.new_page(viewport={'width':390,'height':585},device_scale_factor=1)
        page.route('**/compositor-check',lambda route:route.fulfill(body='<!doctype html><title>Canvas</title>',
                   content_type='text/html',headers={'Cross-Origin-Opener-Policy':'same-origin',
                   'Cross-Origin-Embedder-Policy':'require-corp'}))
        page.goto(args.url+'/compositor-check')
        result={'browser':browser.version,'engine':args.engine,'affinity':sorted(os.sched_getaffinity(0)),
                'pixels':[390,585],'columns':['submitMs','submitAndReadbackMs'],'rows':{}}
        for scene in args.scenes:
            conditions=SCENES[scene]
            result['rows'][scene]=page.evaluate(MEASURE,conditions)
            args.out.write_text(json.dumps(result,separators=(',',':'))+'\n')
            print(scene,flush=True)
        browser.close()
