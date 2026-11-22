"""Recheck all 28 residents' safe directions before and after an observed curved yield."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright
from forest_results import attach_curves, V11, v9

sys.path.insert(0, str(V11.parent / "home-mobility-v10"))
from forest_layout import forest_url
from forest_rays import PROBE


def run(
    raw, base, output, run_id=None, fixed_records=(), directions=48, native_walk=None
):
    cases = []
    paths = list(fixed_records) or sorted(
        raw.glob((str(run_id) if run_id else "[0-9]*") + "/*-v12/forest28.json.gz")
    )
    for path in paths:
        data = json.loads(gzip.decompress(path.read_bytes()))
        receipt = path.parent.name
        if fixed_records:
            model = next(
                k for k in data["sources"] if k.startswith("home-production-model")
            )
            arm = model.removeprefix("home-production-model-mobility-").removesuffix(
                ".js"
            )
            # Fixed-clock tapes save all real requests, actor hops and event feet.
            # Their elapsed time is model time, reported separately from hosted runs.
            data = dict(
                log=data["trajectory"]["log"],
                modelSeconds=data["trajectory"]["state"]["clock"],
                arm=arm,
                width=int(path.name.split("-")[0]),
                seed=data["opening"]["seed"],
                sources={model: {"source": data["sources"][model]}},
            )
            receipt = path.name
        episodes, _ = attach_curves(data)
        for episode in episodes:
            starts = [
                e for e in episode["events"] if e["type"] == "start" and e.get("hops")
            ]
            if not starts:
                continue
            owner_event = next(
                (e for e in episode["events"] if e["type"] == "owner"), None
            )
            # Isolate the physical changes to the helpers. The owner has not yet
            # taken a step in the 'owner' snapshot; autonomous neighbors may have.
            actual = owner_event.get("feet") if owner_event else None
            before = starts[0]["feet"]
            last = {e["helper"]: e["hops"][-1][-2:] for e in starts}
            isolated = [[k, *last.get(k, [x, y]), w, h] for k, x, y, w, h in before]
            poses = {}
            for stage, event in enumerate(starts):
                for hop, movement in enumerate(event["hops"]):
                    x, y = movement[-2:]
                    poses[f"helper-{stage + 1}-step-{hop + 1}"] = [
                        [k, *([x, y] if k == event["helper"] else [a, b]), w, h]
                        for k, a, b, w, h in event["feet"]
                    ]
            if actual and episode["owner_last_foot"]:
                actor = episode["owner"]
                poses["owner-last-step"] = [
                    [k, *(episode["owner_last_foot"] if k == actor else [x, y]), w, h]
                    for k, x, y, w, h in actual
                ]
            concurrent = []
            if episode["owner_last_step_s"] is not None:
                concurrent = sorted(
                    {
                        l["key"]
                        for l in v9.legs(data)
                        if l["key"] not in {episode["owner"], *last}
                        and l["last_step_s"] >= starts[0]["clock"]
                        and l["start_s"] <= episode["owner_last_step_s"]
                    }
                )
            cases.append(
                dict(
                    receipt=receipt,
                    sha=hashlib.sha256(path.read_bytes()).hexdigest(),
                    width=data["width"],
                    arm=data["arm"],
                    owner=episode["owner"],
                    at_s=episode["s"],
                    observedAfter=dict(
                        actor=native_walk[0],
                        throughModelSeconds=data.get("modelSeconds"),
                        legs=[
                            dict(
                                start=l["start_s"],
                                finish=l["finish_s"],
                                source=l["source"],
                                css=l["css_distance"],
                                strictNormal=l["completed_normal"],
                            )
                            for l in v9.legs(data)
                            if l["key"] == native_walk[0]
                            and l["start_s"] >= episode["s"]
                        ],
                    )
                    if native_walk
                    else None,
                    poses=poses,
                    otherActiveLegs=concurrent,
                    before=before,
                    isolated=isolated,
                    actual=actual,
                    helpers=list(last),
                    native_model=data["sources"][
                        "home-production-model-mobility-" + data["arm"] + ".js"
                    ]["source"],
                )
            )
    result = []
    if cases:
        with sync_playwright() as runtime:
            browser = runtime.chromium.launch(executable_path="/usr/bin/chromium")
            for c in cases:
                page = browser.new_page(
                    viewport={"width": c["width"], "height": 792},
                    is_mobile=True,
                    has_touch=True,
                    device_scale_factor=2,
                    timezone_id="Asia/Tokyo",
                    locale="ja-JP",
                )
                model = "home-production-model-mobility-" + c["arm"] + ".js"

                def hook(route):
                    res = route.fetch()
                    source = res.text()
                    assert (
                        hashlib.sha256(source.encode()).hexdigest() == c["native_model"]
                    )
                    anchor = "    return {metrics:"
                    assert source.count(anchor) == 1
                    scanner = PROBE.replace("[3,4,5,6,8,12,18,24]", "[3,8,16]")
                    scanner = (
                        scanner.replace("i<48", f"i<{directions}")
                        .replace("i*Math.PI/24", f"i*2*Math.PI/{directions}")
                        .replace("i*7.5", f"i*360/{directions}")
                    )
                    if native_walk:
                        scanner += (
                            Path(__file__).parent / "curve-probe.js"
                        ).read_text()
                    route.fulfill(
                        response=res, body=source.replace(anchor, scanner + anchor)
                    )

                page.route("**/" + model + "*", hook)
                page.goto(forest_url(base, c["arm"]), wait_until="domcontentloaded")
                page.wait_for_function(
                    "HomeCastTrial?.ready&&HomeDragTrial.opening()&&typeof window.forestRays==='function'",
                    timeout=120000,
                )
                comparisons = {}
                tested_walks = {}
                for label in ["before", "isolated", "actual", *c["poses"]]:
                    feet = c.get(label) or c["poses"].get(label)
                    if not feet:
                        continue
                    rows = page.evaluate(
                        "cases=>forestRays(cases)",
                        [dict(key=a[0], feet=feet) for a in feet],
                    )
                    comparisons[label] = {
                        x["key"]: {"contacts": x["contacts"], "degrees": x["reachable"]}
                        for x in rows
                    }
                if native_walk:
                    key, angle, radius = native_walk
                    for label in ("before", "isolated", "actual"):
                        if c[label]:
                            tested_walks[label] = {}
                            for mode in ("service", "drag"):
                                tested_walks[label][mode] = page.evaluate(
                                    "args=>curveProbe(...args)",
                                    [c[label], key, float(angle), mode, float(radius)],
                                )
                valid = all(len(before) == 28 for before in comparisons.values())
                assert valid

                def counts(left, right):
                    dropped = []
                    lost_all = []
                    gained = []
                    for key, a in comparisons[left].items():
                        first = set(a["degrees"]["8"])
                        last = set(comparisons[right][key]["degrees"]["8"])
                        if first - last:
                            dropped.append(key)
                        if first and not last:
                            lost_all.append(key)
                        if not first and last:
                            gained.append(key)
                    distances = {}
                    for distance in ("3", "8", "16"):
                        lost = []
                        opened = []
                        for key, a in comparisons[left].items():
                            original = a["degrees"][distance]
                            current = comparisons[right][key]["degrees"][distance]
                            if original and not current:
                                lost.append(key)
                            elif current and not original:
                                opened.append(key)
                        distances[distance] = dict(lostLast=lost, openedFirst=opened)
                    return dict(
                        lostSome8pxHeadings=dropped,
                        lostEvery8pxHeading=lost_all,
                        new8pxExit=gained,
                        lastExits=distances,
                    )

                row = {
                    k: v
                    for k, v in c.items()
                    if k not in ("before", "actual", "isolated")
                }
                row.update(
                    shortNativeWalk=tested_walks,
                    footPositions={k: c[k] for k in ("before", "actual", "isolated")},
                    nativeMeasurements=comparisons,
                    perPhysicalStep={
                        label: counts("before", label) for label in c["poses"]
                    },
                    isolatedComparison=counts("before", "isolated"),
                    observedComparison=counts("before", "actual")
                    if "actual" in comparisons
                    else None,
                )
                result.append(row)
                page.close()
            browser.close()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            dict(
                directions=directions,
                availableRecordedCases=len(cases),
                observations=result,
            ),
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n"
    )
    print("Real materialized native curved plans probed:", len(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("url")
    parser.add_argument("output", type=Path)
    parser.add_argument("--run", type=int)
    parser.add_argument("--fixed-records", type=Path, nargs="+", default=[])
    parser.add_argument(
        "--directions", type=int, choices=[48, 96, 192, 360, 384, 768], default=48
    )
    parser.add_argument(
        "--native-walk", nargs=3, metavar=("ACTOR", "DEGREES", "CSS_DISTANCE")
    )
    args = parser.parse_args()
    run(
        args.raw,
        args.url,
        args.output,
        args.run,
        args.fixed_records,
        args.directions,
        args.native_walk,
    )
