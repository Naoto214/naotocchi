"""Rank 320px two-seat proposals on frozen native geometry; recheck the survivors on finer bearings."""

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
    code = (
        (HERE / "space-probe.js")
        .read_text()
        .replace(
            "return {geometry,rays,passing};",
            (HERE / "seats_pair_probe.js").read_text(),
        )
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    stages = {}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            d = json.loads(
                (args.captures / f"{args.width}-{args.arm}.json").read_text()
            )
            feet = d["phases"][0]["feet"]
            page = browser.new_page(
                viewport={"width": args.width, "height": 792},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )

            def intercept(route):
                res = route.fetch()
                src = res.text()
                anchor = "      if(arrange){clearRelief();"
                assert (
                    src.count(anchor) == 1
                    and hashlib.sha256(src.encode()).hexdigest() in d["modelSHA"]
                )
                route.fulfill(
                    response=res,
                    body=src.replace(
                        anchor,
                        "      if(scene.navigation?.intentScale){"
                        + code
                        + "}\n"
                        + anchor,
                    ),
                )

            page.route("**/home-production-model-mobility-*.js*", intercept)
            page.goto(
                forest_url(f"http://127.0.0.1:{server.server_port}", args.arm),
                wait_until="domcontentloaded",
            )
            page.wait_for_function(
                "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                timeout=120000,
            )
            restricted = None
            for cutoff, distances in (
                (96, [3, 8, 16]),
                (384, list(range(1, 25))),
                (1440, list(range(1, 25))),
            ):
                if restricted == []:
                    break
                result = page.evaluate(
                    "p=>forestSpaceSurvey.pairSurvey(p)",
                    dict(
                        feet=feet,
                        angles=cutoff,
                        ranges=distances,
                        lengths=args.offsets,
                        headings=args.headings,
                        restricted=restricted,
                    ),
                )
                stages[cutoff] = result
                restricted = result["candidates"]
                print(
                    args.width,
                    args.arm,
                    cutoff,
                    result["counts"],
                    len(restricted),
                    flush=True,
                )
                args.out.write_text(
                    json.dumps(
                        {
                            "width": args.width,
                            "arm": args.arm,
                            "source": d["sourceSHA"],
                            "offsets": args.offsets,
                            "candidateHeadings": args.headings,
                            "stages": stages,
                        },
                        separators=(",", ":"),
                    )
                    + "\n"
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--arm", default="v10")
    p.add_argument("--width", type=int, default=320)
    p.add_argument("--offsets", type=float, nargs="+", default=[0.5, 1, 2, 4, 6, 8, 12])
    p.add_argument("--headings", type=int, default=32)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
