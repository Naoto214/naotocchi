"""Verify official region artifacts and compare initial, independently aged and restored touch outcomes."""
import argparse
from collections import Counter
import gzip
import json
import math
from pathlib import Path
import zipfile

from matrix_worker_v11 import ARMS, BASE_SHA, HERE, baseline, drop_outcome, old, v9, validate
import matrix_report_v10 as metrics

prior = metrics.prior
FIELDS = ("normalWalkers", "arrival", "near4", "tapSelected", "bothFailed", "agedDragArrival")
PUBLISHED = dict(zip(FIELDS, (3215, 911, 522, 246, 3, 235)))
ID = ("region", "count", "width")


def label(cell):
    return {k: cell[k] for k in ID}


def digest_opening(actors):
    return old.digest(old.canonical(actors).encode())


def replay_difference(a, b):
    fields = ("selectedKey", "issued", "accepted", "step", "arrived", "near4")
    return ",".join(field for field, before, after in zip(fields, drop_outcome(a), drop_outcome(b), strict=True)
                    if before != after)


def summarize_drops(cell, previous, shared_rows, aged_rows, initial_differences):
    for arm, data in cell["arms"].items():
        for case, row in data["rows"].items():
            archived = previous["arms"]["v10"]["rows"][case]
            if row.get("skip"):
                continue
            differences = replay_difference(archived, row)
            if differences:
                initial_differences.append({**label(cell), "case": case, "arm": arm, "changed": differences,
                                             "prior": old.canonical(drop_outcome(archived)), "new": old.canonical(drop_outcome(row))})
    previous_v9 = previous["arms"]["v9"]["aged"]
    previous_v10 = previous["arms"]["v10"]["aged"]
    fresh = cell["arms"]["v10"]["aged"]
    for arm, data in cell["arms"].items():
        aged = data["aged"]
        raw = aged["drag"]
        aged_rows.append({**metrics.input_summary(cell, "natural", arm, raw), "opening": digest_opening(aged["opening"]),
            "priorV9SameFeet": aged["opening"] == previous_v9["opening"],
            "priorV10SameFeet": aged["opening"] == previous_v10["opening"],
            "freshV10SameFeet": aged["opening"] == fresh["opening"],
            "footOnlySameFeet": aged["opening"] == cell["arms"]["v11-foot"]["aged"]["opening"],
            "priorV9": metrics.drop_status(previous_v9["drag"]), "priorV10": metrics.drop_status(previous_v10["drag"]),
            "freshV10": metrics.drop_status(fresh["drag"]),
            "footOnly": metrics.drop_status(cell["arms"]["v11-foot"]["aged"]["drag"])})
    for donor, series in cell["shared"].items():
        reference = series["replays"]["v10"]["row"]
        for receiver, observation in series["replays"].items():
            shared_rows.append({**metrics.input_summary(cell, donor, receiver, observation["row"]),
                "opening": digest_opening(series["opening"]),
                "inputDifferences": replay_difference(reference, observation["row"]),
                "donorNaturalDifferences": replay_difference(cell["arms"][donor]["aged"]["drag"], observation["row"])})


def alternative_goals(cell, arm, aged):
    sx, sy = aged["drag"]["scale"]
    def distance(a, b):
        return math.hypot((a[0] - b[0]) * sx, (a[1] - b[1]) * sy)
    for choice in aged["goalChanges"]:
        paths = aged["tracks"][choice["key"]]["trips"]
        trips = [trip for trip in paths if abs(trip["start"] - choice["clock"]) < 1e-6
                 and distance(trip["goal"], choice["chosen"]) < 1e-6]
        row = dict(**label(cell), arm=arm, **choice, originalLength=distance(choice["from"], choice["raw"]),
                   chosenLength=distance(choice["from"], choice["chosen"]), immediatePlans=len(trips))
        complete = next((trip for trip in trips if trip["end"] is not None), None)
        if complete:
            row.update(end=complete["end"], to=complete["to"], actualWalkCss=complete["cssDistance"],
                       actualDisplacement=distance(complete["from"], complete["to"]),
                       originalGain=distance(complete["from"], choice["raw"]) - distance(complete["to"], choice["raw"]),
                       chosenGain=distance(complete["from"], choice["chosen"]) - distance(complete["to"], choice["chosen"]),
                       escape=complete["escape"])
        yield row


