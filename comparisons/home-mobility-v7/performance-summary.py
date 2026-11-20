"""Summarise each real rAF gap using separate browser and Linux observations."""

import argparse
import json
from itertools import pairwise
from pathlib import Path


def overlaps(a, b, c, d):
    return max(0, min(b, d) - max(a, c))


def heartbeat(ticks, lo, hi):
    return {
        "inside": sum(lo <= v < hi for v in ticks),
        "largestOverlappingGap": max(
            (b - a for a, b in pairwise(ticks) if overlaps(a, b, lo, hi)),
            default=None,
        ),
    }


def attribute(row, lo, hi):
    s = row["sample"]
    q = s["audit"] or {}
    mark = q.get("mark") or s["osMark"]
    phase = {}
    for label, a, b in q.get("spans", []):
        ms = overlaps(a, b, lo, hi)
        if ms:
            phase[label] = round(phase.get(label, 0) + ms, 3)
    # The OS collector starts between the two JS readings surrounding the
    # binding round trip. Use their midpoint; each OS endpoint is sampled.
    offset = s["start"] - sum(mark) / 2
    rows = row["os"]
    first = min(rows, key=lambda z: abs(z[0] - lo - offset))
    last = min(rows, key=lambda z: abs(z[0] - hi - offset))
    thread = {}
    if len(first) > 5 and len(last) > 5:
        thread = {k: round(v - first[5].get(k, 0), 1) for k, v in last[5].items()}
    process = {
        v[0]: {
            "cpuMs": v[1] - first[4][pid][1],
            "mainCpuMs": round(v[2] - first[4][pid][2], 1),
            "mainRunnableWaitMs": round(v[3] - first[4][pid][3], 1),
        }
        for pid, v in last[4].items()
        if pid in first[4]
    }
    return {
        "range": [lo, hi],
        "duration": hi - lo,
        "worker": heartbeat(q["worker"], lo, hi) if q else None,
        "mainTimer": heartbeat(q["main"], lo, hi) if q else None,
        "phaseMs": phase,
        "osRangeErrorMs": round(
            max(abs(first[0] - offset - lo), abs(last[0] - offset - hi))
            + (mark[1] - mark[0]) / 2,
            1,
        ),
        "process": process,
        "webThreadCpuMs": thread,
        "cgroupThrottlePeriods": last[2] - first[2],
        "cgroupThrottledMs": round((last[3] - first[3]) / 1000, 1),
    }


def summary(row):
    s = row["sample"]
    f = [(0, 0)]
    end = 0
    for g in s["intervals"]:
        if g > 500 or g == s["max"]:
            f.append((end, end + g))
        end += g
    return {
        "arm": row["arm"],
        "frame": {
            k: s[k]
            for k in [
                "elapsedMs",
                "clock",
                "moves",
                "distance",
                "frames",
                "hz",
                "p95",
                "p99",
                "max",
                "over500",
                "over1000",
                "pausedMs",
                "retained",
            ]
        },
        "visible": [s.get("visibleAtOpen"), s.get("visibleAtEnd")],
        "gaps": [(attribute(row, a, b) if row["os"] else [a, b]) for a, b in f[1:]],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("--out", type=Path)
    a = parser.parse_args()
    d = json.loads(a.raw.read_text())
    result = [summary(r) for r in d["rows"]]
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if a.out:
        a.out.write_text(text)
    else:
        print(text, end="")
