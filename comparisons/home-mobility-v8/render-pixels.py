"""Compare original and batched paints on the same paused, decoded, visible scene."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageChops
from io import BytesIO
from playwright.sync_api import sync_playwright


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base",default="http://127.0.0.1:8388/game")
    ap.add_argument("--out",type=Path,required=True)
    opt=ap.parse_args()
    read=lambda arm:urlopen(opt.base+"/home-production-diorama-mobility-"+arm+".js").read().decode()
    old,candidate=read("v7"),read("v8")
    foreground=old[old.index("    function paintForeground("):old.index("\nconst inside=")]
    paint=old[old.index("    function paint(){"):old.index("    function stop(){")]
    legacy=foreground.replace("paintForeground(","pixelLegacyForeground(")+paint.replace("paintForeground(","pixelLegacyForeground(").replace("function paint(){","function pixelLegacyPaint(){")
    # The two native functions paint the very same nodes. Reset only their
    # paint stamp so both paths also execute the changed-position branch.
    anchor="    function paint(){"
    assert candidate.count(anchor)==1
    injected=candidate.replace(anchor,legacy+"""
    window.paintPixelTrial=legacy=>{
      for(const row of rows.values())row.paintStamp=null;
      (legacy?pixelLegacyPaint:paint)();
      return {residents:rows.size,waiting:pendingResidentPresentation,active:enabled};
    };
"""+anchor)
    hashes=lambda x:hashlib.sha256(x).hexdigest()
    data={"source":{"v7":hashes(old.encode()),"v8":hashes(candidate.encode())},"scenes":[]}
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path="/usr/bin/chromium")
        data["browser"]=b.version
        for region,time in [("forest","day"),("city","evening")]:
            page=b.new_page(viewport={"width":390,"height":792},device_scale_factor=2,is_mobile=True,has_touch=True)
            page.add_init_script("""()=>{
              for(const k of ['requestAnimationFrame','setTimeout','setInterval']){
                const schedule=window[k];
                window[k]=function(callback,...args){
                  return schedule.call(window,typeof callback==='function'?function(...v){
                    if(!window.holdPixelTasks)return callback.apply(this,v);
                  }:callback,...args);
                };
              }
            }""".replace("()=>{","(()=>{",1)+" )();")
            def route(r):
                res=r.fetch()
                r.fulfill(response=res,body=injected)
            page.route("**/home-production-diorama-mobility-v7.js*",route)
            try:
                page.goto(opt.base+"/mobility-v7.html?region="+region+"&time="+time+"&count=28&policy=B&variant=B&layout=optimized&curve=linear&ground=on&paused=1&clock=0&season=autumn&weather=sunny",wait_until="domcontentloaded",timeout=120000)
                page.wait_for_function("window.HomeCastTrial?.ready&&HomeCastTrial.inspect().length===28&&window.paintPixelTrial&&!paintPixelTrial(false).waiting",timeout=120000)
                page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
                # Freeze only this visual control. The timing experiments always
                # retain the browser's native scheduler with all gameplay active.
                clip=page.evaluate("""()=>{
                  window.holdPixelTasks=true;
                  const style=document.createElement('style');
                  style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
                  document.head.appendChild(style);
                  for(const a of document.getAnimations())a.pause();
                  for(const svg of document.querySelectorAll('svg'))svg.pauseAnimations?.();
                  const r=document.querySelector('#castStage').getBoundingClientRect();
                  const x=Math.max(0,Math.ceil(r.left)),y=Math.max(0,Math.ceil(r.top));
                  return {x,y,width:Math.floor(Math.min(innerWidth,r.right)-x),height:Math.floor(Math.min(innerHeight,r.bottom)-y)};
                }""")
                assert clip["height"]>40 and clip["width"]>80,clip
                imgs=[]
                for arm in ("v7","v8","v7"):
                    info=page.evaluate("legacy=>paintPixelTrial(legacy)",arm=="v7")
                    assert info=={"residents":28,"waiting":False,"active":True},info
                    im=Image.open(BytesIO(page.screenshot(clip=clip,timeout=60000))).convert("RGB")
                    imgs.append(im)
                bbox=ImageChops.difference(imgs[0],imgs[1]).getbbox()
                control=ImageChops.difference(imgs[0],imgs[2]).getbbox()
                entry={"region":region,"time":time,"clipCSS":clip,"pixelSize":imgs[0].size,"returnControlDiffBox":control,
                       "v7v8DiffBox":bbox,"pixelSHA256":[hashes(im.tobytes()) for im in imgs]}
                data["scenes"].append(entry)
                opt.out.write_text(json.dumps(data,separators=(",",":"))+"\n")
                assert bbox is None and control is None,entry
                print(region,entry,flush=True)
            finally:
                page.close()
        b.close()


if __name__=="__main__":
    main()