def add_household(cell, arm, residents, inputs, aged_inputs, targets, safety, extra):
    data = cell["arms"][arm]
    a = data["aged"]
    drop = a["drag"]
    start = len(residents)
    for r in a["final"]["residents"]:
        residents.append(prior.resident(cell, arm, r, a["tracks"][r["key"]], drop["scale"], a["final"]["modelSeconds"]))
    inputs.extend(prior.physical_rows(cell, arm))
    after = prior.prior.drag_row(cell, arm, f"aged/{a['index']}", drop, "aged")
    aged_inputs.append(after)
    who = next(r for r in a["final"]["residents"] if r["key"] == drop["key"])
    no_auto = bool(who["ambientFailures"] and not who["ambientStarts"])
    targets.append({**label(cell), "arm": arm, "key": who["key"], "dualFailure": no_auto and after["issued"] and not after["actualStep"],
                    "wrongSelectionAndAutonomyFailed": no_auto and not after["selected"]})
    for field in prior.SAFETY:
        safety[field] += a["safety"][field]
    safety["modelSyncCallsDuringAge"] += a["sync"]["calls"]
    safety["feetChangedBySyncDuringAge"] += len(a["sync"]["shifts"])
    for frame in a["frameSamples"]:
        for field in ("painted", "outsideActorBounds", "nonGround", "hidden"):
            safety[field] += frame[field]
        safety["sampledFrames"] += 1
    for gesture in [drop, *data["rows"].values()]:
        if gesture.get("skip"): continue
        safety["inputUnsafe"] += gesture["unsafeSteps"]
        safety["inputSwept"] += gesture["sweptViolations"]
        safety["inputPeerUnsafe"] += sum(peer["unsafe"] for peer in gesture["peerWalk"].values())
        safety["inputPeerSwept"] += sum(peer["swept"] for peer in gesture["peerWalk"].values())
    if "reloaded" in data:
        restore = data["reloaded"]
        old.require(restore["saved"] == restore["loaded"] and len(restore["roster"]) == 28 and restore["drag"]["trusted"],
                    "authentic save/restore changed")
        safety["confirmedSaveRestore"] += 1
    extra["people"] += len(residents) - start
    extra["clockSeconds"] += a["final"]["modelSeconds"]


def inspect_run(run):
    status = prior.github("run", "view", run, "-R", prior.REPO, "--json", "status,conclusion,headSha,url,jobs")
    jobs = {j["name"]: j for j in status.pop("jobs")}
    artifacts = prior.github("api", f"repos/{prior.REPO}/actions/runs/{run}/artifacts?per_page=100")["artifacts"]
    return status, jobs, {a["name"]: a for a in artifacts}


