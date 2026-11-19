"""Sample moving residents without pausing them. Reconstruct source-alpha overlaps offline."""
import argparse
import json
import os
import time
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote, urlencode, urlparse

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright


SNAPSHOT = """() => {
  const heroStage = document.getElementById('castStage');
  const actors = [...heroStage.querySelectorAll('[data-diorama-actor]')].flatMap(owner => {
    const img = owner.querySelector('img.character-asset');
    if (!img?.naturalWidth) return [];
    const r = img.getBoundingClientRect();
    let flip = false;
    for (let n = img; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (parseFloat(s.scale) < 0) flip = !flip;
      if (s.transform !== 'none' && new DOMMatrix(s.transform).a < 0) flip = !flip;
    }
    return [{id:owner.dataset.dioramaActor, src:img.currentSrc, flip,
      rect:[r.x,r.y,r.width,r.height]}];
  });
  const pose = HomeCastTrial.inspect().map(a => [a.key,a.x,a.y]);
  return {actors, pose, cast: JSON.parse(heroStage.dataset.livingMetrics || '{}').cast || {},
    ambientEvents: {...window.walkSpacingEvents}};
}"""


def measure(sample, game):
    masks = []
    @lru_cache(maxsize=48)
    def alpha(path):
        with Image.open(path) as img:
            return img.convert("RGBA").getchannel("A")

    for actor in sample["actors"]:
        path = unquote(urlparse(actor["src"]).path).split("/game/", 1)[1]
        source = alpha(game / path)
        x, y, width, height = actor["rect"]
        rect = (round(x), round(y), round(x+width), round(y+height))
        im = source.resize((max(1,rect[2]-rect[0]),max(1,rect[3]-rect[1])), Image.Resampling.BILINEAR)
        if actor["flip"]:
            im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        masks.append((rect, np.asarray(im) >= 96))

    pairs = 0
    for i, (a, ma) in enumerate(masks):
        for b, mb in masks[:i]:
            x,y,r,d=max(a[0],b[0]),max(a[1],b[1]),min(a[2],b[2]),min(a[3],b[3])
            if r<=x or d<=y: continue
            part_a = ma[y-a[1]:d-a[1],x-a[0]:r-a[0]]
            part_b = mb[y-b[1]:d-b[1],x-b[0]:r-b[0]]
            pairs += int(np.count_nonzero(part_a & part_b) >= 4)
    return pairs


def run(args):
    params = dict(region="forest", count=28, time="day")
    if args.mode == "adopted-v1":
        params.update(hero=120,partner=120,companions=105)
    else:
        params["mode"] = args.mode
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH","/usr/bin/chromium"),args=["--no-sandbox"])
        page = browser.new_page(viewport={"width":320,"height":568},is_mobile=True,has_touch=True,device_scale_factor=2)
        page.goto(args.url.rstrip("/")+"/?"+urlencode(params),wait_until="domcontentloaded")
        page.wait_for_function("document.body.dataset.ready === 'true'",timeout=120000)
        frame = page.locator("#home").element_handle().content_frame()
        frame.wait_for_function("HomeCastTrial.inspect().length===28 && !HomeCastTrial.settings.paused",timeout=45000)
        frame.evaluate("""() => {
          window.walkSpacingEvents = {};
          document.getElementById('castStage').addEventListener('naotocchi:home-reaction', ({detail}) => {
            if (detail.source === 'ambient') walkSpacingEvents[detail.type]=(walkSpacingEvents[detail.type]||0)+1;
          });
        }""")
        version = browser.version
        samples = []
        start = time.monotonic()
        for seconds in [0,15,30,45,60,75,90]:
            time.sleep(max(0, start+seconds-time.monotonic()))
            sample = frame.evaluate(SNAPSHOT)
            sample["seconds"] = round(time.monotonic()-start,2)
            assert len(sample["actors"]) == len(sample["pose"]) == 28
            samples.append(sample)
        browser.close()

    first = {key:(x,y) for key,x,y in samples[0]["pose"]}
    rows = []
    for s in samples:
        moved = sum((x-first[key][0])**2+(y-first[key][1])**2>1 for key,x,y in s["pose"])
        rows.append({"elapsedSeconds":s["seconds"],"projectedAlphaPairs":measure(s,args.game),
            "residentsMovedSinceFirstSample":moved,"modelSeconds":s["cast"].get("clock"),
            "recentModelMoves":s["cast"].get("moves"),"observedAmbientEvents":s["ambientEvents"]})
    result = dict(browser=version, region="forest", width=320, height=568, count=28, mode=args.mode,
        measure="Projected source alpha >=96/255, intersection >=4 CSS pixels. Nearest whole-pixel boxes. Before terrain masking, clipping, and equipment.",samples=rows)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(args.mode,[(x["projectedAlphaPairs"],x["residentsMovedSinceFirstSample"]) for x in rows])

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url",required=True)
    parser.add_argument("--game",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    parser.add_argument("--mode",required=True,choices=["adopted-v1","final"])
    run(parser.parse_args())
