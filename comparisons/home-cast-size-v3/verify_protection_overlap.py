"""Recheck GitHub's open PRs for overlaps with the new V3 directory and CI file."""
import argparse
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REFERENCE = "7e0a8cd6a506142fbe65b9ca6fd4ff4f855d4e9a"
WORKFLOWS = [".github/workflows/home-cast-size-v3.yml", ".github/workflows/home-cast-size-v3-matrix.yml"]
previous = HERE.parent / "home-cast-size-v2" / "verify_protection_overlap.py"
spec = importlib.util.spec_from_file_location("previous_overlap", previous)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    audit.v1.reserved = lambda filename: filename.startswith("comparisons/home-cast-size-v3/") or filename in WORKFLOWS
    result = audit.verify()
    result["reservedWorkflows"] = WORKFLOWS
    head = result["targetPR"]["head"]
    files = audit.v1.github(f"compare/{REFERENCE}...{head}")["files"]
    if len(files) >= 300:
        raise RuntimeError("GitHub comparison is capped at 300 files; verify the full Git tree")
    result["changesSinceV2"] = {
        "base":REFERENCE, "head":head, "count":len(files),
        "outsideV3OrNotAdded":[f["filename"] for f in files if not audit.v1.reserved(f["filename"]) or f["status"]!="added"],
    }
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print(len(result["overlappingOtherPRs"]), "other PRs with overlapping files")
    if result["overlappingOtherPRs"] or result["changesSinceV2"]["outsideV3OrNotAdded"]:
        raise SystemExit("Overlapping PR files or a change to the retained V2")
