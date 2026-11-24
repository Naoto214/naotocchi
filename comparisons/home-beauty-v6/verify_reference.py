"""Compare actual Canvas pixels against a separately built, pinned #567 preview.

Usage: python verify_reference.py V5_URL V6_URL OUTPUT_JSON
Requires Playwright and Chromium. Both servers run on localhost for crypto.subtle.
"""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

RENDER = """async ({prior}) => {
  const {composeNature} = await import('/game/beauty/paint.mjs');
  const {DAYPARTS} = await import('/game/home-dayparts.mjs');
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 450;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  const rect = {left:0, top:0, width:canvas.width, height:canvas.height};
  const effects = Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam reflections caustics'.split(' ').map(key=>[key,true]));
  const fall = {count:1,size:1,speed:1,wind:1};
  window.HomeBeauty = {sampleClock: seconds => seconds};
  function draw(im, old, settings, seconds, alpha = 1, reduced = false) {
    ctx.globalAlpha = 1; ctx.drawImage(old, 0, 0, rect.width, rect.height);
    ctx.globalAlpha = alpha; ctx.drawImage(im, 0, 0, rect.width, rect.height);
    ctx.globalAlpha = 1;
    HomeBeauty.settings = {strength:1, effects, split:.5, compareSplit:false, fall, ...settings};
    composeNature(ctx,rect,rect,{previous:old,image:im,alpha},seconds,reduced);
    return ctx.getImageData(0,0,rect.width,rect.height).data;
  }
  async function hash(pixels) {
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',pixels));
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function changed(a,b) {
    let count=0;
    for(let i=0;i<a.length;i+=4)
      if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=3)count++;
    return count;
  }
  const references={}, focuses={};
  const focusList = [
    ['forest','day','autumn','sunny'], ['forest','day','spring','sunny'],
    ['snow','day','winter','snow'], ['snow','night','winter','snow'],
    ['countryside','evening','autumn','sunny'], ['sea','day','summer','rain']
  ];
  const conditions = [
    ['autumn','sunny',1,false], ['spring','cloudy',.375,false],
    ['summer','rain',1,false], ['winter','snow',1,false], ['winter','snow',1,true]
  ];
  for(const [region,parts] of Object.entries(DAYPARTS)) {
    const entries=Object.entries(parts);
    const images=await Promise.all(entries.map(async ([,file])=>{
      const im=new Image(); im.src='/game/'+file; await im.decode(); return im;
    }));
    for(const [i,[time]] of entries.entries()) {
      const im=images[i], previous=images[(i+3)%4];
      for(const [season,weather,alpha,reduced] of conditions) {
        const opts={region,time,season,weather,variant:'E3'};
        references[[region,time,season,weather,alpha,reduced].join('/')] =
          await hash(draw(im,previous,opts,41.75,alpha,reduced));
      }
      if(prior)continue;
      for(const preset of focusList.filter(p=>p[0]===region&&p[1]===time)) {
        const [, ,season,weather]=preset;
        const ref={region,time,season,weather,variant:'E3'},plus={...ref,variant:'E3plus'};
        const at=t=>draw(im,previous,plus,t), reduce=t=>draw(im,previous,plus,t,1,true);
        const results={};
        for(const t of [30,60,180]) {
          const expected=draw(im,previous,ref,t);
          const candidate=at(t);
          const left=draw(im,previous,{...plus,compareSplit:true,split:1},t);
          const right=draw(im,previous,{...plus,compareSplit:true,split:0},t);
          results[t]={changedPixels:changed(expected,candidate),
            referenceAtRightEdge:changed(expected,left),candidateAtLeftEdge:changed(candidate,right)};
        }
        results.reducedTemporalPixels=changed(reduce(30),reduce(180));
        results.countControlPixels=changed(at(41),draw(im,previous,{...plus,fall:{...fall,count:0}},41));
        results.windControlPixels=changed(draw(im,previous,{...plus,fall:{...fall,wind:0}},41),draw(im,previous,{...plus,fall:{...fall,wind:2}},41));
        results.sizeControlPixels=changed(draw(im,previous,{...plus,fall:{...fall,size:.5}},41),draw(im,previous,{...plus,fall:{...fall,size:2}},41));
        results.speedControlPixels=changed(draw(im,previous,{...plus,fall:{...fall,speed:.25}},41),draw(im,previous,{...plus,fall:{...fall,speed:2}},41));
        const off={...effects,particles:false};
        results.withParticlesDisabled=changed(draw(im,previous,{...ref,effects:off},41),draw(im,previous,{...plus,effects:off},41));
        focuses[preset.join('/')]=results;
      }
    }
  }
  return {references,focuses};
}"""


def run(browser, base, prior):
    page = browser.new_page(viewport={"width": 300, "height": 450})
    try:
        page.route("**/probe", lambda route: route.fulfill(content_type="text/html", body="<title>Canvas proof</title>"))
        page.goto(base.rstrip("/") + "/probe")
        return page.evaluate(RENDER, {"prior": prior})
    finally:
        page.close()


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("v5")
    args.add_argument("v6")
    args.add_argument("out", type=Path)
    p = args.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"), args=["--no-sandbox"])
        before = run(browser, p.v5, True)["references"]
        after = run(browser, p.v6, False)
        version = browser.version
        browser.close()
    mismatches = [key for key in before if after["references"].get(key) != before[key]]
    result = {"chromium": version, "paintSize": [300,450], "referencePR": 567,
              "referenceCommit": "fae83a21915f9ada92f4ac13ac1aaacd397e333d",
              "referenceCases": len(before), "referenceMismatches": mismatches, "focuses": after["focuses"]}
    p.out.write_text(json.dumps(result, indent=2) + "\n")
    assert len(before) == 260 and not mismatches, mismatches
    assert len(result["focuses"]) == 6
    for case, readings in result["focuses"].items():
        assert readings["reducedTemporalPixels"] == 0, case
        for factor in ["count","wind","size","speed"]:
            assert readings[factor + "ControlPixels"] > 0, (case,factor)
        for t in ["30","60","180"]:
            r = readings[t]
            assert r["changedPixels"] > 0 and r["referenceAtRightEdge"] == r["candidateAtLeftEdge"] == 0, (case,t,r)
    print(f'{len(before)} E3 reference images match. All six scene and slider probes passed.')


if __name__ == "__main__":
    main()
