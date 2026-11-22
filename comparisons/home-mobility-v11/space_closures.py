"""Measure open/closed 8 CSS px corridors at consecutive recorded requests with one walking neighbor."""

import argparse
import functools
import hashlib
import http.server
import json
import math
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url, raw_files

PROBE = """
function changedCorridors({feet,who,to}) {
  const before=roster(feet), mover=before.find(b=>b.key===who);
  const next={...mover,x:to[0],y:to[1]}, changed=[];
  for(const a of before){
    if(a===mover)continue;
    const [rx,ry]=radii(a,mover);
    const near=b=>Math.abs(b.x-a.x)<=rx+8/scale.x && Math.abs(b.y-a.y)<=ry+8/scale.y;
    if(!near(mover)&&!near(next))continue;
    const still=before.filter(b=>b!==a && b!==mover);
    const movedSafe=(peer,p,first)=>{
      const initial=clearance(a,a,peer),start=clearance(a,first,peer);
      return contactSegmentSafe(a,p,peer,rx,ry)&&(initial>=1||start>=1||start>initial+1e-6);
    };
    let oldCount=0,newCount=0,lost=0,gained=0;
    for(let i=0;i<96;i++){
      const t=i*Math.PI/48,dx=8*Math.cos(t)/scale.x,dy=8*Math.sin(t)/scale.y;
      const p={x:a.x+dx,y:a.y+dy},f=Math.min(1,.35/Math.hypot(dx,dy)),first={x:a.x+f*dx,y:a.y+f*dy};
      const ok=decide(a,p,still);
      if(!ok||ok.length)continue;
      const old=movedSafe(mover,p,first),now=movedSafe(next,p,first);
      oldCount+=old;newCount+=now;lost+=old&&!now;gained+=!old&&now;
    }
    if(lost||gained)changed.push({key:a.key,oldCount,newCount,lost,gained});
  }
  return changed;
}
return {changedCorridors};
"""


def intervals(trace):
    rows = []
    motions = trace["log"]["motions"]
    for prev, cur in zip(trace["log"]["requests"], trace["log"]["requests"][1:]):
        a, b = prev["clock"], cur["clock"]
        sx, sy = cur["scale"]
        if b <= a or b - a > 20:
            continue
        new = {p[0]: p for p in cur["peers"]}
        diffs = []
        for own in prev["peers"]:
            end = new[own[0]]
            dx, dy = (end[1] - own[1]) * sx, (end[2] - own[2]) * sy
            if math.hypot(dx, dy) > 1e-6:
                diffs.append((own, end, math.hypot(dx, dy)))
        if len(diffs) != 1:
            continue
        own, end, distance = diffs[0]
        if not 1 <= distance <= 24:
            continue
        # Exclude unobserved coordinate writes: a native leg spans the two request samples.
        eligible = [
            m
            for m in motions
            if m["key"] == own[0]
            and m["startClock"] <= a + 0.04
            and m["lastClock"] >= b - 0.04
            and m["cssDistance"] + 0.04 >= distance
        ]
        if not eligible:
            continue
        rows.append(
            {
                "start": a,
                "end": b,
                "distanceCss": distance,
                "source": eligible[0]["source"],
                "who": own[0],
                "to": end[1:3],
                "feet": [p[:5] for p in prev["peers"]],
            }
        )
    return rows


def main(args):
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace("return {geometry,rays,passing};", PROBE)
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    reports = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for row, d in raw_files(args.recordings):
                width = d["width"]
                arm = d["arm"]
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
                    name = Path(route.request.url.split("?")[0]).name
                    assert (
                        src.count(mark) == 1
                        and hashlib.sha256(src.encode()).hexdigest()
                        == d["sources"][name]["source"]
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
                    forest_url(f"http://127.0.0.1:{server.server_port}", arm),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                    timeout=120000,
                )
                observations = intervals(d)
                result = []
                closures = 0
                openings = 0
                for i in range(0, len(observations), 8):
                    batch = observations[i : i + 8]
                    hits = page.evaluate(
                        "xs=>xs.map(p=>forestSpaceSurvey.changedCorridors(p))", batch
                    )
                    for r, changes in zip(batch, hits, strict=True):
                        closures += any(
                            k["oldCount"] and not k["newCount"] for k in changes
                        )
                        openings += any(
                            not k["oldCount"] and k["newCount"] for k in changes
                        )
                        result.append(
                            {k: v for k, v in r.items() if k != "feet"}
                            | {"changes": changes}
                        )
                reports.append(
                    {
                        "width": width,
                        "arm": arm,
                        "source": row["raw_sha256"],
                        "soleMovingNeighborSamples": len(result),
                        "atLeastOneCompleteClosure": closures,
                        "atLeastOneCompleteOpening": openings,
                        "records": result,
                    }
                )
                args.out.write_text(json.dumps(reports, separators=(",", ":")) + "\n")
                print(width, arm, len(result), closures, openings, flush=True)
                page.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", required=True, type=Path)
    p.add_argument("--recordings", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
