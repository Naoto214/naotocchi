"""Cross-check pair-search pruning against complete native remeasurement, including known positive proposals."""

import argparse
import functools
import hashlib
import http.server
import json
import math
import random
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url


def main(args):
    pair = (
        (HERE / "seats_pair_probe.js")
        .read_text()
        .replace(
            "return {pairSurvey};",
            "return {pairSurvey,rays,valid:feet=>roster(feet).every(a=>inBox(a,a.box)&&a.ink(a)&&nav.valid(a))};",
        )
    )
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace("return {geometry,rays,passing};", pair)
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    rows = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for width in (320, 375):
                raw = json.loads((args.captures / f"{width}-v10.json").read_text())
                feet = raw["phases"][0]["feet"]
                keys = [f[0] for f in feet]
                scale = raw["geometry"]["scale"]
                rng = random.Random(1011)
                candidates = []
                for i in range(24):
                    pairkeys = rng.sample(keys, 2)
                    moves = []
                    for key in pairkeys:
                        theta = rng.randrange(32) * math.pi / 16
                        r = rng.choice([0.5, 1, 2, 4, 6, 8, 12])
                        moves.append(
                            {
                                "key": key,
                                "dx": r * math.cos(theta),
                                "dy": r * math.sin(theta),
                            }
                        )
                    candidates.append({"moves": moves})
                # A stationary second seat is used only in these correctness controls.
                if width == 375:
                    for key, dx in [
                        ("companion:squirrel", 1),
                        ("companion:squirrel", 2),
                        ("companion:squirrel", 4),
                        ("companion:bat", -4),
                    ]:
                        candidates.append(
                            {
                                "moves": [
                                    {"key": key, "dx": dx, "dy": 0},
                                    {"key": "companion:box", "dx": 0, "dy": 0},
                                ]
                            }
                        )
                candidates.append(
                    {
                        "moves": [
                            {"key": "companion:box", "dx": 0, "dy": 0},
                            {"key": "companion:tanuki", "dx": 0, "dy": 0},
                        ]
                    }
                )
                page = browser.new_page(
                    viewport={"width": width, "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                )

                def hook(route):
                    res = route.fetch()
                    src = res.text()
                    mark = "      if(arrange){clearRelief();"
                    assert (
                        src.count(mark) == 1
                        and hashlib.sha256(src.encode()).hexdigest() in raw["modelSHA"]
                    )
                    route.fulfill(
                        response=res,
                        body=src.replace(
                            mark,
                            "      if(scene.navigation?.intentScale){"
                            + core
                            + "}\n"
                            + mark,
                        ),
                    )

                page.route("**/home-production-model-mobility-*.js*", hook)
                page.goto(
                    forest_url(f"http://127.0.0.1:{server.server_port}", "v10"),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                    timeout=120000,
                )
                base = raw["phases"][0]["rays"]
                reduced = page.evaluate(
                    "p=>forestSpaceSurvey.pairSurvey(p)",
                    {
                        "feet": feet,
                        "angles": 96,
                        "ranges": [3, 8, 16],
                        "lengths": [],
                        "headings": 0,
                        "restricted": candidates,
                    },
                )

                def ident(item):
                    return tuple((m["key"], m["dx"], m["dy"]) for m in item["moves"])

                predicted = {ident(r): r["opened"] for r in reduced["candidates"]}
                positives = 0
                for c in candidates:
                    trial = [list(f) for f in feet]
                    for m in c["moves"]:
                        f = trial[keys.index(m["key"])]
                        f[1] += m["dx"] / scale["x"]
                        f[2] += m["dy"] / scale["y"]
                    valid = page.evaluate("f=>forestSpaceSurvey.valid(f)", trial)
                    opened = []
                    if valid:
                        new = page.evaluate(
                            "p=>forestSpaceSurvey.rays(p)",
                            {"feet": trial, "sectors": 96, "distances": [3, 8, 16]},
                        )
                        for a, b in zip(base, new, strict=True):
                            contacts = dict(a["contacts"])
                            if any(
                                clearance + 1e-9 < contacts.get(peer, 1)
                                for peer, clearance in b["contacts"]
                            ):
                                valid = False
                                break
                            if any(
                                set(x["safe"]) - set(y["safe"])
                                for x, y in zip(a["result"], b["result"], strict=True)
                            ):
                                valid = False
                                break
                            if not a["result"][1]["safe"] and b["result"][1]["safe"]:
                                opened.append(a["key"])
                    expected = opened if valid else []
                    assert predicted.get(ident(c), []) == expected, (
                        c,
                        expected,
                        predicted.get(ident(c)),
                    )
                    positives += bool(expected)
                rows.append(
                    {
                        "width": width,
                        "directlyRechecked": len(candidates),
                        "agreed": len(candidates),
                        "positiveControls": positives,
                    }
                )
                page.close()
            browser.close()
    finally:
        server.shutdown()
    assert rows[1]["positiveControls"] >= 4
    args.out.write_text(json.dumps(rows, indent=2) + "\n")
    print(rows)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", required=True, type=Path)
    p.add_argument("--captures", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
