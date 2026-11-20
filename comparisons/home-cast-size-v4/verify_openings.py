"""Compare the installed opening hints against V2 on paired native Chromium timelines."""

import argparse
import json
import math
from pathlib import Path

from playwright.sync_api import sync_playwright

from geometry_collect import capture, get_plans, HEIGHTS


def summary(phase, gain):
    paint = phase["gains"][gain]
    scene = paint["scene"]
    actors = paint["residents"]
    return {
        "pairs": scene[0],
        "sharedInkPct": round(100 * scene[1] / max(1, scene[3]), 3),
        "heroExposedPct": round(100 * actors[0][3] / max(1, actors[0][1]), 2),
        "partnerExposedPct": round(100 * actors[1][3] / max(1, actors[1][1]), 2),
        "hits": sum(a[4] for a in actors),
        "heroHits": actors[0][4],
        "partnerHits": actors[1][4],
        "allMiss": sum(a[4] == 0 for a in actors),
        "clipped": sum(a[5] for a in actors),
        "shadowMiss": scene[4],
    }


def measure_opening(browser, args, width, region, count):
    f = dict(width=width, height=HEIGHTS[width] - 52, region=region, count=count)
    plans = get_plans(args.game, f)
    result = {"fixture": f, "seconds": [0, 8, 30], "policies": {}, "native": {}}
    pairs = [("linear", p) for p in ("A", "B", "C")]
    poses = {}
    for layout in ("fixed", "optimized"):
        name = f"{layout}/linear/B"
        names = [f"{layout}/{c}/{p}" for c, p in pairs]
        observed = capture(browser, args, f, plans[name], pairs, names)
        result["browser"] = observed["browser"]
        phases = observed["phases"]
        result["native"][layout] = {
            "hints": phases[0]["actualInitialPoints"],
            "feet": [a["foot"] for a in phases[0]["actors"]],
            "walkDistance": [round(s["modelStats"]["distance"], 2) for s in phases],
        }
        poses[layout] = [a["native"][:2] for a in phases[0]["actors"]]
        for curve, policy in pairs:
            key = curve + "/" + policy
            gain = phases[0]["settings"][key][0]
            result["policies"].setdefault(policy, {"gain": float(gain)})[layout] = [
                summary(s, gain) for s in phases
            ]
    result["changedActorIndices"] = [
        i
        for i, (a, b) in enumerate(zip(poses["fixed"], poses["optimized"]))
        if math.dist(a, b) > 0.1
    ]
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("url")
    ap.add_argument("game", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("cases", nargs="+", help="WIDTH,REGION,COUNT")
    ap.add_argument("--chromium", default="/usr/bin/chromium")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=args.chromium,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        for case in args.cases:
            w, r, n = case.split(",")
            file = args.out / f"{w}-{r}-{n}.json"
            row = measure_opening(browser, args, int(w), r, int(n))
            file.write_text(
                json.dumps(row, separators=(",", ":"), allow_nan=False) + "\n"
            )
            print(case, row["changedActorIndices"], flush=True)
        browser.close()


if __name__ == "__main__":
    main()
