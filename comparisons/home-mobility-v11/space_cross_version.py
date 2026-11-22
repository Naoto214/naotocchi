"""Replay the same recorded feet on the V11 native renderer/model to test whether its spatial constraints changed."""

import argparse
import functools
import hashlib
import http.server
import json
import math
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url


def main(args):
    source = (HERE / "space-probe.js").read_text()
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for width in (320, 375, 390, 430):
                for seating in ("", "-reference"):
                    raw = json.loads(
                        (args.captures / f"{width}-v10{seating}.json").read_text()
                    )
                    opening = raw["phases"][0]
                    for mode in ("v11-foot", "v11"):
                        arm = mode + seating
                        captured = {}
                        page = browser.new_page(
                            viewport={"width": width, "height": 792},
                            device_scale_factor=2,
                            is_mobile=True,
                            has_touch=True,
                        )

                        def hook(route):
                            res = route.fetch()
                            s = res.text()
                            name = Path(route.request.url.split("?")[0]).name
                            captured[name] = hashlib.sha256(s.encode()).hexdigest()
                            if "model" in name:
                                anchor = "      if(arrange){clearRelief();"
                                assert s.count(anchor) == 1
                                s = s.replace(
                                    anchor,
                                    "      if(scene.navigation?.intentScale){"
                                    + source
                                    + "}\n"
                                    + anchor,
                                )
                            route.fulfill(response=res, body=s)

                        page.route("**/home-production-model-mobility-*.js*", hook)
                        page.route("**/home-production-diorama-mobility-*.js*", hook)
                        page.goto(
                            forest_url(f"http://127.0.0.1:{server.server_port}", arm),
                            wait_until="domcontentloaded",
                        )
                        page.wait_for_function(
                            "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                            timeout=120000,
                        )
                        actual = page.evaluate("HomeDragTrial.opening().actors")
                        observed = {k: (x, y, w, h) for k, _, x, y, w, h in actual}
                        changes = {
                            k: math.hypot(
                                (x - observed[k][0]) * raw["geometry"]["scale"]["x"],
                                (y - observed[k][1]) * raw["geometry"]["scale"]["y"],
                            )
                            for k, x, y, w, h in opening["feet"]
                        }
                        grid = page.evaluate(
                            "p=>forestSpaceSurvey.geometry(p)",
                            {"feet": opening["feet"], "step": 2},
                        )
                        other = raw["geometry"]
                        terrain_match = grid["terrain"] == other["terrain"]
                        body_match = sum(
                            a == b
                            for a, b in zip(
                                grid["allowed"], other["allowed"], strict=True
                            )
                        )
                        comparisons = []
                        for frame in (opening, raw["phases"][-1]):
                            new = page.evaluate(
                                "p=>forestSpaceSurvey.rays(p)",
                                {
                                    "feet": frame["feet"],
                                    "sectors": 96,
                                    "distances": [3, 8, 16],
                                },
                            )
                            ok = sum(
                                old == now
                                for old, now in zip(frame["rays"], new, strict=True)
                            )
                            comparisons.append(
                                {"phase": frame["label"], "equalResidentGeometry": ok}
                            )
                        results.append(
                            {
                                "width": width,
                                "arm": arm,
                                "native": captured,
                                "sourceRaw": raw["sourceSHA"],
                                "matchingOpeningFeet": sum(
                                    shift < 1e-6 for shift in changes.values()
                                ),
                                "largestOpeningDifferenceCss": max(changes.values()),
                                "bodyDimensionsMatch": all(
                                    (w, h) == observed[k][2:]
                                    for k, x, y, w, h in opening["feet"]
                                ),
                                "sameTerrainGrid": terrain_match,
                                "sameResidentPermissionGrids": body_match,
                                "replayedFootStates": comparisons,
                            }
                        )
                        args.out.write_text(json.dumps(results, indent=2) + "\n")
                        print(
                            width,
                            arm,
                            results[-1]["matchingOpeningFeet"],
                            terrain_match,
                            body_match,
                            comparisons,
                            flush=True,
                        )
                        page.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
