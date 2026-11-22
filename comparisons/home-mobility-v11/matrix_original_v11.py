"""Rebuild the independently initialized first-run summary from the original numerical ZIPs."""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
import zipfile

import matrix_report_v11 as report


def run(args):
    status, jobs, official = report.inspect_run(args.run)
    receipt = {
        "run": args.run, "source": status["headSha"], "url": status["url"], "overall":status["conclusion"],
        "statuses":{}, "artifacts":{}, "completeRegions":0, "certifiedCells":0,
        "uncertifiedCellsWithRawEvidence":0, "nativeScripts":{}, "unusableCellRecords":[]
    }
    groups, shifts, goals = [], [], []
    root = args.archives / args.run
    old = report.old
    for region in old.REGIONS:
        job = jobs[f"region ({region})"]
        item = official["mobility-v11-" + region]
        data = (root / f"mobility-v11-{args.run}-{region}.zip").read_bytes()
        checksum = old.digest(data)
        old.require("sha256:" + checksum == item["digest"] and len(data) == item["size_in_bytes"], "GitHub ZIP differs")
        old.require(job["conclusion"]=="success", "original independent run incomplete")
        receipt["statuses"][region] = job["conclusion"]
        with zipfile.ZipFile(root / f"mobility-v11-{args.run}-{region}.zip") as archive:
            manifest = json.loads(archive.read("region.json"))
            names = {f"{region}-{n}-{w}.json.gz" for n in old.COUNTS for w in old.WIDTHS}
            old.require(manifest["complete"] and set(manifest["cells"]) == names and set(archive.namelist()) == names | {"region.json"},
                        "incomplete original region")
            old.require(manifest["base"] == report.BASE_SHA and manifest["revision"] == status["headSha"]
                        and manifest["region"] == region and manifest["historicalInputsSHA256"] == old.digest(old.HISTORY.read_bytes()),
                        "original inputs or release differ")
            for name in sorted(names):
                raw = archive.read(name)
                old.require(old.digest(raw)==manifest["cells"][name], "original cell changed")
                cell = json.loads(gzip.decompress(raw))
                for arm in report.ARMS[1:]:
                    pair = dict(cell, schema=1, suite="matrix", paired=True,
                                arms={"v5":cell["arms"]["v10"],"v6":cell["arms"][arm]})
                    old.validate_cell(pair, cell["region"], cell["count"], cell["width"])
                for arm, arm_data in cell["arms"].items():
                    ident = {"scripts":arm_data["hashes"], "entry":manifest["entries"][arm]}
                    old.require(receipt["nativeScripts"].setdefault(arm, ident) == ident, "mixed native scripts")
                    people, inputs, aged, targets = [], [], [], []
                    safe = Counter()
                    report.add_household(cell, arm, people, inputs, aged, targets, safe, Counter())
                    scores = report.prior.digest_group(people, inputs, aged, targets)
                    model = arm_data["aged"]
                    shifts.extend({**report.label(cell), "arm":arm, **q} for q in model["sync"]["shifts"])
                    goals.extend(report.alternative_goals(cell, arm, model))
                    groups.append({**report.label(cell), "arm":arm, **{k:scores[k] for k in report.FIELDS},
                                   "goalChanges":len(model["goalChanges"]), "agedSafeSteps":safe["steps"],
                                   "syncs":safe["modelSyncCallsDuringAge"], "nonWalkingShifts":safe["feetChangedBySyncDuringAge"]})
            receipt["artifacts"][region] = {"id":item["id"], "sha256":checksum, "bytes":len(data), "job":job["databaseId"],
                                           "certifiedCells":len(names), "totalRecordedCells":len(names), "complete":True}
            receipt["certifiedCells"] += len(names)
            receipt["completeRegions"] += 1
    keys = (*report.FIELDS, "goalChanges", "agedSafeSteps", "syncs", "nonWalkingShifts")
    receipt["totalsOverCertifiedCells"] = {a:{k:sum(row[k] for row in groups if row["arm"] == a) for k in keys} for a in report.ARMS}
    report.write_table(root / "matrix-first-shifts.csv.gz", shifts, (*report.ID,"arm","key","clock","before","after"))
    report.write_table(root / "matrix-first-goals.csv.gz", goals, (*report.ID,"arm","key","clock","from","raw","chosen"))
    for output in {root, args.out}:
        output.mkdir(parents=True, exist_ok=True)
        report.prior.csv_write(output / "matrix-first-cells.csv", groups)
        report.prior.write_json(output / "matrix-first-receipt.json", receipt)
    print(receipt["certifiedCells"], receipt["totalsOverCertifiedCells"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", default="44986753461")
    parser.add_argument("--archives", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=report.HERE/"evidence")
    run(parser.parse_args())
