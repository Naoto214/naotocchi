"""Verify forest mask discretization and ask the unmodified navigation to join its sampled islands."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path

import numpy as np
from scipy import ndimage as nd
from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url
from space_metrics import binary_mask, CROSS

VERIFY = """
const gridLink=({from,to,box})=>{
  const route=nav.reachable(from,to,box,()=>true);
  const distance=p=>Math.hypot((p.x-to.x)*scale.x,(p.y-to.y)*scale.y);
  return {from,to,end:route.at(-1)??null,via:route.length,
    missCss:distance(route.at(-1)??from),straight:nav.segmentSafe(from,to),
    safeRoute:route.every((p,i)=>nav.segmentSafe(i?route[i-1]:from,p))};
};
const groundGrid=({step})=>{
  const cols=Math.floor(scene.width*scale.x/step),rows=Math.floor(scene.height*scale.y/step);
  const bytes=new Uint8Array(Math.ceil(cols*rows/8));
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const i=y*cols+x;
    if(nav.valid({x:(x+.5)*step/scale.x,y:(y+.5)*step/scale.y})) bytes[i>>3]|=1<<(i&7);
  }
  return {cols,rows,scale,step,terrain:btoa(String.fromCharCode(...bytes)),
    box:{left:0,right:scene.width,top:0,bottom:scene.height}};
};
return {groundGrid,gridLink};
"""


def main(args):
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace("return {geometry,rays,passing};", VERIFY)
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for width in [320, 375, 390, 430]:
                d = json.loads((args.captures / f"{width}-v10.json").read_text())
                page = browser.new_page(
                    viewport={"width": width, "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                )

                def intercept(route):
                    response = route.fetch()
                    src = response.text()
                    mark = "      if(arrange){clearRelief();"
                    assert (
                        src.count(mark) == 1
                        and hashlib.sha256(src.encode()).hexdigest() in d["modelSHA"]
                    )
                    route.fulfill(
                        response=response,
                        body=src.replace(
                            mark,
                            "      if(scene.navigation?.intentScale){"
                            + core
                            + "}\n"
                            + mark,
                        ),
                    )

                page.route("**/home-production-model-mobility-*.js*", intercept)
                page.goto(
                    forest_url(f"http://127.0.0.1:{server.server_port}", "v10"),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                    timeout=120000,
                )
                for step in [0.5, 1, 2, 4]:
                    g = page.evaluate(
                        "p=>forestSpaceSurvey.groundGrid(p)", {"step": step}
                    )
                    mask = binary_mask({"g": g}, "g", g["terrain"])
                    labels, count = nd.label(mask, CROSS)
                    points = []
                    for label in range(1, count + 1):
                        region = labels == label
                        dy, dx = np.unravel_index(
                            np.argmax(
                                nd.distance_transform_edt(np.pad(region, 1))[1:-1, 1:-1]
                            ),
                            region.shape,
                        )
                        points.append(
                            {
                                "area": float(region.sum() * step**2),
                                "point": {
                                    "x": (float(dx) + 0.5) * step / g["scale"]["x"],
                                    "y": (float(dy) + 0.5) * step / g["scale"]["y"],
                                },
                            }
                        )
                    points.sort(key=lambda r: -r["area"])
                    links = []
                    for dst in points[1:]:
                        links.append(
                            page.evaluate(
                                "p=>forestSpaceSurvey.gridLink(p)",
                                {
                                    "from": points[0]["point"],
                                    "to": dst["point"],
                                    "box": g["box"],
                                },
                            )
                        )
                    results.append(
                        {
                            "width": width,
                            "cellCSS": step,
                            "components4": count,
                            "areaPx2": float(mask.sum() * step**2),
                            "mainAndOtherAreas": [v["area"] for v in points],
                            "nativeAttempts": links,
                        }
                    )
                page.close()
            browser.close()
    finally:
        server.shutdown()
    args.out.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", required=True, type=Path)
    p.add_argument("--captures", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
