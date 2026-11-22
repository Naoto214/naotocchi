"""Search one placement on the 320px ground, including available pockets beyond local offsets."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path

import numpy as np
from playwright.sync_api import sync_playwright
from space_capture import HERE, QuietHandler, forest_url
from space_metrics import binary_mask


def main(args):
    d = json.loads((args.captures / "320-v10.json").read_text())
    g = d["geometry"]
    feet = d["phases"][0]["feet"]
    step = g["step"]
    sx, sy = g["scale"]["x"], g["scale"]["y"]
    ys, xs = np.indices((g["rows"], g["cols"]))
    xs = (xs + 0.5) * step / sx
    ys = (ys + 0.5) * step / sy
    candidates = []
    before = 0
    for i, (key, x, y, w, h) in enumerate(feet):
        valid = binary_mask(d, "geometry", g["allowed"][i])
        before += int(valid.sum())
        for peer, bx, by, bw, bh in feet:
            if key == peer:
                continue
            rx = (w + bw) / 2 + 10
            ry = (h + bh) * 0.38 + 10
            old = min(1, np.hypot((x - bx) / rx, (y - by) / ry))
            valid &= ((xs - bx) / rx) ** 2 + ((ys - by) / ry) ** 2 >= max(
                0, old - 1e-9
            ) ** 2
        for iy, ix in zip(*np.nonzero(valid)):
            candidates.append(
                {"key": key, "dx": (xs[iy, ix] - x) * sx, "dy": (ys[iy, ix] - y) * sy}
            )
    print(
        "Raw actor-permitted centres",
        before,
        "contact-screen survivors",
        len(candidates),
        flush=True,
    )
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace(
            "return {geometry,rays,passing};",
            (HERE / "seats_probe.js").read_text() + "\nreturn {screenSeats};",
        )
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {
        "width": 320,
        "gridStepCss": step,
        "openingSHA": d["sourceSHA"],
        "individualAllowedCentres": before,
        "noWorseContactCentres": len(candidates),
        "stages": [],
    }
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            page = browser.new_page(
                viewport={"width": 320, "height": 792},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
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
                        + core
                        + "}\n"
                        + anchor,
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
            for n, ds in (
                (96, [3, 8, 16]),
                (384, list(range(1, 25))),
                (1440, list(range(1, 25))),
            ):
                if not candidates:
                    break
                r = page.evaluate(
                    "p=>forestSpaceSurvey.screenSeats(p)",
                    {
                        "feet": feet,
                        "angles": 0,
                        "radii": [],
                        "stages": [{"sectors": n, "distances": ds}],
                        "restricted": candidates,
                    },
                )
                candidates = r["survivors"]
                r.pop("firstLost")
                report["stages"].append({"sectors": n, "lengths": ds, **r})
                print(n, r["counts"], flush=True)
                args.out.write_text(json.dumps(report, indent=2) + "\n")
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
