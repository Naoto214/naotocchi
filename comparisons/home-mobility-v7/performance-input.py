"""Attribute release and subsequent planner costs in the 28-resident physical-input grid."""

import argparse
import json
import math
from collections import Counter
from pathlib import Path
from statistics import median

ARMS = ("v5", "v6", "v7")
WIDTHS = {320, 375, 390, 430}


def distribution(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return {"n": 0}
    return {
        "n": len(values),
        "median": round(median(values), 3),
        "p95": round(values[math.ceil(0.95 * len(values)) - 1], 3),
        "p99": round(values[math.ceil(0.99 * len(values)) - 1], 3),
        "max": round(values[-1], 3),
    }


def load(root, model_hash):
    inputs = {arm: [] for arm in ARMS}
    profiles = {}
    for path in sorted(root.glob("*/*-28-*.json")):
        cell = json.loads(path.read_text())
        region, width = cell["region"], cell["width"]
        assert cell["count"] == 28
        assert width not in profiles.setdefault(region, set())
        profiles[region].add(width)
        arm_hashes = cell["arms"]["v7"]["hashes"]
        assert arm_hashes["home-production-model-mobility-v7.js"] == model_hash
        for arm in ARMS:
            for label, row in cell["arms"][arm]["rows"].items():
                if row["skip"] or label.startswith("tap/"):
                    continue
                assert row["trusted"]
                inputs[arm].append((region, width, label, row))
    assert len(profiles) == 13 and all(v == WIDTHS for v in profiles.values())
    assert all(
        [r[:3] for r in inputs[a]] == [r[:3] for r in inputs["v5"]] for a in ARMS
    )
    return inputs


def costs(rows):
    retries, searches, phase_counts, multi, single = [], [], Counter(), [], []
    worst_retry = None
    for region, width, case, r in rows:
        peers = {offer["peer"] for offer in r["nativeMotion"]["offered"]}
        if len(peers) == 1:
            single.append(r["modelMoveMs"])
        if len(peers) > 1:
            multi.append(r["modelMoveMs"])
        for op in r["nativePlans"]:
            if not op["retry"]:
                continue
            retries.append(op["ms"])
            if worst_retry is None or op["ms"] > worst_retry["ms"]:
                worst_retry = {
                    "region": region,
                    "width": width,
                    "case": case,
                    "resident": r["key"],
                    "modelClock": round(op["clock"], 3),
                    "ms": round(op["ms"], 3),
                }
        for op in r["searches"]:
            searches.append(op["ms"])
            phase_counts[op["phase"]] += 1
    return {
        "drags": len(rows),
        "releaseQueueMs": distribution(r["pointerQueueMs"] for *_, r in rows),
        "releaseHandlerMs": distribution(r["releaseMs"] for *_, r in rows),
        "eventToNextFrameMs": distribution(r["releaseFrameMs"] for *_, r in rows),
        "modelMoveAtReleaseMs": distribution(r["modelMoveMs"] for *_, r in rows),
        "modelMoveAtReleaseWithOnePeerMs": distribution(single),
        "modelMoveAtReleaseWithMultiplePeersMs": distribution(multi),
        "subsequentRetryMs": distribution(retries),
        "worstLaterRetry": worst_retry,
        "allSearchMs": distribution(searches),
        "searchCountByPhase": dict(phase_counts),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("--model-sha256", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    arms = load(args.raw, args.model_sha256)
    result = {name: costs(rows) for name, rows in arms.items()}
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
