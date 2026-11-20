"""Validate the frame captures and retain comparable timing and scheduler measurements."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "native_summary", HERE.parent / "home-mobility-v7/performance-summary.py"
)
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
ARMS = ["v6", "v7", "v8"]


def report(directory):
    output = {}
    openings, scales, versions, hashes = set(), set(), set(), {}
    for label, order in [("forward", ARMS), ("reverse", ARMS[::-1]), ("trace", ARMS)]:
        path = directory / (label + ".json")
        raw = json.loads(path.read_text())
        assert raw["order"] == order and len(raw["rows"]) == 3
        assert raw["trace"] == (label == "trace")
        versions.add(raw["version"])
        rows = []
        for r in raw["rows"]:
            s = r["sample"]
            assert all(r["nativeAtBoot"].values()) and len(s["opening"]) == 28
            assert s["retained"] and s["visibleAtOpen"] == s["visibleAtEnd"] == 28
            assert s["elapsedMs"] >= (25000 if raw["trace"] else 180000)
            openings.add(json.dumps(s["opening"]))
            scales.add(tuple(s["scales"]))
            for name, sha in r["build"].items():
                assert hashes.setdefault(name, sha) == sha
            row = previous.summary(r)
            # Keep the worst interval plus the full distribution of over-500ms
            # gaps, and the aligned CPU attribution for the longest interval.
            worst = max(row.pop("gaps"), key=lambda g: g["duration"])
            row["longest"] = worst
            row["over500Ms"] = [i for i in s["intervals"] if i > 500]
            row["nativeAtBoot"] = r["nativeAtBoot"]
            row["socialEvents"] = s["events"]
            if raw["trace"]:
                row["phase"] = s["audit"]["parts"]
                row["calls"] = s["audit"]["counts"]
            rows.append(row)
        output[label] = {
            "rawSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "preflight": raw.get("preflight"), "rows": rows
        }
    assert len(openings) == len(scales) == len(versions) == 1
    return {
        "webkit": versions.pop(), "seed": 214, "cssViewport": [390, 792],
        "dpr": 2, "opening": json.loads(openings.pop()), "scales": scales.pop(),
        "assets": hashes, **output
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.write_text(json.dumps(report(args.directory), ensure_ascii=False, separators=(",", ":")) + "\n")
