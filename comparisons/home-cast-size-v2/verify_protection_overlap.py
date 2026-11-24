"""Check open pull requests, including their renamed paths, against the V2 changes."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PR = 570
reference = HERE.parent / "home-cast-size-v1" / "verify_protection_overlap.py"
spec = importlib.util.spec_from_file_location("cast_v1_overlap", reference)
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)
v1.EXPERIMENT = "comparisons/home-cast-size-v2/"
v1.WORKFLOW = ".github/workflows/home-cast-size-v2.yml"


def verify():
    pulls = list(v1.pages("pulls?state=open"))
    target = v1.github(f"pulls/{PR}")
    others = [pr for pr in pulls if pr["number"] != PR]
    with ThreadPoolExecutor(max_workers=6) as pool:
        rows = list(pool.map(v1.changes, others))
    rows.sort(key=lambda item: item["number"], reverse=True)
    conflicts = [row for row in rows if row["matches"]]
    result = {
        "repository": v1.REPO, "main": v1.github("branches/main")["commit"]["sha"],
        "checkedAt": datetime.now(timezone.utc).isoformat(), "openOtherPRs": len(rows),
        "otherChangedPaths": sum(item["files"] for item in rows), "overlappingOtherPRs": conflicts,
        "targetPR": {"number": PR, "draft": target["draft"], "state": target["state"],
                     "head": target["head"]["sha"], "base": target["base"]["sha"]},
        "otherPRs": rows,
    }
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()
    report = verify()
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(report["openOtherPRs"], "open peer PRs,", report["otherChangedPaths"],
          "changed files,", len(report["overlappingOtherPRs"]), "overlapping PRs")
    if report["overlappingOtherPRs"]:
        raise SystemExit("V2 files overlap a concurrent PR")
