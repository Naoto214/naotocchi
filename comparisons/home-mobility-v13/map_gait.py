"""Measure actual CSS gait on a moving native resident and its unchanged contact radii."""

import argparse, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

EXAMINE = """() => {
  const walk=[...document.querySelectorAll('[data-diorama-walking="true"]')].map(node=>[node,node.querySelector('img.character-asset'),node.getAnimations({subtree:true}).find(a=>a.animationName==='diorama-walk')]).find(([,img,a])=>img&&a);
  if(!walk)return null;
  const [node,img,anim]=walk,key=node.dataset.dioramaActor,read=()=>HomeCastTrial.inspect().find(a=>a.key===key);
  const start=read(),p=NaotocchiHomeViewport.residentPresentation(),{scaleX,scaleY}=p,rest=anim.currentTime,rate=anim.playState;
  anim.pause();const snapshots=[];
  for(const at of [0,125,250,375,500]){anim.currentTime=at;const r=img.getBoundingClientRect(),a=read();snapshots.push({ms:at,relative:[r.left-a.foot.x,r.top-a.foot.y,r.width,r.height],foot:a.foot,axes:[(a.w+10)*scaleX,(a.h*.76+10)*scaleY],rotation:getComputedStyle(anim.effect.target).rotate,translate:getComputedStyle(anim.effect.target).translate});}
  anim.currentTime=rest;if(rate==='running')anim.play();return {key,asset:start.asset,role:start.kind,snapshots};
}"""


def main(args):
    data = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/chromium")
        for width in [320, 375, 390, 430]:
            page = b.new_page(
                viewport={"width": width, "height": 792},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )
            page.goto(
                args.base
                + f"/game/mobility-v12.html?region=forest&time=day&count=28&paired=1&paused=1&clock=0&ground=on&variant=B&season=autumn&weather=sunny",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            page.wait_for_function(
                "window.HomeCastTrial?.ready && HomeDragTrial.opening()", timeout=95000
            )
            page.evaluate("HomeCastTrial.apply({paused:false})")
            page.wait_for_function(
                "document.querySelector('[data-diorama-walking=true]')", timeout=150000
            )
            for attempt in range(30):
                state = page.evaluate(EXAMINE)
                if state:
                    break
                page.wait_for_timeout(240)
            if not state:
                raise RuntimeError("No real gait animation at " + str(width))
            state["width"] = width
            state["height"] = 792
            data.append(state)
            print(width, state["key"], flush=True)
            page.close()
        b.close()
    args.out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--out", type=Path, required=True)
    main(p.parse_args())
