"""Collect the local causal controls and their source hashes without duplicating full actor traces in Git."""

import argparse
import hashlib
import json
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("data", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    sources = []

    def fetch(name):
        raw = (args.data / name).read_bytes()
        sources.append(dict(filename=name, sha256=hashlib.sha256(raw).hexdigest()))
        return json.loads(raw)

    events = []
    for name in [
        "foot-geometry2-forest.json",
        "foot-geometry-final-forest.json",
        "foot-geometry-final-mountain.json",
    ]:
        for trial in fetch(name):
            for r in trial["results"]:
                moves = [
                    dict(
                        key=q["key"],
                        before=q["before"],
                        after=q["native"],
                        distanceCSS=q["nativeShift"],
                    )
                    for q in r["points"]
                    if q["nativeShift"] > 1e-5
                ]
                simplified = dict(
                    region=trial["region"],
                    arm=trial["arm"],
                    clock=r["clock"],
                    phase=r["phase"],
                    moves=moves,
                    exactEffective=r["exactEffectiveGeometry"],
                    exactConstructor=r["exactConstructor"],
                    keptWouldLose=r["oldExitsLostByHolding"],
                    reseatedWouldLose=r["oldExitsLostByReseating"],
                    old=r["old"],
                    held=r["held"],
                    native=r["native"],
                    reason=r["reason"],
                )
                if (
                    "strictLongBearings96" in r["old"]
                    or r["phase"] == "unforced-ordinary"
                    and abs(r["clock"] - 300) < 0.001
                ):
                    events.append(simplified)
    controls = []
    for row in fetch("foot-geometry-controls.json"):
        assert row["stationary"]["strictCanKeep"] and not row["resize"]["strictCanKeep"]
        controls.append(
            dict(
                region=row["region"],
                sameView=row["stationary"]["reason"],
                realResize=row["resize"]["reason"],
            )
        )
    proof = fetch("foot-matrix-reflow.json")
    assert max(proof["finalError"].values()) < 1e-6
    args.out.write_text(
        json.dumps(
            dict(
                sources=sources,
                units="CSS pixels for screen distances; native model coordinates for each foot",
                confirmedFoothold=proof["measured"],
                archivedForestFinalError=proof["finalError"],
                events=events,
                controls=controls,
            ),
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
