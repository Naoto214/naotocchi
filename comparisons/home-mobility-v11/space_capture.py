"""Measure the authored forest in an isolated, paused browser using recorded household coordinates."""

import argparse
import csv
import functools
import gzip
import hashlib
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "home-mobility-v10"))
from forest_layout import forest_url


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, separators=(",", ":")) + "\n")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def raw_files(root):
    cells = HERE.parent / "home-mobility-v10/evidence/forest-all/forest-cells.csv"
    with cells.open() as file:
        records = list(csv.DictReader(file))
    paths = {sha(p.read_bytes()): p for p in root.glob("*/*/forest28.json.gz")}
    result = []
    for width, seed in ((320, 214), (375, 937), (390, 937), (430, 214)):
        for arm in ("v10", "v10-reference"):
            row = next(
                r
                for r in records
                if int(r["width"]) == width
                and int(r["seed"]) == seed
                and r["order"] == "0"
                and r["arm"] == arm
            )
            source = paths[row["raw_sha256"]]
            result.append((row, json.loads(gzip.decompress(source.read_bytes()))))
    return result


def snapshots(trace):
    opening = [[key, x, y, w, h] for key, _, x, y, w, h in trace["opening"]["actors"]]
    sizes = {k: [w, h] for k, _, _, w, h in opening}
    result = [{"label": "opening", "clock": 0, "feet": opening}]
    for marker in range(60, 600, 60):
        frame = min(trace["trajectory"], key=lambda f: abs(f["clock"] - marker))
        feet = [[k, x, y, *sizes[k]] for k, x, y, *_ in frame["actors"]]
        result.append({"label": str(marker), "clock": frame["clock"], "feet": feet})
    result.append(
        {
            "label": "aged",
            "clock": trace["baseline"]["modelSeconds"],
            "feet": [
                [a[k] for k in ("key", "x", "y", "w", "h")]
                for a in trace["baseline"]["residents"]
            ],
        }
    )
    return result


def main(args):
    raw = raw_files(args.recordings)
    args.out.mkdir(parents=True, exist_ok=True)
    probe = (HERE / "space-probe.js").read_text()
    handler = functools.partial(QuietHandler, directory=str(args.dist))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for row, trace in raw:
                width, arm = int(row["width"]), row["arm"]
                dest = args.out / f"{width}-{arm}.json"
                page = browser.new_page(
                    viewport={"width": width, "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                    timezone_id="Asia/Tokyo",
                )
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                verified_model = []

                def intercept(route):
                    response = route.fetch()
                    source = response.text()
                    marker = "      if(arrange){clearRelief();"
                    assert source.count(marker) == 1
                    digest = sha(source.encode())
                    name = Path(route.request.url.split("?")[0]).name
                    assert trace["sources"][name]["source"] == digest
                    verified_model.append(digest)
                    route.fulfill(
                        response=response,
                        body=source.replace(
                            marker,
                            "      if(scene.navigation?.intentScale){"
                            + probe
                            + "}\n"
                            + marker,
                        ),
                    )

                page.route("**/home-production-model-mobility-*.js*", intercept)
                base = f"http://127.0.0.1:{server.server_port}"
                page.goto(
                    forest_url(base, arm), wait_until="domcontentloaded", timeout=120000
                )
                page.wait_for_function(
                    "HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",
                    timeout=120000,
                )
                phases = snapshots(trace)
                data = {
                    "width": width,
                    "seed": trace["seed"],
                    "order": trace["order"],
                    "arm": arm,
                    "sourceSHA": row["raw_sha256"],
                    "probeSHA": sha(probe.encode()),
                    "modelSHA": verified_model,
                    "browser": browser.version,
                    "sectors": args.sectors,
                    "distances": [3, 8, 16],
                    "requests": [
                        {k: r[k] for k in ("key", "accepted", "planned", "source")}
                        for r in trace["log"]["requests"]
                    ],
                    "baseline": {
                        r["key"]: {
                            f: r[f]
                            for f in (
                                "ambientRequests",
                                "ambientPlans",
                                "goalWalks",
                                "longestRejected",
                            )
                        }
                        for r in trace["baseline"]["residents"]
                    },
                }
                for frame in phases:
                    settings = {
                        "feet": frame["feet"],
                        "distances": data["distances"],
                        "sectors": args.sectors,
                    }
                    frame["rays"] = page.evaluate(
                        "params=>forestSpaceSurvey.rays(params)", settings
                    )
                    if frame["label"] in ("opening", "aged"):
                        frame["passing"] = page.evaluate(
                            "params=>forestSpaceSurvey.passing(params)",
                            {"feet": frame["feet"], "step": 8, "laneLength": 24},
                        )
                data["phases"] = phases
                data["geometry"] = page.evaluate(
                    "params=>forestSpaceSurvey.geometry(params)",
                    {"feet": phases[0]["feet"], "step": args.step},
                )
                assert verified_model and not errors
                write_json(dest, data)
                page.close()
                print("Saved", width, arm, flush=True)
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--recordings", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--step", type=float, default=2)
    p.add_argument("--sectors", type=int, default=96)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    main(p.parse_args())
