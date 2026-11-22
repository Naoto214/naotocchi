"""Summarize controlled V11/V12 native replays; keep raw files independently verifiable."""
import argparse
from collections import Counter
import hashlib
import json
import statistics
from pathlib import Path
import zipfile


def summarize(raw):
    def read(name):
        return json.loads((raw / name).read_bytes())

    result = {"units": "CSS px, simulated seconds", "openings": [], "archivePoses": [], "realEntry": [], "lifecycle": []}
    for name in ("320-p0", "375-p0", "390-p0", "430-p0", "320-p1", "375-p1"):
        rows = read(f"frozen-{name}.json")
        counts = Counter()
        for row in rows:
            pair = row.get("pair", {})
            tag = "curved" if pair.get("curved") else f"straight{len(pair.get('stages', []))}"
            counts[tag] += 1
        result["openings"].append({"pose": name, "count": len(rows), **counts})

    for width, name in [(320, "archive-320"), (375, "archive-375"), (390, "model-log-390"), (430, "archive-430")]:
        replay = read(name + ".json")
        curves = [r["index"] for r in replay["rows"] if r["curve"]]
        result["archivePoses"].append({"width": width, "poses": len(replay["rows"]), "curves": curves,
                                     "archiveSHA256": replay["input"]})
    for width, original_index in [(375, 281), (390, 404), (430, 434)]:
        for original_goal, index in [(True, original_index), (False, 18)]:
            group = "goal" if original_goal else "exact"
            candidate = f"deferred2-{group}-{width}.json"
            if original_goal:
                baseline = "390-case-baseline-service.json" if width == 390 else f"service-real-{width}-baseline-service.json"
            else:
                baseline = f"direct-base-{width}.json"
            before = next(row for row in read(baseline)["rows"] if row["index"] == index)
            case = read(candidate + f".case-{index}.json")
            after = case["observed"]
            result["realEntry"].append({
                "width": width, "originalRequest": original_index, "originalGoal": original_goal,
                "key": case["input"]["key"], "goal": after["original"], "at": after["pair"]["q"],
                "v11": {k: before[k] for k in ("actual", "error", "issued", "violations")},
                "v12": {k: after[k] for k in ("actual", "gain", "projected", "goalError", "issued", "stopped", "violations")},
                "helpers": after["pair"]["stages"],
                "events": [{k: event[k] for k in ("type", "clock", "probes", "ground", "protected", "accepted") if k in event}
                           for event in after["trace"]],
            })
    controls = ["uninterrupted", "helper has a pending goal", "touch helper after first step",
                "new tap", "held actor", "blocked or paused", "changed navigation", "replaced intention"]
    for label, row in zip(controls, read("deferred2-life390.json")["rows"], strict=True):
        result["lifecycle"].append({"case": label, **{k: row[k] for k in ("curve", "actual", "error", "interrupted", "violations")}})
    result["recommended"] = []
    for width, label, index, original in (
        (375, "石像", 18, "short2-direct-375"), (390, "石像", 18, "short2-direct-390"),
        (430, "キツネ", 18, "short2-direct-430"),
        (390, "みているなにか", 2971, "ordinary-short-390"),
        (375, "カワウソ", 4401, "ordinary-short-375-reference"),
    ):
        row = next(r for r in read(original + ".json")["rows"] if r["index"] == index)
        result["recommended"].append({"width": width, "resident": label, **{k: row[k] for k in
            ("clock", "curve", "actual", "error", "gain", "stopped", "violations")}})
    result["distanceAudit"] = []
    for pattern in ("exits-exact-*.json", "exits-*-watcher.json", "exits-*-otter.json"):
        for file in sorted(raw.glob(pattern)):
            data = read(file.name)
            lost = []
            for stage in data["routes"][0]["stages"]:
                lost.append({dist: [r["key"] for r in stage["relativeToOpening"] if r["closed"][i]]
                             for i, dist in enumerate((3, 8, 16))})
            result["distanceAudit"].append({"file": file.name, "width": data["width"], "lossByStage": lost})
    result["warmCpuMs"] = []
    for file in sorted(raw.glob("bench-*.json")):
        if ".case-" in file.name:
            continue
        sample = read(file.name)["rows"][0]
        repeats = sample["profiles"]
        resume = [r for iteration in repeats for r in iteration["curve"]]
        steps = [r for iteration in repeats for r in iteration["step"]]
        result["warmCpuMs"].append({"file": file.name, "repeats": len(repeats), "firstExcludedFromWarmMedian": True,
            "warmMedianCurveTotal": statistics.median(sum(r[1] for r in v["curve"]) for v in repeats[1:]),
            "maxSingleResumeCPU": max(r[1] for r in resume), "maxSingleResumeWall": max(r[0] for r in resume),
            "maxWholeStepCPU": max(r[1] for r in steps), "maxWholeStepWall": max(r[0] for r in steps)})
    result["river"] = []
    for policy in read("guards-river.json"):
        opening = policy["poses"][0]["rays"] if policy["poses"] else {}
        losses = [{dist: [key for key, rays in frame["rays"].items() if opening[key][dist] and not rays[dist]]
                   for dist in ("3", "8", "16")} for frame in policy["poses"]]
        result["river"].append({"guard": policy["guard"], "resumes": policy["resume"], "poses": len(losses),
                                "lastExitLostByStage": losses, "plan": policy["events"][-1]})
    result["recommendedLifecycle"] = [{"case": label, **{k: row[k] for k in ("curve", "actual", "error", "interrupted", "violations")}}
        for label, row in zip(controls, read("short-life390.json")["rows"], strict=True)]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("raw", type=Path)
    parser.add_argument("summary", type=Path)
    parser.add_argument("--bundle", type=Path)
    args = parser.parse_args()
    args.summary.write_text(json.dumps(summarize(args.raw), indent=2, ensure_ascii=False) + "\n")
    if args.bundle:
        args.bundle.parent.mkdir(parents=True, exist_ok=True)
        patterns = ["frozen-*.json", "archive-*.json", "model-log-390*.json", "early-320-*.json",
                    "near-*.json", "direct-base-*.json", "390-case-*.json", "service-real-*.json",
                    "deferred2-*.json", "drag-*.json", "alignment375.json", "camera-*.json",
                    "ordinary-*.json", "bench-*.json", "short2-*.json", "extra-*.json",
                    "max-guards-*.json", "exits-*.json", "short-life390*.json", "guards-river.json"]
        paths = sorted({path for pattern in patterns for path in args.raw.glob(pattern)})
        with zipfile.ZipFile(args.bundle, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for p in paths:
                archive.write(p, p.name)
            manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
            archive.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
