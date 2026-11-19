"""Compare the same production E sea overlay on a decoded image cache hit vs miss.

With the private comparison bundle served locally:
  python verify_sea_cache.py http://127.0.0.1:8194 --out evidence/sea-cache.json

This is an offscreen Canvas microbenchmark. Home UI, resident simulation, image
decode and network are outside the measured function. Use verify_v4.py for
home internal-update and browser-animation timing.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

RUN = """async ({n,readback})=>{
 const [{drawSeaE},{DAYPARTS}]=await Promise.all([import('/game/beauty/sea-e.mjs'),import('/game/home-dayparts.mjs')]);
 const url='/game/'+DAYPARTS.sea.evening,load=async()=>{const im=new Image();im.src=url;await im.decode();return im;};
 const shared=await load(),canvas=document.createElement('canvas');
 // Portrait cover used by a 390 x 844 DPR 2 scene. No HTML/cartoon sprite costs.
 canvas.width=780;canvas.height=1688;
 const ctx=canvas.getContext('2d',{willReadFrequently:readback}), state={
  variant:'E3',time:'evening',region:'sea',width:844/1.5,height:844,
  effects:{water:true,light:true,particles:true,magic:true,motion:true},season:'summer',weather:'sunny',
  reduced:false,opacity:1,strength:1,seconds:20,image:shared};
 ctx.setTransform(2,0,0,2,(390-844/1.5),0);
 const raf=()=>new Promise(requestAnimationFrame);
 const sample=(image,seconds,force)=>{
  ctx.clearRect(-300,0,1000,844);
  const s={...state,image,seconds};const start=performance.now();drawSeaE(ctx,s);
  const submitted=performance.now();
  if(force)ctx.getImageData(0,0,canvas.width,canvas.height);
  return [submitted-start,performance.now()-start];
 };
 for(let i=0;i<8;i++){sample(shared,20+i/30,readback);await raf();}
 const rows=[];
 for(const variant of ['E1','E2','E3']){
  state.variant=variant;
  for(const strength of [.5,1,2]){
   state.strength=strength;const warm=[],cold=[];
   for(let i=0;i<n;i++){
    const fresh=await load(),t=22.3+i/24;
    // Same time and pixels for each A/B pair. Distinct predecoded elements are
    // unique WeakMap keys. Alternating order offsets first-sample bias.
    if(i%2){cold.push(sample(fresh,t,readback));await raf();warm.push(sample(shared,t,readback));}
    else{warm.push(sample(shared,t,readback));await raf();cold.push(sample(fresh,t,readback));}
    await raf();
   }
   rows.push({variant,strength,warm,cold});
  }
 }
 return {agent:navigator.userAgent,rows};
}"""


def distribution(samples):
    values = sorted(samples)
    n = len(values)
    return {
        "n": n,
        "median_ms": round((values[(n-1)//2]+values[n//2])/2, 3),
        "p95_ms": round(values[(95*n+99)//100-1], 3),
        "max_ms": round(values[-1], 3),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--samples", type=int, default=20)
    parser.add_argument("--chromium", default=os.getenv("CHROMIUM_BIN", "/usr/bin/chromium"))
    args = parser.parse_args()
    base = args.base.rstrip("/")
    source = urlopen(base + "/game/beauty/sea-e.mjs").read()
    report = {"dims": [390, 844, 2], "weather": "sunny", "time": "evening",
              "season": "summer", "seconds_start": 22.3, "paired_samples": args.samples,
              "source_sha256": hashlib.sha256(source).hexdigest(),
              "warm": "same decoded image and cached masked water surface",
              "cold": "fresh decoded image element, same pixels, new masked water surface"}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, args=["--no-sandbox"])
        for readback in [False, True]:
            tab = browser.new_page(viewport={"width": 390, "height": 844})
            tab.goto(base + "/game/beauty/bridge.js")
            result = tab.evaluate(RUN, {"n": args.samples, "readback": readback})
            out = []
            for row in result["rows"]:
                entry = {"variant": row["variant"], "strength": row["strength"]}
                for kind in ["warm", "cold"]:
                    entry[kind] = {"submit": distribution(v[0] for v in row[kind])}
                    if readback:
                        entry[kind]["draw_and_full_readback"] = distribution(v[1] for v in row[kind])
                out.append(entry)
            report["raster_readback" if readback else "submit_only"] = out
            report["agent"] = result["agent"]
            tab.close()
        browser.close()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(args.out)


if __name__ == "__main__":
    main()
