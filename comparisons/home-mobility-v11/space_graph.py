"""Inspect the exact native planner grid and count degree-one points with terrain, ink and peers."""

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
    core = (
        (HERE / "space-probe.js")
        .read_text()
        .replace(
            "return {geometry,rays,passing};", (HERE / "space_graph.js").read_text()
        )
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    out = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for width in (320, 375, 390, 430):
                d = json.loads(
                    (args.captures / f"{width}-v10-reference.json").read_text()
                )
                source_sha = {}
                page = browser.new_page(
                    viewport={"width": width, "height": 792},
                    is_mobile=True,
                    device_scale_factor=2,
                    has_touch=True,
                )

                def hook(route):
                    res = route.fetch()
                    src = res.text()
                    name = Path(route.request.url.split("?")[0]).name
                    source_sha[name] = hashlib.sha256(src.encode()).hexdigest()
                    if name == "home-route-navigation-finish.mjs":
                        old = "return {staticGeometry,reachable:stable?reachable:null,"
                        new = "return {spatialGrid:grid,staticGeometry,reachable:stable?reachable:null,"
                    elif name == "home-visible-ground-navigation-finish.mjs":
                        old = "valid:union.valid,segmentSafe:union.segmentSafe,"
                        new = "spatialGrid:union.spatialGrid,valid:union.valid,segmentSafe:union.segmentSafe,"
                    else:
                        assert source_sha[name] in d["modelSHA"]
                        old = "      if(arrange){clearRelief();"
                        new = (
                            "      if(scene.navigation?.intentScale){"
                            + core
                            + "}\n"
                            + old
                        )
                    assert src.count(old) == 1
                    route.fulfill(response=res, body=src.replace(old, new))

                for pattern in (
                    "**/home-production-model-mobility-*.js*",
                    "**/home-route-navigation-finish.mjs*",
                    "**/home-visible-ground-navigation-finish.mjs*",
                ):
                    page.route(pattern, hook)
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
                assert len(source_sha) == 3
                cases = []
                for frame in [d["phases"][0], d["phases"][-1]]:
                    representative = frame["passing"]["pair"][0]
                    modes = [(representative, True), ("companion:tanuki", True)]
                    if frame["label"] == "opening":
                        modes += [
                            (None, False),
                            (representative, False),
                            ("companion:tanuki", False),
                        ]
                    for step in [4, 8]:
                        for key, include in modes:
                            r = page.evaluate(
                                "p=>forestSpaceSurvey.graphCounts(p)",
                                {
                                    "feet": frame["feet"],
                                    "key": key,
                                    "step": step,
                                    "includePeers": include,
                                },
                            )
                            cases.append({"phase": frame["label"], **r})
                out.append(
                    {
                        "width": width,
                        "source": d["sourceSHA"],
                        "native": source_sha,
                        "cases": cases,
                    }
                )
                args.out.write_text(json.dumps(out, indent=2) + "\n")
                print(width, flush=True)
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
