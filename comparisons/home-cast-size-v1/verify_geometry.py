"""Measure real rasterized silhouettes and their intersections at frozen, matched poses."""
import argparse
import io
import json
import math
import copy
import os
from pathlib import Path
from statistics import median
from urllib.parse import urlencode

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

PROBE = Path(__file__).with_name("verify_geometry_probe.js").read_text()
PRESETS = ("current", "A", "B")
REGIONS = ("river_lake", "forest", "city", "home")
HEIGHTS = {320: 568, 375: 812, 390: 844, 430: 932}


def groups(actors):
    # Separate intersecting DOM sprite boxes. Each group can be rasterized once
    # with the real transforms and terrain masks, then partitioned losslessly.
    result = []
    def disjoint(a, b):
        x, y, r, d = a["frame"]
        l, t, u, v = b["frame"]
        return r+2 < l or u+2 < x or d+2 < t or v+2 < y
    for actor in actors:
        for group in result:
            if all(disjoint(actor, other) for other in group):
                group.append(actor)
                break
        else:
            result.append([actor])
    return result


def measure(page, frame, iframe, actors, anchors):
    masks = {}
    heights = {}
    clipped = []
    missing = []
    pairs = []
    for group in groups(actors):
        frame.evaluate("ids=>qaGeometrySilhouette(ids)", [a["id"] for a in group])
        raw = np.asarray(Image.open(io.BytesIO(iframe.screenshot(scale="css"))).convert("RGB"))
        mask = raw[:,:,1] >= 96
        for a in group:
            x, y, r, b = a["frame"]
            t = max(0, math.floor(y)); l = max(0, math.floor(x))
            h = min(mask.shape[0], math.ceil(b)); w = min(mask.shape[1], math.ceil(r))
            body = np.zeros_like(mask)
            body[t:h,l:w] = mask[t:h,l:w]
            masks[a["id"]] = body
            ys, xs = np.nonzero(body)
            heights[a["id"]] = int(ys.max()-ys.min()+1) if ys.size else 0
            if not ys.size:
                missing.append(a["id"])
            # Natural source alpha projected by actual DOM frame, compared with
            # the clipping viewport. A one-CSS-pixel tolerance absorbs resampling.
            sx, sy, sr, sb = anchors["screen"]
            x, y, r, b = a["uncut"]
            if x < max(0,sx)-1 or y < max(0,sy)-1 or r>min(mask.shape[1],sr)+1 or b>min(mask.shape[0],sb)+1:
                clipped.append(a["id"])
    frame.evaluate("qaGeometrySilhouette(null)")
    occlusion = np.zeros_like(next(iter(masks.values())),dtype=np.uint8)
    for key, body in masks.items():
        for other in masks:
            if key >= other: continue
            count = int(np.count_nonzero(body & masks[other]))
            if count >= 4:
                pairs.append([key, other, count])
        occlusion += body
    summed = int(occlusion.sum())
    lost = summed-int(np.count_nonzero(occlusion))
    companions=[h for k,h in heights.items() if k.startswith("companion:")]
    subject=lambda kind: next(v for k,v in heights.items() if k.startswith(kind+":"))
    return {"hero":subject("pet"),"partner":subject("partner"),"companions":[min(companions),median(companions),max(companions)],
        "intersectingPairs":len(pairs),"sharedInkPct":round(100*lost/summed,2) if summed else None,
        "outsideClip":clipped,"zeroInk":missing,"heights":heights,
        "threeLargestIntersections":sorted(pairs,key=lambda p:p[2],reverse=True)[:3]}


def fixed_signature(frame):
    return frame.evaluate("""()=>{const rows=HomeCastTrial.inspect();return rows.map(a=>[a.key,...[a.x,a.y,a.w,a.h].map(n=>Math.round(n*1e7)/1e7),a.direction]).sort()}""")


