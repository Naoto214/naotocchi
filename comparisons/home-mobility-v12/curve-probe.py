"""Replay a recorded 28-foot pose in Chromium's private trial."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "home-mobility-v11"))
from space_capture import forest_url


def run(args):
    suffix = "-reference" if args.seats == "reference" else ""
    tape = json.loads((args.scenes / f"{args.width}-v10{suffix}.json").read_text())
    feet = tape["phases"][args.phase]["feet"]
    rows = []
    mode = "native" if args.baseline and args.mode == "isolated" else args.mode
    hook = (HERE / "curve-probe.js").read_text()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
        page = browser.new_page(
            viewport={"width": args.width, "height": 792},
            device_scale_factor=2, is_mobile=True, has_touch=True,
        )

        def instrument(route):
            response = route.fetch()
            source = response.text()
            if not args.baseline:
                patch = "require('./curve.cjs').patchCurve(require('fs').readFileSync(0,'utf8'))"
                if args.deferred:
                    patch = "require('./curve-deferred.cjs').patchDeferred(" + patch + ")"
                source = subprocess.run(
                    ["node", "-e", "process.stdout.write(" + patch + ")"],
                    cwd=HERE, input=source, text=True, capture_output=True, check=True,
                ).stdout
            anchor = "      if(arrange){clearRelief();"
            if source.count(anchor) != 1:
                raise RuntimeError("Native scene hook missing or ambiguous")
            script = source.replace(anchor, "if(scene.navigation?.intentScale){" + hook + "}\n" + anchor)
            route.fulfill(response=response, body=script)

        page.route("**/home-production-model-mobility-*.js*", instrument)
        page.goto(forest_url(args.url, "v11-foot" + suffix), wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function(
            "HomeCastTrial.ready && HomeDragTrial.opening() && typeof window.curveProbe==='function'",
            timeout=120000,
        )
        for key in args.keys or [entry[0] for entry in feet]:
            for angle in args.degrees:
                result = page.evaluate("args=>curveProbe(...args)", [feet, key, angle, mode, args.radius])
                if not result.get("pair", {}).get("curved"):
                    result.pop("history", None)
                print(key, angle, result["found"], result["actual"], flush=True)
                rows.append({"key": key, "degrees": angle, **result})
        args.out.write_text(json.dumps(rows, separators=(",", ":")) + "\n")
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:18539")
    parser.add_argument("--scenes", type=Path, default=Path("/tmp/m12-space"))
    parser.add_argument("--width", type=int, default=375)
    parser.add_argument("--baseline", action="store_true")
    parser.add_argument("--deferred", action="store_true")
    parser.add_argument("--seats", choices=["reference", "original"], default="reference")
    parser.add_argument("--phase", type=int, default=0)
    parser.add_argument("--radius", type=float, default=8)
    parser.add_argument("--degrees", nargs="+", type=float, default=[101.25, 105, 277.5, 285, 288.75, 292.5, 300, 307.5, 315, 330])
    parser.add_argument("--keys", nargs="*", default=["companion:tanuki"])
    parser.add_argument("--mode", choices=["native", "isolated", "service", "drag"], default="native")
    parser.add_argument("--out", type=Path, required=True)
    run(parser.parse_args())
