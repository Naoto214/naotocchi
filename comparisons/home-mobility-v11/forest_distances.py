"""Probe 16 CSS px on real recorded feet, with 3 and 8 px rays as per-resident controls."""

import argparse
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "home-mobility-v10"))
from forest_layout import forest_url
from forest_rays import PROBE


def digest(data):
    return hashlib.sha256(data).hexdigest()


def extended(root, base, run=None):
    groups = defaultdict(list)
    for receipt in root.glob((str(run) if run else "[0-9]*") + "/*/receipt.json"):
        path = receipt.parent
        if (path / "rays-16.json").exists():
            continue
        width, seed, order, layout, repeat, policy = path.name.split("-", 5)
        arm = (
            policy
            if layout == "fixed"
            else ("v9-seats" if policy == "v9" else policy + "-reference")
        )
        groups[int(width), arm].append(path)
    scanner = PROBE.replace("[3,4,5,6,8,12,18,24]", "[3,8,16]")
    assert scanner != PROBE
    with sync_playwright() as api:
        browser = api.chromium.launch(executable_path="/usr/bin/chromium")
        for (width, arm), paths in sorted(groups.items()):
            ctx = browser.new_context(
                viewport={"width": width, "height": 792},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
                timezone_id="Asia/Tokyo",
                locale="ja-JP",
            )
            page = ctx.new_page()
            source = {}

            def hook(route):
                response = route.fetch()
                body = response.text()
                source["model"] = digest(body.encode())
                anchor = "    return {metrics:"
                assert body.count(anchor) == 1
                route.fulfill(
                    response=response, body=body.replace(anchor, scanner + anchor)
                )

            name = "home-production-model-mobility-" + arm + ".js"
            ctx.route("**/" + name + "*", hook)
            page.goto(forest_url(base, arm), wait_until="domcontentloaded")
            page.wait_for_function(
                "HomeCastTrial?.ready&&HomeDragTrial.opening()&&typeof window.forestRays==='function'",
                timeout=120000,
            )
            for path in paths:
                raw = (path / "forest28.json.gz").read_bytes()
                d = json.loads(gzip.decompress(raw))
                assert d["sources"][name]["source"] == source["model"]
                native = json.loads(
                    gzip.decompress((path / "directions.json.gz").read_bytes())
                )
                assert digest(raw) == native["input"]
                reference = {
                    (x["phase"], x["key"]): x["geometry"]["reachable"]
                    for x in native["observations"]
                    if x["phase"] in ("opening", "endpoint")
                }
                sets = [
                    (
                        "opening",
                        [
                            [k, x, y, w, h]
                            for k, _, x, y, w, h in d["opening"]["actors"]
                        ],
                    ),
                    (
                        "endpoint",
                        [
                            [a[n] for n in ("key", "x", "y", "w", "h")]
                            for a in d["baseline"]["residents"]
                        ],
                    ),
                ]
                rows = []
                for phase, feet in sets:
                    cases = [dict(key=a[0], feet=feet) for a in feet]
                    values = page.evaluate("cases=>forestRays(cases)", cases)
                    for case, value in zip(cases, values):
                        key = case["key"]
                        ref = reference[phase, key]
                        current = value["reachable"]
                        rows.append(
                            dict(
                                phase=phase,
                                key=key,
                                matchingControlDirections=all(
                                    ref[r] == current[r] for r in ("3", "8")
                                ),
                                headings3=current["3"],
                                headings8=current["8"],
                                headings16=current["16"],
                            )
                        )
                assert len(rows) == 56
                (path / "rays-16.json").write_text(
                    json.dumps(
                        dict(
                            recordSHA256=digest(raw),
                            scanner=digest(scanner.encode()),
                            model=source["model"],
                            browser=browser.version,
                            originalBrowser=d["browser"],
                            observations=rows,
                        ),
                        separators=(",", ":"),
                    )
                    + "\n"
                )
                print(
                    path.name,
                    sum(x["matchingControlDirections"] for x in rows),
                    "of 56 matched checkpoints",
                    flush=True,
                )
            ctx.close()
        browser.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("raw", type=Path)
    p.add_argument("--url", required=True)
    p.add_argument("--run", type=int, help="check only one CI run")
    a = p.parse_args()
    extended(a.raw, a.url, a.run)
