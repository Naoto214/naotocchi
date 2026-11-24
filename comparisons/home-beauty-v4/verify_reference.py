"""Compare the actual V3 and V4 compositors on the same decoded art and clock."""
import argparse
import json
import os
import base64
import zlib
import numpy as np
from pathlib import Path
from playwright.sync_api import sync_playwright

RENDER = """async ({variant,split}) => {
  const {composeNature}=await import('/game/beauty/paint.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const canvas=document.createElement('canvas');
  canvas.width=240; canvas.height=360;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const art={left:0,top:0,width:240,height:360};
  const sums={};
  const compress=async bytes=>{
    const compressed=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    const blob=await new Response(compressed).blob();
    return new Promise(done=>{const reader=new FileReader();reader.onload=()=>done(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  };
  for(const region of ['forest','sea']){
    const parts=['morning','day','evening','night'];
    const images=await Promise.all(parts.map(async part=>{
      const im=new Image();im.src='/game/'+DAYPARTS[region][part];await im.decode();return im;
    }));
    for(const [i,time] of parts.entries()) for(const t of [30,60,180]) {
      const img=images[i],old=images[(i+3)%4], alpha=t===60?.375:1;
      const effects=Object.fromEntries(['water','light','particles','contact','motion','canopy','shafts','depth','gusts','magic','ground','waves','foam','reflections','caustics'].map(k=>[k,true]));
      window.HomeBeauty={settings:{variant,region,time,season:'summer',weather:'sunny',strength:1,effects,compareSplit:split,split:.5},sampleClock:x=>x};
      ctx.globalAlpha=1;ctx.drawImage(old,0,0,240,360);ctx.globalAlpha=alpha;
      ctx.drawImage(img,0,0,240,360);ctx.globalAlpha=1;
      composeNature(ctx,art,art,{image:img,previous:old,alpha},t,false);
      sums[[region,time,t].join('/')] = await Promise.all([0,120].map(x=>compress(ctx.getImageData(x,0,120,360).data)));
    }
  }
  return sums;
}"""

def collect(browser, origin, variant, split=False):
    page=browser.new_page(viewport={"width":240,"height":360})
    try:
        page.route("**/probe-page",lambda route: route.fulfill(content_type="text/html",body="<title>Reference check</title>"))
        page.goto(origin.rstrip("/")+"/probe-page")
        return page.evaluate(RENDER,{"variant":variant,"split":split})
    finally:
        page.close()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("v3")
    parser.add_argument("v4")
    parser.add_argument("out",type=Path)
    args=parser.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"),args=["--no-sandbox"])
        baseline=collect(browser,args.v3,"D3")
        candidate=collect(browser,args.v4,"D3")
        e3=collect(browser,args.v4,"E3")
        wipe=collect(browser,args.v4,"E3",True)
        browser.close()
    def metrics(encoded_a,encoded_b):
        def channels(value):
            return np.frombuffer(zlib.decompress(base64.b64decode(value)),dtype=np.uint8).astype(np.int16).reshape(-1,4)
        diff=np.abs(channels(encoded_a)-channels(encoded_b)).max(axis=1)
        return {"pixels":int(diff.size),"anyDelta":int((diff>0).sum()),"deltaOver3":int((diff>3).sum()),"maxDelta":int(diff.max())}
    result={}
    for key,(left,right) in baseline.items():
        result[key]={"baselineMatches": all(metrics(x,y)["anyDelta"]==0 for x,y in zip(candidate[key],[left,right])),
                     "wipeBaselineMatches":metrics(wipe[key][0],left),"wipeCandidateMatches":metrics(wipe[key][1],e3[key][1]),
                     "candidateChanged":any(metrics(x,y)["anyDelta"] for x,y in zip(e3[key],[left,right]))}
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,indent=2)+"\n")
    assert all(c["baselineMatches"] and c["candidateChanged"] for c in result.values())
    worst=max(c[side]["deltaOver3"]/c[side]["pixels"] for c in result.values() for side in ("wipeBaselineMatches","wipeCandidateMatches"))
    print("Maximum fraction of pixels differing by more than 3 levels at wipe",worst)
    assert worst<.001
    print(f"{len(result)} scenes passed D3 reference, E3, and both wipe halves.")

if __name__=="__main__":
    main()