def run(pw, args):
    launch = {"executable_path":os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"),"args":["--no-sandbox"]} if args.engine=="chromium" else {}
    browser = getattr(pw,args.engine).launch(**launch)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    report=json.loads(args.out.read_text()) if args.resume and args.out.exists() else {"browser":args.engine,"version":browser.version,"widths":{}}
    for width in args.widths:
        scenes=report["widths"].setdefault(str(width),{})
        for region in args.regions:
            if args.resume and scenes.get(region,{}).get("matchedCoordinates")==28: continue
            url=args.url.rstrip("/")+"/?"+urlencode(dict(region=region,time="day",count=28,castPreset="current",paused=1))
            page=browser.new_page(viewport={"width":width,"height":HEIGHTS[width]},has_touch=True,is_mobile=True,device_scale_factor=2)
            try:
                page.goto(url,wait_until="domcontentloaded",timeout=90000)
                iframe=page.locator("#home")
                frame=iframe.element_handle().content_frame()
                frame.wait_for_function("window.HomeCastTrial?.inspect?.().length===28 && document.querySelectorAll('#castStage [data-diorama-actor] img.character-asset').length===28",timeout=90000)
                frame.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(im=>im.decode().catch(()=>{})))")
                paint_ready="HomeBeauty.paintRect?.width>0 && document.querySelector('.home-art-canvas')?.width>0"
                frame.wait_for_function("window.HomeCastTrial?.ready && parent.document.body.dataset.ready==='true'",timeout=120000)
                # The official stage briefly has 28 fallback seats before the painted
                # terrain and portrait camera publish their first complete snapshot.
                frame.wait_for_function("region=>{const s=document.querySelector('#castStage');const w=JSON.parse(s.dataset.livingMetrics||'{}').world;return window.NaotocchiHomeViewport?.residentPresentation?.() && w?.loaded && w.region===region}",arg=region,timeout=100000)
                frame.wait_for_function(paint_ready,timeout=30000)
                stable=0
                before=None
                for sample in range(32):
                    page.wait_for_timeout(250)
                    positions=fixed_signature(frame)
                    stable=stable+1 if before==positions else 0
                    before=positions
                    if stable>=4: break
                assert stable>=4,(width,region,"initial seat has not settled")
                frame.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
                frame.evaluate(PROBE)
                frame.evaluate("""()=>{window.qaOriginalRows=[...document.querySelectorAll('#castStage [data-diorama-actor]')];return true}""")
                initial=fixed_signature(frame)
                data=scenes[region]={"presets":{},"loadedOfficialProjection":True,"finalTrialReady":True}
                prior_shadows=None
                modes=(*PRESETS,"pair") if (width==390 or args.pair) and region in ("forest","river_lake") else PRESETS
                neutral=None
                for mode in modes:
                    if mode=="pair":
                        page.locator("#settings-toggle").click()
                        for role,value in [("hero",120),("partner",120),("companions",105)]:
                            page.locator("#"+role).evaluate("(n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}))}",str(value))
                        page.locator("#settings-close").click()
                    else:
                        page.locator('button[data-preset="'+mode+'"]').click()
                    page.wait_for_timeout(100)
                    assert frame.evaluate("""()=>qaOriginalRows.every(n=>n.isConnected)""")
                    signature=fixed_signature(frame)
                    assert signature==initial,(region,width,mode,"model coordinates",[(a,b) for a,b in zip(initial,signature) if a!=b][:2])
                    frame.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
                    actors=frame.evaluate("qaGeometryActors()")
                    anchors=frame.evaluate("qaGeometryAnchors()")
                    if args.images and ((width==390 and region in args.regions) or (width==320 and region=="home")):
                        args.images.mkdir(parents=True,exist_ok=True)
                        page.screenshot(path=str(args.images/(f"{args.engine}-{width}-{region}-{mode}.png")),scale="css")
                    summary=measure(page,frame,iframe,actors,anchors)
                    shadow_points=[[s["left"],s["top"]] for s in anchors["shadows"]]
                    if prior_shadows is None: prior_shadows=shadow_points
                    assert shadow_points==prior_shadows, (width,region,mode,"shadow anchors")
                    summary["equipment"]=[{"name":n["name"],"box":[round(v,2) for v in n["box"]]} for n in anchors["equipment"]]
                    summary["companionTallerThanPartner"]=sum(h>summary["partner"] for k,h in summary["heights"].items() if k.startswith("companion:"))
                    poses=frame.evaluate("HomeCastTrial.inspect().map(a=>({key:a.key,foot:a.foot,depth:a.depth}))")
                    data["pairFootCss"]={a["key"]:{k:round(v,2) for k,v in a["foot"].items()} for a in poses if not a["key"].startswith("companion:")}
                    data["pairDepth"]={a["key"]:round(a["depth"],3) for a in poses if not a["key"].startswith("companion:")}
                    if neutral is None:
                        neutral=(copy.deepcopy(anchors["equipment"]),{a["key"].split(":")[0]:a["foot"] for a in poses})
                    ratios={"current":(1,1),"A":(1.20,1.10),"B":(1.25,1.15),"pair":(1.20,1.20)}[mode]
                    deviations=[]
                    for base,candidate in zip(neutral[0],anchors["equipment"]):
                        is_pet=base["name"]=="petAccessory"
                        foot=neutral[1]["pet" if is_pet else "partner"]
                        ratio=ratios[0 if is_pet else 1]
                        for j,(a,b) in enumerate(zip(base["box"],candidate["box"])):
                            center=foot["x" if j%2==0 else "y"]
                            deviations.append(abs((b-center)-(a-center)*ratio))
                    summary["attachmentScaleErrorMaxCssPx"]=round(max(deviations,default=0),2)
                    summary["contacts"]=len(anchors["contacts"])
                    data["presets"][mode]=summary
                    print(width,region,mode,summary["hero"],summary["partner"],summary["companions"],summary["intersectingPairs"],summary["sharedInkPct"],summary["outsideClip"],flush=True)
                data.update(matchedCoordinates=len(initial),shadowAnchors=len(prior_shadows),iframe=[round(n) for n in (iframe.bounding_box()["width"],iframe.bounding_box()["height"])])
                args.out.write_text(json.dumps(report,ensure_ascii=False,indent=1)+"\n")
            finally:
                page.close()
    browser.close()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--images",type=Path)
    parser.add_argument("--resume",action="store_true")
    parser.add_argument("--pair",action="store_true",help="also try the 120/120/105 balance on compact screens")
    parser.add_argument("--widths",type=int,nargs="+",default=[390,320,375,430])
    parser.add_argument("--regions",choices=REGIONS,nargs="+",default=list(REGIONS))
    parser.add_argument("--engine",choices=["chromium","webkit"],default="chromium")
    with sync_playwright() as pw:
        run(pw,parser.parse_args())
