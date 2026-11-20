"""Replay optional V6 opening-seat scores in the actual Chromium game.

Serve a comparison build containing game/finish.html. From this directory:
  python seating-ablation.py --base http://127.0.0.1:8315
With --write, replace evidence/forest-seating.json. A plain run checks it.
Requires Node, patch, Chromium, and the Python playwright package.
"""
import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path
from urllib.parse import urlencode

HERE = Path(__file__).resolve().parent
FIXTURE = json.loads((HERE / "geometry-fixture.json").read_text())
PROFILES = ["original", "conservative", "network035", "network065", "individual035", "local"]
QUERY = dict(region="forest", count=28, time="day", paused=1, ground="on",
             policy="B", variant="B", layout="optimized", curve="linear", compareSplit=0)

# Each request starts from the exact native opening. Preserve its real manual
# retries and neighbor yields, then let the model finish for 12.25 seconds.
DRAG = """
window.seatProbe=(plans)=>{
  const original=structuredClone(actors),t0=clock,s0=selected,rows=[];
  for(const {key,p} of plans){
    actors=structuredClone(original);clock=t0;selected=s0;
    manualGoals.clear();cooldown.clear();retryingKey=null;
    select(key);
    const a=actor(key),ok=move(key,p,'drag',{pointerDrop:true});
    for(let i=0;i<245;i++)step(.05,{autonomy:false});
    rows.push({key,p,ok,end:[a.x,a.y],finished:!a.target});
  }
  actors=original;clock=t0;selected=s0;manualGoals.clear();cooldown.clear();retryingKey=null;
  return rows;
};
"""
DRAG_READ = """()=>{
  const cast=HomeCastTrial.inspect(),scale=NaotocchiHomeViewport.residentPresentation();
  const plans=cast.map(a=>({key:a.key,p:{x:a.x+(a.foot.x<=innerWidth/2?12:-12)/scale.scaleX,y:a.y}}));
  return {scale:[scale.scaleX,scale.scaleY],cast:cast.map(a=>[a.key,a.x,a.y]),data:seatProbe(plans)};
}"""

# Sample only native move and integration points. This has its own unopened page.
AMBIENT = """
let seatAging=null;
window.seatProbe=()=>{
  seatAging=Object.fromEntries(actors.map(a=>[a.key,{attempt:0,accepted:0,arrive:0,block:0,walk:0}]));
  const start=actors.map(a=>[a.key,a.x,a.y]),r0=random;let state=214;
  random=()=>((state=Math.imul(state,16807)>>>0)/4294967296);
  for(let i=0;i<6000;i++)step(.05,{autonomy:true});
  const out={rows:seatAging,start,final:actors.map(a=>[a.key,a.x,a.y])};
  seatAging=null;random=r0;return out;
};
"""
AGE_HOOKS = {
    "const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;":
        " if(seatAging&&source==='ambient')seatAging[key].attempt++;",
    "      a.pointerDrop=pointerDrop;":
        "if(seatAging&&source==='ambient')seatAging[key].accepted++;",
    "        if(!safe){a.target": None,
    "        stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);": None,
    "          emit('arrive',a,a.source);": "if(seatAging)seatAging[a.key].arrive++;",
}


def replace_once(src, key, value):
    if src.count(key) != 1:
        raise ValueError(f"Expected one native source anchor {key!r}")
    return src.replace(key, value)


def instrument(src, ambient):
    if ambient:
        for key, suffix in AGE_HOOKS.items():
            if suffix:
                replacement = key + suffix
            elif "if(!safe)" in key:
                replacement = key.replace("a.target", "if(seatAging)seatAging[a.key].block++;a.target")
            else:
                replacement = "if(seatAging)seatAging[a.key].walk+=Math.hypot(p.x-a.x,p.y-a.y);" + key
            src = replace_once(src, key, replacement)
    anchor = "    return {metrics:"
    return replace_once(src, anchor, (AMBIENT if ambient else DRAG) + anchor)


def candidate(label):
    return subprocess.check_output(["node", str(HERE / "seating-ablation.cjs"), label])


