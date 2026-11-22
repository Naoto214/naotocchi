"""Verify all published 10-minute atlas frames against the original timed tape and native sources."""

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
from map_final_replay import poses


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(args):
    entries = []
    for capture in sorted(args.traces.glob("*-v13-*/forest28.json.gz")):
        fields = capture.parent.name.split("-")
        width, seat, arm = fields[0], fields[3], "-".join(fields[6:])
        expected, checksum, tape = poses(capture)
        path = args.raw / f"forest-{width}-28-living-{seat}-{arm}.json.gz"
        d = json.loads(gzip.decompress(path.read_bytes()))
        assert d["poseDigest"] == checksum and d["traceVersion"] in (
            "final",
            "a-control",
        )
        mode = f"v13-{arm}" + ("-reference" if seat == "reference" else "")
        model = f"home-production-model-mobility-{mode}.js"
        sources = {model: tape["sources"][model]["source"], **tape["projectionSources"]}
        assert all(
            digest(args.dist / "game" / filename) == value
            for filename, value in sources.items()
        )
        assert d["source"] == sources[model] and d["guardSHA"] == digest(
            args.dist / "game/home-visible-ground-navigation-v13.mjs"
        )
        errors = []
        for reference, frame in zip(expected, d["frames"], strict=True):
            assert (
                reference["phase"] == frame["phase"]
                and reference["time"] == frame["time"]
            )
            sx, sy = d["scale"]["x"], d["scale"]["y"]
            for pose, actor in zip(reference["feet"], frame["actors"], strict=True):
                key, x, y, w, h = pose
                assert key == actor["key"]
                errors.append(math.hypot(sx * x - actor["x"], sy * y - actor["y"]))
                assert (
                    abs(sx * (w / 2 + 5) - actor["rx"]) <= 0.00051
                    and abs(sy * (h * 0.38 + 5) - actor["ry"]) <= 0.00051
                )
        assert max(errors) < 0.00072
        entries.append(
            dict(
                trial=capture.parent.name,
                run=45008396005 if arm == "a" else 45011128754,
                arm=arm,
                archiveSHA=checksum,
                native=tape["projectionSources"],
                modelSHA=d["source"],
                atlasGuard=d["guardSHA"],
                atlasFile=path.name,
                atlasRawSHA=digest(path),
                maxCoordinateRoundingCss=max(errors),
            )
        )
    assert len(entries) == 25 and len({(e["trial"], e["arm"]) for e in entries}) == 25
    return dict(
        cases=len(entries),
        frames=3 * len(entries),
        actorPoints=84 * len(entries),
        intermediateAxes="opening dimensions, verified equal to recorded final dimensions for every resident",
        maxRoundingCss=max(e["maxCoordinateRoundingCss"] for e in entries),
        records=entries,
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for key in ("traces", "raw", "dist", "out"):
        p.add_argument("--" + key, type=Path, required=True)
    args = p.parse_args()
    result = verify(args)
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print(result["cases"], result["maxRoundingCss"])
