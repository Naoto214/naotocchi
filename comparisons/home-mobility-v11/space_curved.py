"""Measure one- and two-helper moves with up to two straight legs per helper at the 320 px forest opening."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url


def main(args):
    frame = json.loads((args.captures / f"{args.width}-v10-reference.json").read_text())
    opening = frame["phases"][0]
    extra = (HERE / "space_curved.js").read_text()
    probe = (HERE / "space-probe.js").read_text()
    probe = probe.replace("return {geometry,rays,passing};", extra)
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            page = browser.new_page(
                viewport={"width": args.width, "height": 792},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )

            def hook(route):
                response = route.fetch()
                src = response.text()
                source_hash = hashlib.sha256(src.encode()).hexdigest()
                assert source_hash in frame["modelSHA"]
                anchor = "      if(arrange){clearRelief();"
                assert src.count(anchor) == 1
                route.fulfill(
                    response=response,
                    body=src.replace(
                        anchor,
                        "      if(scene.navigation?.intentScale){"
                        + probe
                        + "}\n"
                        + anchor,
                    ),
                )

            page.route("**/home-production-model-mobility-*.js*", hook)
            page.goto(
                forest_url(f"http://127.0.0.1:{server.server_port}", "v10-reference"),
                wait_until="domcontentloaded",
            )
            page.wait_for_function(
                "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                timeout=120000,
            )
            for key in args.keys:
                case = page.evaluate(
                    "p=>forestSpaceSurvey.openCurved(p)",
                    {
                        "feet": opening["feet"],
                        "key": key,
                        "angles": args.angles,
                        "focus": args.width == 320,
                    },
                )
                basis = next(a for a in opening["rays"] if a["key"] == key)["result"][1]
                assert case["stats"]["ownerBearings"] == basis["legal"]
                assert (
                    case["stats"]["bearingsAlreadyBlockedBy3Plus"] == basis["counts"][3]
                )
                results.append(
                    {
                        "source": frame["sourceSHA"],
                        "model": frame["modelSHA"],
                        "width": args.width,
                        "height": 792,
                        "scene": "forest",
                        "seats": "v10-reference",
                        "label": "opening",
                        "clock": 0,
                        **case,
                    }
                )
                results[-1]["nativeStepper"] = page.evaluate(
                    "p=>forestSpaceSurvey.replayCurved(p)",
                    {"feet": opening["feet"], "witnesses": case["witnesses"]},
                )
                args.out.write_text(json.dumps(results, separators=(",", ":")) + "\n")
                print(
                    key, case["stats"], "witnesses", len(case["witnesses"]), flush=True
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--angles", type=int, default=96)
    p.add_argument("--width", type=int, choices=(320, 375), default=320)
    p.add_argument("--keys", nargs="+", default=["companion:tanuki", "companion:box"])
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
