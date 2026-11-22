"""Summarize real-native space probes for the small PR tables. Full per-direction measurements are retained separately."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def report(src, out, raw):
    def load(name):
        return json.loads((src / ("m12-space-" + name + ".json")).read_text())

    def write(name, value):
        (out / name).write_text(
            json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n"
        )

    original, revised = load("seat-default"), load("seat-reference")
    assert original["source"] != revised["source"]
    write("space-small-seats.json", {"default": original, "reference": revised})
    refuge = load("refuges")
    write("space-refuge.json", refuge)
    files = [
        "gridtwopx",
        "grid1",
        "grid05",
        "fair-375",
        "refuges",
        "seat-default",
        "seat-reference",
    ]
    for name in ("grid1-aged", "grid1-default"):
        if (src / ("m12-space-" + name + ".json")).exists():
            files.append(name)
    grids = []
    for name in (v for v in files if v.startswith("grid")):
        for r in load(name):
            focused = r.get("focused")
            entry = {
                k: v
                for k, v in r.items()
                if k not in ("statsByDirection", "evidence", "focused")
            }
            if focused:
                entry["focused"] = focused
            entry["conditionalPairs"] = r["evidence"]
            entry["directions"] = {
                k: sum(bool(t[k]) for t in r["statsByDirection"])
                for k in (
                    "oneCanLeave",
                    "conditionalPairs",
                    "successfulPairs",
                    "unresolvedPairs",
                )
            }
            grids.append(entry)
    write("space-orders.json", grids)
    f = load("fair-375")[0]
    brief = [
        {
            **{k: v for k, v in x.items() if k != "stages"},
            "stages": [
                {
                    "who": t["who"],
                    "to": t["to"],
                    "counts": [a["counts"][1] for a in t["relativeToOpening"]],
                }
                for t in x["stages"]
            ],
        }
        for x in f["routes"]
    ]
    write("space-fairness-375.json", {**f, "routes": brief})
    raw.mkdir(parents=True, exist_ok=True)
    receipt = {}
    for name in files:
        data = (src / ("m12-space-" + name + ".json")).read_bytes()
        compress = gzip.compress(data, mtime=0)
        fn = "space-" + name + ".json.gz"
        (raw / fn).write_bytes(compress)
        receipt[fn] = {
            "bytes": len(compress),
            "rawSHA": hashlib.sha256(data).hexdigest(),
            "gzipSHA": hashlib.sha256(compress).hexdigest(),
        }
    write("space-receipt.json", receipt)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--measurements", type=Path, required=True)
    p.add_argument("--out", type=Path, default=HERE / "evidence")
    p.add_argument("--raw", type=Path, required=True)
    args = p.parse_args()
    report(args.measurements, args.out, args.raw)
