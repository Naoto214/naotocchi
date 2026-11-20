"""Compare original and batched paints on the same paused, decoded, visible scene."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageChops
from io import BytesIO
from playwright.sync_api import sync_playwright


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base",default="http://127.0.0.1:8388/game")
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--engine",choices=["chromium","webkit"],default="chromium")
    ap.add_argument("--occluded-region",choices=["home","forest","river_lake","city"])
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
    window.placePixelChallenge=()=>{
      const a=model.snapshot()[0],row=rows.get(a.key),n=row.owner.querySelector('.character-asset');
      const vp=env.NaotocchiHomeViewport,p=vp?.residentPresentation?.(),host=displayRect(worldHost);
      const polygons=polygonsAt(a);if(!polygons.length||!n)return false;
      const stageBox=stage.getBoundingClientRect(),cx=(stageBox.left+stageBox.right)/2,cy=(stageBox.top+stageBox.bottom)/2;
      const project=([x,y])=>p?[p.x+(host.left+x-p.x)*p.scaleX,p.y+(host.top+y-p.y)*p.scaleY]:[host.left+x,host.top+y];
      const originalCenter=project(polygons[0].reduce(([x,y],[u,v])=>[x+u/polygons[0].length,y+v/polygons[0].length],[0,0]));
      const inside=([x,y])=>x>Math.max(0,stageBox.left)+1&&x<Math.min(innerWidth,stageBox.right)-1&&y>Math.max(0,stageBox.top)+1&&y<Math.min(innerHeight,stageBox.bottom)-1;
      const visible=[];
      for(const poly of polygons)for(let i=0;i<poly.length;i++){
        const first=project(poly[i]),second=project(poly[(i+1)%poly.length]);
        for(let fraction=0;fraction<=1;fraction+=.03125){
          const xy=first.map((v,j)=>v+(second[j]-v)*fraction);
          if(inside(xy))visible.push(xy);
        }
      }
      visible.sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cy)-Math.hypot(b[0]-cx,b[1]-cy));
      if(!visible.length)return {offscreen:true,originalCenter,polygons:polygons.map(poly=>poly.map(project))};
      const [gx,gy]=visible[0];
      const old=n.style.translate, r=n.getBoundingClientRect();
      // Probe the actual parent's local unit basis, including mirrored sprites.
      n.style.translate='80px 0px';const rx=n.getBoundingClientRect();
      n.style.translate='0px 80px';const ry=n.getBoundingClientRect();
      const m=new env.DOMMatrix([(rx.left-r.left)/80,(rx.top-r.top)/80,(ry.left-r.left)/80,(ry.top-r.top)/80,0,0]);
      const d=new env.DOMPoint(gx-r.left-r.width/2,gy-r.top-r.height/2).matrixTransform(m.inverse());
      n.style.translate=d.x+'px '+d.y+'px';paint();const q=n.getBoundingClientRect();return {originalCenter,sprite:a.key,mask:!!n.style.maskImage,at:[q.left,q.top,q.right,q.bottom]};
    };
    window.paintPixelTrial=legacy=>{
      for(const row of rows.values())row.paintStamp=null;
      (legacy?pixelLegacyPaint:paint)();
      return {residents:rows.size,waiting:pendingResidentPresentation,active:enabled};
    };
"""+anchor)
    hashes=lambda x:hashlib.sha256(x).hexdigest()
    data={"source":{"v7":hashes(old.encode()),"v8":hashes(candidate.encode())},"scenes":[]}
    with sync_playwright() as pw:
        executable=os.getenv("WEBKIT_PATH") if opt.engine=="webkit" else os.getenv("CHROMIUM_PATH","/usr/bin/chromium")
        b=getattr(pw,opt.engine).launch(executable_path=executable)
        data["engine"]=opt.engine
        data["browser"]=b.version
        for region,time in ([(opt.occluded_region,"day")] if opt.occluded_region else [("forest","day"),("city","evening")]):
            width,height={"home":(320,568),"river_lake":(844,390)}.get(opt.occluded_region,(390,792))
            page=b.new_page(viewport={"width":width,"height":height},device_scale_factor=2,is_mobile=True,has_touch=True)
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
                challenge=None
                if opt.occluded_region:
                    challenge=page.evaluate("placePixelChallenge()")
                    if challenge and challenge.get("offscreen"):
                        data["scenes"].append({"region":region,"time":time,"clipCSS":clip,"challenge":challenge})
                        opt.out.write_text(json.dumps(data,separators=(",",":"))+"\n")
                        continue
                    assert challenge and challenge["mask"],challenge
                    x,y,r,bottom=challenge["at"]
                    assert x<clip["x"]+clip["width"] and r>clip["x"] and y<clip["y"]+clip["height"] and bottom>clip["y"],(clip,challenge)
                imgs=[]
                for arm in ("v7","v8","v7"):
                    info=page.evaluate("legacy=>paintPixelTrial(legacy)",arm=="v7")
                    assert info=={"residents":28,"waiting":False,"active":True},info
                    im=Image.open(BytesIO(page.screenshot(clip=clip,timeout=60000))).convert("RGB")
                    imgs.append(im)
                bbox=ImageChops.difference(imgs[0],imgs[1]).getbbox()
                control=ImageChops.difference(imgs[0],imgs[2]).getbbox()
                entry={"region":region,"time":time,"challenge":challenge,"clipCSS":clip,"pixelSize":imgs[0].size,"returnControlDiffBox":control,
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