def run_page(browser, url, src, ambient):
    context = browser.new_context(viewport={"width": 390, "height": 792},
                                  device_scale_factor=2, is_mobile=True, has_touch=True)
    try:
        page = context.new_page()
        page.route("**/home-production-model-finish.js*",
                   lambda route: route.fulfill(content_type="application/javascript", body=instrument(src, ambient)))
        page.goto(url, wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function("window.HomeCastTrial?.ready && window.seatProbe && HomeCastTrial.inspect().length===28",
                               timeout=120000)
        return page.evaluate("seatProbe()" if ambient else DRAG_READ)
    finally:
        context.close()


def model_drops(raw):
    sx, sy = raw["scale"]
    cast = {key: [x, y] for key, x, y in raw["cast"]}
    sizes = {a["key"]: (a["w"], a["h"]) for a in FIXTURE["residents"]}
    assert list(cast) == list(sizes)
    contact = []
    for i, (key, (x, y)) in enumerate(cast.items()):
        for peer, (xx, yy) in list(cast.items())[i+1:]:
            rx = (sizes[key][0] + sizes[peer][0]) * .5 + 10
            ry = (sizes[key][1] + sizes[peer][1]) * .38 + 10
            contact.append(max(0, 1 - math.hypot((x-xx)/rx, (y-yy)/ry)))
    rows = []
    for r in raw["data"]:
        key = r["key"]
        x, y = cast[key]
        ex, ey = r["end"]
        p = r["p"]
        walked = math.hypot((ex-x)*sx, (ey-y)*sy)
        miss = math.hypot((ex-p["x"])*sx, (ey-p["y"])*sy)
        rows.append(dict(key=key, seatNative=cast[key], issued=bool(r["ok"]),
                         completedWithTravel=bool(walked >= 2 and r["finished"]),
                         travelCss=round(walked, 2), errorCss=round(miss, 2), within4=miss<=4))
    return dict(rows=rows, completed=sum(r["completedWithTravel"] for r in rows),
                within4=sum(r["within4"] for r in rows), contacts=sum(d>0 for d in contact),
                squaredOverlap=round(sum(d*d for d in contact), 6))


def model_aging(raw, label):
    if label == "original":
        for (key, x, y, *_), archived in zip(raw["final"], FIXTURE["residents"]):
            assert key == archived["key"] and math.dist([x, y], archived["agedFoot"]) < 1e-7, key
    rows = raw["rows"]
    return dict(moved=sum(r["walk"] > 0 for r in rows.values()),
                over8Native=sum(r["walk"] > 8 for r in rows.values()),
                over16Native=sum(r["walk"] > 16 for r in rows.values()),
                walkNative=round(sum(r["walk"] for r in rows.values()), 2),
                attempts=sum(r["attempt"] for r in rows.values()),
                accepted=sum(r["accepted"] for r in rows.values()),
                arrivals=sum(r["arrive"] for r in rows.values()),
                blockedSteps=sum(r["block"] for r in rows.values()),
                perResident={k:round(v["walk"], 2) for k,v in rows.items()})


def report(drops, ages):
    baseline = drops["original"]["rows"]
    assert len(baseline) == 28 and all(math.dist(row["seatNative"], [a["x"], a["y"]]) < 1e-7
                                      for row,a in zip(baseline, FIXTURE["residents"]))
    sx, sy = FIXTURE["stageToCss"]["scaleX"], FIXTURE["stageToCss"]["scaleY"]
    for label, data in drops.items():
        changed, gains, losses = {}, [], []
        for orig, variant in zip(baseline, data["rows"]):
            assert orig["key"] == variant["key"]
            dx, dy = [b-a for a,b in zip(orig["seatNative"], variant["seatNative"])]
            if math.hypot(dx,dy) > .0001:
                changed[orig["key"]] = round(math.hypot(dx*sx,dy*sy), 2)
            if variant["completedWithTravel"] != orig["completedWithTravel"]:
                (gains if variant["completedWithTravel"] else losses).append(orig["key"])
        data.update(changedSeatCss=changed, gained=gains, lost=losses)
        data["candidateSha256"] = hashlib.sha256(candidate(label)).hexdigest()
    return dict(fixture="geometry-fixture.json", shell="game/finish.html", query=QUERY,
                release="V6 native resident model; startup scoring only", profiles=PROFILES,
                input="Direct native pointerDrop command toward the center by 12 CSS px, 245 steps of .05 s, autonomy off; each resident starts from the same opening. Completed requires at least 2 CSS px of actual displacement and no remaining walking target. This is a model-command ablation. See the archived V6 input trial for trusted touch results.",
                simulation="Fresh page for each arm, 300 native model seconds at 20 steps/s; random seed 214, multiplier 16807, uint32; observed actual cumulative foot distance.",
                result="Retain the canonical V6 seats. Relaxed scoring trades previous successes or contact severity; local-only scoring changes one initial seat without improving completed movement in these runs.",
                drops=drops, autonomous=ages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True, help="Origin serving game/finish.html and its game assets")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright
    url = args.base.rstrip("/") + "/game/finish.html?" + urlencode(QUERY)
    drops, ages = {}, {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium)
        try:
            for label in PROFILES:
                src = candidate(label).decode()
                drops[label] = model_drops(run_page(browser, url, src, False))
                if label in ("original", "local"):
                    ages[label] = model_aging(run_page(browser, url, src, True), label)
        finally:
            browser.close()
    output = report(drops, ages)
    dest = HERE / "evidence" / "forest-seating.json"
    if args.write:
        dest.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    else:
        assert output == json.loads(dest.read_text()), "Seating replay differs from the checked-in evidence"
    print({label: (r["completed"], r["within4"]) for label,r in drops.items()})


if __name__ == "__main__":
    main()
