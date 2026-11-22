"""Screen local single-seat proposals against each other resident's previously safe native bearings."""

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
    probe = (HERE / "space-probe.js").read_text()
    extra = (HERE / "seats_probe.js").read_text()
    anchor = "return {geometry,rays,passing};"
    assert probe.count(anchor) == 1
    probe = probe.replace(
        anchor, extra + "\nreturn {geometry,rays,passing,screenSeats};"
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for width in args.widths:
                d = json.loads((args.captures / f"{width}-v10.json").read_text())
                feet = d["phases"][0]["feet"]
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
                            + probe
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
                stages = [dict(sectors=96, distances=[3, 8, 16])]
                coarse = page.evaluate(
                    "p=>forestSpaceSurvey.screenSeats(p)",
                    dict(
                        feet=feet,
                        stages=stages,
                        radii=[1, 2, 4, 6, 8, 12, 16],
                        angles=32,
                    ),
                )
                print(width, coarse["counts"], flush=True)
                candidates = coarse["survivors"]
                detail = None
                if candidates:
                    stages.append(dict(sectors=1440, distances=list(range(1, 25))))
                    detail = page.evaluate(
                        "p=>forestSpaceSurvey.screenSeats(p)",
                        dict(
                            feet=feet,
                            stages=stages,
                            restricted=candidates,
                            radii=[],
                            angles=32,
                        ),
                    )
                    print(width, detail["counts"], flush=True)
                results.append(
                    {
                        "width": width,
                        "source": d["sourceSHA"],
                        "browser": browser.version,
                        "coarse": coarse,
                        "fine": detail,
                    }
                )
                args.out.write_text(json.dumps(results, indent=2) + "\n")
                page.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", required=True, type=Path)
    p.add_argument("--captures", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--widths", type=int, nargs="+", default=[320, 375, 390, 430])
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
