"""Verify original GitHub atlas ZIPs and repeatable native outputs from two Chromium versions."""

import argparse
import gzip
import hashlib
import json
import zipfile
from pathlib import Path


def read_case(content):
    return json.loads(gzip.decompress(content))


def verify(args):
    archives = []
    engines = set()
    replayed = 0
    household_points = 0
    for path in sorted(args.zips.glob("**/mobility-v13-atlas-*.zip")):
        region = path.stem.removeprefix("mobility-v13-atlas-")
        receipt = json.loads((args.ci / (region + "-receipt.json")).read_bytes())
        assert (
            receipt["region"] == region
            and receipt["digest"]
            == "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
        )
        local = 0
        with zipfile.ZipFile(path) as z:
            for member in z.namelist():
                if not member.endswith(".json.gz"):
                    continue
                canonical = z.read(member)
                assert canonical == (args.ci / member).read_bytes()
                native = read_case(canonical)
                other = read_case((args.repeat / member).read_bytes())
                assert native["region"] == region
                if other["engine"] == native["engine"]:
                    continue
                for field in (
                    "ground",
                    "allowed",
                    "cols",
                    "rows",
                    "scale",
                    "step",
                    "source",
                    "poseDigest",
                ):
                    assert other[field] == native[field], (member, field)
                for left, right in zip(native["frames"], other["frames"], strict=True):
                    for field in ("phase", "time", "actors", "passing"):
                        assert left[field] == right[field], (member, field)
                    household_points += len(left["actors"])
                for field in ("paint", "origin"):
                    assert native["geometry"][field] == other["geometry"][field]
                engines.update((other["engine"], native["engine"]))
                local += 1
        replayed += local
        archives.append(dict(**receipt, independentNativeReplays=local))
    assert len(archives) == 13 and replayed > 0
    return dict(
        run="https://github.com/Naoto214/naotocchi/actions/runs/45008918474",
        archives=archives,
        cases=260,
        independentNativeReplays=replayed,
        independentlyReplayedActorSnapshots=household_points,
        engines=sorted(engines),
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for k in ("ci", "repeat", "zips", "out"):
        p.add_argument("--" + k, type=Path, required=True)
    args = p.parse_args()
    result = verify(args)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(
        result["independentNativeReplays"],
        result["independentlyReplayedActorSnapshots"],
    )
