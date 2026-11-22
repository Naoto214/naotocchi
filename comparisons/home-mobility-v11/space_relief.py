"""Counterfactually move at most two neighbors in sequence without changing positions in the real trial."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from playwright.sync_api import sync_playwright
from pathlib import Path
from space_capture import HERE, QuietHandler, forest_url


def main(args):
    observer = "space_certificate.js" if args.certificate else "space_relief.js"
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace("return {geometry,rays,passing};", (HERE / observer).read_text())
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
                d = json.loads(
                    (args.captures / f"{width}-v10-reference.json").read_text()
                )
                page = browser.new_page(
                    viewport={"width": width, "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                )

                def intercept(route):
                    res = route.fetch()
                    src = res.text()
                    mark = "      if(arrange){clearRelief();"
                    assert (
                        src.count(mark) == 1
                        and hashlib.sha256(src.encode()).hexdigest() in d["modelSHA"]
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

                page.route("**/home-production-model-mobility-*.js*", intercept)
                page.goto(
                    forest_url(
                        f"http://127.0.0.1:{server.server_port}", "v10-reference"
                    ),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                    timeout=120000,
                )
                for label in ("opening", "300", "aged"):
                    frame = next(f for f in d["phases"] if f["label"] == label)
                    for key in args.keys or (
                        "pet:dog",
                        "companion:tanuki",
                        "companion:panda",
                        "companion:box",
                    ):
                        case = page.evaluate(
                            "p=>forestSpaceSurvey.reliefCertificate(p)"
                            if args.certificate
                            else "p=>forestSpaceSurvey.openWithTwo(p)",
                            {"feet": frame["feet"], "key": key},
                        )
                        basis = next(r for r in frame["rays"] if r["key"] == key)
                        assert sum(case["counts"].values()) == 96 and case["counts"][
                            "independent"
                        ] == len(basis["result"][1]["safe"])
                        if args.certificate:
                            assert (
                                case["counts"]["directThreeOrMore"]
                                == basis["result"][1]["counts"][3]
                            )
                        results.append(
                            dict(
                                width=width,
                                label=label,
                                clock=frame["clock"],
                                source=d["sourceSHA"],
                                **case,
                            )
                        )
                    args.out.write_text(
                        json.dumps(results, separators=(",", ":")) + "\n"
                    )
                    print(width, label, flush=True)
                page.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--widths", type=int, nargs="+", default=[320, 375, 390, 430])
    p.add_argument("--certificate", action="store_true")
    p.add_argument("--keys", nargs="+")
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