def read_cells(args, receipts):
    """Accept a successful repair job only after checking all native script and HTML digests across runs."""
    primary = str(args.run)
    sources = {region: primary for region in old.REGIONS}
    for entry in args.recovery:
        region, run = entry.split("=", 1)
        if region not in sources: raise ValueError("unknown recovery region: " + region)
        sources[region] = run
    runs = {run: inspect_run(run) for run in set(sources.values())}
    receipts["runs"] = {rid: item[0] for rid, item in runs.items()}
    tape = v9.history()
    historical = json.loads((baseline.HERE / "evidence/matrix-receipt.json").read_bytes())
    for region in old.REGIONS:
        run = sources[region]
        status, jobs, items = runs[run]
        job = jobs[f"region ({region})"]
        old.require(job["conclusion"] == "success", f"{run}/{region}: regional job did not finish successfully")
        item = items["mobility-v11-" + region]
        path = args.archives / run / f"mobility-v11-{run}-{region}.zip"
        checksum = old.digest(path.read_bytes())
        old.require(path.stat().st_size == item["size_in_bytes"] and "sha256:" + checksum == item["digest"],
                    "raw archive does not match GitHub")
        receipts["regions"][region] = {"run": run, "job": job["databaseId"], "bytes": path.stat().st_size, "sha256": checksum,
                                       "artifact": item["id"], "url": status["url"] + "/artifacts/" + str(item["id"])}
        history = historical["regions"][region]
        old_zip = args.v10_archives / f"mobility-v10-{history['run']}-{region}.zip"
        old.require(old.digest(old_zip.read_bytes()) == history["sha256"], "V10 reference ZIP differs from PR #580")
        with zipfile.ZipFile(path) as archive, zipfile.ZipFile(old_zip) as previous:
            manifest = json.loads(archive.read("region.json"))
            names = {f"{region}-{count}-{width}.json.gz" for count in old.COUNTS for width in old.WIDTHS}
            old.require(set(archive.namelist()) == names | {"region.json"} and set(manifest["cells"]) == names
                        and manifest["complete"] and manifest["region"] == region, "incomplete regional artifact")
            old.require(manifest["base"] == BASE_SHA and manifest["revision"] == status["headSha"], "wrong matrix source")
            old.require(manifest["historicalInputsSHA256"] == old.digest(old.HISTORY.read_bytes())
                        and manifest["agedSubjectsSHA256"] == old.digest(baseline.v8.SUBJECTS.read_bytes()), "physical tape changed")
            for name in sorted(names):
                packed = archive.read(name)
                old.require(old.digest(packed) == manifest["cells"][name], "cell SHA mismatch")
                cell = json.loads(gzip.decompress(packed))
                validate(cell, tape)
                for arm, data in cell["arms"].items():
                    identity = {"scripts": data["hashes"], "entry": manifest["entries"][arm]}
                    old.require(receipts["identity"].setdefault(arm, identity) == identity and data["browser"] == manifest["browser"],
                                "native source differs across regions")
                preceding = json.loads(previous.read(name.removesuffix(".gz")))
                old.require(cell["arms"]["v10"]["hashes"] == preceding["arms"]["v10"]["hashes"]
                            and cell["arms"]["v10"]["opening"] == preceding["arms"]["v10"]["opening"], "V10 reference drifted")
                yield cell, preceding


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run", required=True)
    p.add_argument("--recovery", nargs="*", default=[], metavar="REGION=RUN")
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--v10-archives", type=Path, required=True)
    p.add_argument("--private-data", type=Path, required=True)
    p.add_argument("--out", type=Path, default=HERE / "evidence")
    args = p.parse_args()
    args.private_data.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    residents, inputs, aged_inputs, targets = [], [], [], []
    shared, aged_rows, opening_diffs, alternatives, cohorts, sync = [], [], [], [], [], []
    safe = {arm: Counter() for arm in ARMS}
    extra = {arm: Counter() for arm in ARMS}
    receipt = {"base": BASE_SHA, "run": args.run, "regions": {}, "identity": {}}
    for cell, previous in read_cells(args, receipt):
        summarize_drops(cell, previous, shared, aged_rows, opening_diffs)
        values = {}
        for arm in ARMS:
            start = len(residents)
            add_household(cell, arm, residents, inputs, aged_inputs, targets, safe[arm], extra[arm])
            aged = cell["arms"][arm]["aged"]
            alternatives.extend(alternative_goals(cell, arm, aged))
            sync.extend({**label(cell), "arm":arm, **shift} for shift in aged["sync"]["shifts"])
            values[arm] = {r["key"]:r["normalCompletions"] for r in residents[start:]}
        for key in values["v10"]:
            scores = {arm: values[arm][key] for arm in ARMS}
            if not all(scores.values()):cohorts.append({**label(cell), "key":key, **scores})
    groups = []
    for arm in ARMS:
        data = [[r for r in items if r["arm"] == arm] for items in (residents, inputs, aged_inputs, targets)]
        for name, keys in (("all", ("all",)), ("region", old.REGIONS), ("count", old.COUNTS), ("width", old.WIDTHS)):
            for key in keys:
                parts = data if name == "all" else [[r for r in part if r[name] == key] for part in data]
                groups.append({"group": name, "value": key, "arm": arm, **prior.digest_group(*parts)})
    totals = {r["arm"]: r for r in groups if r["group"] == "all"}
    for arm, totals_for_arm in totals.items():
        old.require(tuple(totals_for_arm[k] for k in ("residents","drags","tapSent","agedDragCount")) ==
                    (3276,1058,260,260), "incomplete cohort")
    result = {"publishedV10": PUBLISHED, "totals": totals, "safety": safe, "cases": 260,
        "thresholds": {arm: {field: totals[arm][field] <= goal if field == "bothFailed" else totals[arm][field] >= goal
                             for field, goal in PUBLISHED.items()} for arm in ARMS},
        "matched": {"trusted": sum(r["trusted"] for r in shared), "total": len(shared),
                    "differentFromV10WithSameFeet": sum(bool(r["inputDifferences"]) for r in shared),
                    "differentFromDonorNatural": sum(bool(r["donorNaturalDifferences"]) for r in shared)},
        "modelSeconds": extra, "changedGoals": len(alternatives), "nonWalkingShifts": len(sync),
        "completedChangedGoals": sum("end" in r for r in alternatives),
        "normalChangedGoalsTowardOriginal": sum(r.get("actualDisplacement",0)>=8-1e-7 and r.get("originalGain",0)>.75
                                              and not r.get("escape") for r in alternatives),
        "equalAgedFeetToCurrentV10": {arm: sum(r["arm"] == arm and r["freshV10SameFeet"] for r in aged_rows) for arm in ARMS}}
    for basename, rows in (("groups", groups), ("uncompleted", cohorts), ("opening-differences", opening_diffs)):
        prior.csv_write(args.out / f"matrix-{basename}.csv", rows)
    for basename, rows in (("residents", residents), ("opening-inputs", inputs), ("aged-inputs", aged_rows),
                           ("matched-inputs", shared), ("alternative-goals", alternatives), ("foot-shifts", sync)):
        prior.csv_write(args.private_data / f"matrix-{basename}.csv.gz", rows)
    failures = [r for r in aged_rows if r["status"] != "arrived"]
    prior.csv_write(args.out / "matrix-aged-failures.csv", failures)
    receipt["derived"] = {f.name: {"bytes":f.stat().st_size, "sha256":old.digest(f.read_bytes())}
                          for f in sorted(args.private_data.glob("matrix-*.csv.gz"))}
    prior.write_json(args.out / "matrix-results.json", result)
    prior.write_json(args.out / "matrix-receipt.json", receipt)
    print(json.dumps(result["thresholds"]))


if __name__ == "__main__":
    main()
