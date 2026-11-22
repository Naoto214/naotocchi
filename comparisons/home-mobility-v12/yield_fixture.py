"""Export the 375 CSS px household and its physically replayed directions from PR #581."""

import argparse
import json
import math
from pathlib import Path


def make(captures):
    here = Path(__file__).resolve().parent
    archive = here.parent / "home-mobility-v11/evidence"
    raw = json.loads((captures / "375-v10-reference.json").read_text())
    source = json.loads((archive / "space-curved-control.json").read_text())[0]
    straight = next(
        r
        for r in json.loads((archive / "space-sequential.json").read_text())
        if r["width"] == 375
        and r["label"] == "opening"
        and r["key"] == "companion:tanuki"
    )
    assert raw["sourceSHA"] == source["source"] == straight["source"]
    assert raw["phases"][0]["clock"] == 0
    assert len(source["witnesses"]) == len(source["nativeStepper"]) == 23
    audit = json.loads((here / "evidence/space-fairness-375.json").read_text())
    assert audit["sourceSHA"] == raw["sourceSHA"]
    last = {r["degrees"]: r["finalLost8"] for r in audit["routes"]}
    minute = raw["phases"][1]
    assert minute["label"] == "60"

    def exits(phase):
        return {r["key"]: len(r["result"][1]["safe"]) for r in phase["rays"]}

    stone_source = json.loads((here / "evidence/curve-statue-390.json").read_text())
    recorded, near = stone_source["replays"]
    assert recorded["index"] == 404 and recorded["feet"] == near["feet"]
    assert near["radius"] == 8.01 and abs(near["degrees"] - 160) < 1e-9
    stone_geometry = json.loads((captures / "390-v10.json").read_text())
    stone = {
        "key": recorded["key"],
        "feet": [p[:5] for p in recorded["feet"]],
        "goalPoint": recorded["original"],
        "width": 390,
        "height": 792,
        "seed": 214,
        "clock": recorded["clock"],
        "scale": stone_geometry["geometry"]["scale"],
        "source": stone_source["provenance"]["sha256"],
        "nearDegrees": near["degrees"],
        "nearRadius": near["radius"],
    }
    capture = json.loads((captures / "390-v10.json").read_text())
    trace = json.loads((here / "evidence/curve-watcher-390.json").read_text())
    origin = trace["provenance"]
    phase = capture["phases"][origin["phase"]]
    witness = trace["replays"][0]
    assert phase["feet"] == witness["feet"] and phase["clock"] == origin["clock"]
    assert phase["label"] == "120" and capture["sourceSHA"] == origin["archiveSHA256"]
    key = witness["key"]
    goal = witness["original"]
    owner = next(row for row in phase["feet"] if row[0] == key)
    scale = capture["geometry"]["scale"]
    dx, dy = (goal[0] - owner[1]) * scale["x"], (goal[1] - owner[2]) * scale["y"]
    assert abs(math.hypot(dx, dy) - 8) < 1e-8
    watcher = {
        "key": key,
        "feet": phase["feet"],
        "width": 390,
        "height": 792,
        "seed": capture["seed"],
        "clock": phase["clock"],
        "scale": scale,
        "source": capture["sourceSHA"],
        "goalPoint": goal,
        "nearDegrees": math.degrees(math.atan2(dy, dx)),
        "nearRadius": 8,
        "exits": {
            row["key"]: [len(distance["safe"]) for distance in row["result"]]
            for row in phase["rays"]
        },
    }
    return {
        "watcher": watcher,
        "stone": stone,
        "stone375": json.loads((here / "evidence/yield-stone-375.json").read_text()),
        "openingExits": exits(raw["phases"][0]),
        "minuteExits": exits(minute),
        "minuteFeet": minute["feet"],
        "minuteClock": minute["clock"],
        "lastExits": last,
        "source": raw["sourceSHA"],
        "width": 375,
        "height": 792,
        "seed": raw["seed"],
        "scale": raw["geometry"]["scale"],
        "feet": raw["phases"][0]["feet"],
        "key": source["key"],
        "straightExamples": straight["examples"],
        "routes": source["witnesses"],
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    args.out.write_text(
        json.dumps(make(args.captures), ensure_ascii=False, separators=(",", ":"))
        + "\n"
    )
