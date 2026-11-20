"""Repeat the lake E3 cold/steady/pixel test using its normal and fallback paths."""
import argparse
import json
import os
from pathlib import Path
from statistics import median
from playwright.sync_api import sync_playwright

BENCH = """async()=>{
 const {DAYPARTS}=await import('/game/home-dayparts.mjs');
 const {drawSnowCityLake}=await import('/game/beauty/snow-city-lake.mjs');
 const proto=OffscreenCanvas.prototype, transfer=proto.transferToImageBitmap;
 if(typeof transfer!=='function')throw Error('This browser only supports the fallback');
 const width=390,height=585,c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{willReadFrequently:false}), samples={fallback:[],snapshot:[]}, pixels={};
 async function image(time){const i=new Image();i.src='/game/'+DAYPARTS.memory_lake[time];await i.decode();return i;}
 function render(mode,img,seconds,time,wantPixels=false){
   ctx.drawImage(img,0,0,width,height);ctx.getImageData(0,0,1,1);
   // Only the isolated test context is affected. Use a new image identity for
   // each arm so both normal and fallback paths construct their own extracts.
   proto.transferToImageBitmap=mode==='fallback'?undefined:transfer;
   try {
     const begin=performance.now();
     drawSnowCityLake(ctx,{image:img,region:'memory_lake',variant:'E3',width,height,seconds,
         opacity:1,strength:1,effects:{},time,season:'summer',weather:'sunny'});
     const sent=performance.now(),data=ctx.getImageData(0,0,width,height).data,done=performance.now();
     return wantPixels?data:[sent-begin,done-sent,done-begin];
   } finally {proto.transferToImageBitmap=transfer;}
 }
 for(let i=0;i<12;i++){
   for(const mode of (i%2?['snapshot','fallback']:['fallback','snapshot'])){
     const img=await image('night');
     const trial=[render(mode,img,16,'night')];
     for(let k=0;k<5;k++)trial.push(render(mode,img,16.25+k*.25,'night'));
     samples[mode].push(trial);
   }
 }
 for(const time of ['morning','day','evening','night']){
   const a=await image(time),b=await image(time);let changed=0,max=0;
   for(const t of [3.5,16.25,98]){
     const left=render('fallback',a,t,time,true),right=render('snapshot',b,t,time,true);
     for(let i=0;i<left.length;i++){const d=Math.abs(left[i]-right[i]);changed+=d!==0;max=Math.max(max,d);}
   }
   pixels[time]={frames:3,changedRGBAChannels:changed,maxChannelError:max};
 }
 return {samples,pixels};
}"""

def summarize(rows):
    return dict(zip(['submitMs','readbackMs','totalMs'],[round(median(col),3) for col in zip(*rows)]))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base')
    parser.add_argument('out',type=Path)
    args=parser.parse_args()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        page=browser.new_page()
        page.route('**/lake-probe',lambda r:r.fulfill(body='<!doctype html><title>Lake test</title>',content_type='text/html',
                   headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}))
        page.goto(args.base.rstrip('/')+'/lake-probe')
        data=page.evaluate(BENCH)
        data['browser']=browser.version
        data['clockIsolated']=page.evaluate('crossOriginIsolated')
        data['affinity']=sorted(os.sched_getaffinity(0)) if hasattr(os,'sched_getaffinity') else None
        data['median']={}
        for mode,trials in data['samples'].items():
            data['median'][mode]={'cold':summarize([t[0] for t in trials]), 'warm':summarize([r for t in trials for r in t[1:]])}
        args.out.write_text(json.dumps(data,indent=2)+'\n')
        print(json.dumps(data['median']))
        browser.close()
        assert all(v['changedRGBAChannels']==0 for v in data['pixels'].values()),data['pixels']

if __name__=='__main__': main()
