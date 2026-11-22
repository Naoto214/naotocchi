"""Losslessly pack the 181 recorded frames of each 375px household. No trajectory is interpolated."""

import argparse
import hashlib
import json
from pathlib import Path


def pack(source):
    data = json.loads(source.read_bytes())
    assert data["start"] == 195 and data["end"] == 201 and data["stepSeconds"] == 1 / 30
    roster = [[row[k] for k in ("key", "w", "h", "asset")] for row in data["roster"]]
    keys = [r[0] for r in roster]
    assert len(set(keys)) == len(keys) == 28
    result = {
        "sourceSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "roster": roster,
        "scale": data["geometry"]["scale"],
        "seed": data["seed"],
        "start": data["start"],
        "end": data["end"],
        "hz": 30,
        "arms": {},
    }
    for name, arm in data["arms"].items():
        previous = [None] * 28
        frames = []
        for idx, frame in enumerate(arm["frames"]):
            assert abs(frame["clock"] - (195 + idx / 30)) < 1e-8
            assert [a[0] for a in frame["actors"]] == keys
            changes = []
            for i, row in enumerate(frame["actors"]):
                record = row[1:]
                if record != previous[i]:
                    changes.append([i, *record])
                    previous[i] = record
            frames.append(changes)
        assert len(frames) == 181 and len(frames[0]) == 28
        exits = [
            {"clock": p["clock"], "phase": p["label"], "angles": p["hamster3"]}
            for p in arm["exits"]
        ]
        assert all(
            len(p["angles"]) == raw["counts"]["companion:hamster"]["3"]["384"]
            for p, raw in zip(exits, arm["exits"], strict=True)
        )
        assert len(exits[-1]["angles"]) == {"shipped": 1, "margin": 4}[name]
        result["arms"][name] = {
            "frames": frames,
            "exits": exits,
            "counts": arm["halfCountsByResident"],
            "phases": arm["phases"],
            "distance": arm["ownerDistanceCSS"],
            "nativeSHA256": arm["nativeSHA256"],
        }
    assert (
        data["summary"]["commonOpening"]
        and data["summary"]["commonPose"]
        and data["summary"]["marginRepeatedExactly"]
    )
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    a.output.write_text(
        json.dumps(pack(a.source), ensure_ascii=False, separators=(",", ":")) + "\n"
    )
