"""Verify native same-clock controls, repeated candidate outcomes and observed-yield footprints."""

from argparse import ArgumentParser
import gzip
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo
from forest_continuation import physical_digest
from forest_results import v9, attach_curves


def tape(path, seconds):
    encoded = path.read_bytes()
    wrapped = json.loads(gzip.decompress(encoded))
    native = wrapped["trajectory"]
    opening = wrapped["opening"]
    model = next(k for k in wrapped["sources"] if "production-model" in k)
    arm = model.removeprefix("home-production-model-mobility-").removesuffix(".js")
    trace = dict(arm=arm, seed=opening["seed"], log=native["log"])
    assert abs(native["state"]["clock"] - opening["clock"] - seconds) < 1e-6
    normals = [
        l
        for l in v9.legs(trace)
        if l["completed_normal"] and l["finish_s"] < seconds + 1e-6
    ]
    ids = [r["key"] for r in opening["actors"]]
    people = {k: sum(x["key"] == k for x in normals) for k in ids}
    sessions, _ = attach_curves(trace, cutoff=seconds + 1e-6)
    digest = hashlib.sha256(
        json.dumps(
            native, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()
    return dict(
        measures=dict(
            once=sum(v > 0 for v in people.values()),
            twice=sum(v > 1 for v in people.values()),
            both=sum(
                any(l["key"] == k and l["finish_s"] <= seconds / 2 for l in normals)
                and any(l["key"] == k and l["finish_s"] > seconds / 2 for l in normals)
                for k in ids
            ),
            normal=len(normals),
            distance_css=round(sum(l["css_distance"] for l in normals), 3),
            searches=len(sessions),
            plans=sum(s["found"] for s in sessions),
            physicalPlans=sum(
                any(h["native_steps"] for h in s["helpers"]) for s in sessions
            ),
            owners=sum(s["owner_strict_normal"] for s in sessions),
        ),
        people=people,
        executedCurves=[
            q for q in sessions if any(h["native_steps"] for h in q["helpers"])
        ],
        record=native,
        rawSHA=v9.sha(path),
        traceSHA=digest,
        physicalSHA=physical_digest(native),
        opening=opening,
        pose=wrapped.get("posedFeet"),
        model=wrapped["sources"][model],
        endingRNG=native["state"]["seed"],
    )


def divergence(before, after):
    logs = [d["record"]["log"] for d in [before, after]]

    def request(q):
        return {
            k: q[k]
            for k in (
                "clock",
                "key",
                "goal",
                "source",
                "planned",
                "accepted",
                "target",
                "route",
            )
        }

    first = next(
        (
            i
            for i, (a, b) in enumerate(zip(logs[0]["requests"], logs[1]["requests"]))
            if request(a) != request(b)
        ),
        None,
    )
    return dict(
        identicalRequestPrefix=first
        if first is not None
        else min(len(l["requests"]) for l in logs),
        baselineRequests=len(logs[0]["requests"]),
        candidateRequests=len(logs[1]["requests"]),
        firstDifferent=None
        if first is None
        else [request(log["requests"][first]) for log in logs],
        firstCandidateSearch=[
            e
            for e in logs[1].get("curvedYields", [])
            if e["type"] in ("search", "plan")
        ][:2],
    )


def controls(raw, out, guarded=False):
    findings = []
    studies = [
        (
            "whole-native-state",
            raw / "same-clock",
            ["375-937-0-fixed-1", "320-214-0-reference-1"],
        ),
        ("whole-native-state", raw / "same390", ["390-937-0-reference-1"]),
        (
            "cat-footprint",
            raw / "curve-footprint" / "cat_friend",
            ["375-937-0-reference-1"],
        ),
        ("dog-footprint", raw / "curve-footprint" / "dog", ["375-937-0-reference-1"]),
        (
            "statue-footprint",
            raw / "curve-footprint" / "sekizou",
            ["390-214-0-fixed-1"],
        ),
    ]
    if guarded:
        studies = [
            (
                "watcher-short-goal",
                raw / "final-footprint" / "watcher",
                ["390-937-0-fixed-1"],
            ),
            (
                "otter-short-goal",
                raw / "final-footprint" / "otter",
                ["375-937-0-reference-1"],
            ),
        ]
    for kind, directory, profiles in studies:
        for profile in profiles:
            seconds = 600 if kind == "whole-native-state" else 300
            group = {
                k: tape(directory / (profile + "-" + k + ".json.gz"), seconds)
                for k in ("baseline", "candidate", "candidate-repeat")
            }
            before, after = group["baseline"], group["candidate"]
            assert (
                before["opening"]
                == after["opening"]
                == group["candidate-repeat"]["opening"]
            )
            assert (
                after["traceSHA"] == group["candidate-repeat"]["traceSHA"]
                and after["pose"] == group["candidate-repeat"]["pose"]
            )
            witness = None
            if kind != "whole-native-state":
                witness = json.loads(
                    (directory / "forest-same-clock.json").read_bytes()
                )[0]["witness"]
                moved = {
                    a[0]
                    for a, b in zip(before["pose"], after["pose"], strict=True)
                    if a != b
                }
                assert moved == {witness["owner"], *witness["helperKeys"]}
            deltas = {k: after["people"][k] - n for k, n in before["people"].items()}
            findings.append(
                dict(
                    kind=kind,
                    profile=profile,
                    seconds=seconds,
                    seed=before["opening"]["seed"],
                    witness=witness,
                    before=before["measures"],
                    after=after["measures"],
                    more=sum(v > 0 for v in deltas.values()),
                    less=sum(v < 0 for v in deltas.values()),
                    unchanged=sum(v == 0 for v in deltas.values()),
                    pairs={
                        k: [before["people"][k], after["people"][k]] for k in deltas
                    },
                    repeatedExactly=True,
                    subsequentCurves={
                        "before": before["executedCurves"],
                        "after": after["executedCurves"],
                    },
                    firstNativeDivergence=divergence(before, after)
                    if not witness
                    else None,
                    sources={
                        k: {
                            f: r[f]
                            for f in (
                                "rawSHA",
                                "model",
                                "traceSHA",
                                "physicalSHA",
                                "endingRNG",
                            )
                        }
                        for k, r in group.items()
                    },
                )
            )
    file = "forest-final-footprints.json" if guarded else "forest-controlled.json"
    (out / file).write_text(json.dumps(findings, ensure_ascii=False, indent=2) + "\n")
    print("Verified", len(findings), "same-clock comparisons and their exact repeats")


def background(raw, out, guarded=False):
    series = "guard" if guarded else "v2"
    cases = []
    for p in sorted((raw / "clock-standards").glob("*-baseline.json.gz")):
        profile = p.name.removesuffix("-baseline.json.gz")
        d = raw / (
            {
                "375-937-0-fixed-1": f"{series}-375",
                "320-214-0-reference-1": f"{series}-320",
            }.get(profile, f"{series}-other")
        )
        x = tape(p, 600)
        y = tape(d / (profile + "-candidate.json.gz"), 600)
        assert x["opening"] == y["opening"]
        repeated = d / (profile + "-candidate-repeat.json.gz")
        if repeated.exists():
            assert y["traceSHA"] == tape(repeated, 600)["traceSHA"]
        cases.append(
            dict(
                profile=profile,
                seed=x["opening"]["seed"],
                v11=x["measures"],
                v12=y["measures"],
                identical=x["physicalSHA"] == y["physicalSHA"],
                refSHA=x["model"],
                candidateSHA=y["model"],
                referenceSHA=x["rawSHA"],
                rawSHA=y["rawSHA"],
                repeatSHA=v9.sha(repeated) if repeated.is_file() else None,
                behaviorSHA=[x["physicalSHA"], y["physicalSHA"]],
                exactRepeatedTrace=repeated.is_file(),
                divergence=divergence(x, y),
            )
        )
    assert len(cases) == 8
    name = "forest-background.json" if guarded else "forest-background-eight.json"
    (out / name).write_text(json.dumps(cases, indent=2, ensure_ascii=False) + "\n")
    print("Verified", len(cases), "full 600s V11-foot and final V12 native pairs")


def archive_fixed_clock(raw, out):
    results = json.loads((out / "forest-controlled.json").read_bytes())
    results.extend(json.loads((out / "forest-final-footprints.json").read_bytes()))
    hashes = {r["rawSHA"] for case in results for r in case["sources"].values()}
    for name in ("forest-background.json", "forest-background-eight.json"):
        for case in json.loads((out / name).read_bytes()):
            hashes.update(
                filter(None, (case["referenceSHA"], case["rawSHA"], case["repeatSHA"]))
            )
    folders = (
        "same-clock",
        "same390",
        "curve-footprint",
        "final-footprint",
        "clock-remaining",
        "v2-375",
        "v2-320",
        "v2-other",
        "guard-375",
        "guard-320",
        "guard-other",
    )
    files = {}
    for folder in folders:
        for p in sorted((raw / folder).rglob("*.json.gz")):
            key = v9.sha(p)
            if key in hashes:
                files.setdefault(key, p)
    missing = hashes - set(files)
    if missing:
        raise ValueError(
            f"Native full-state recordings missing for {len(missing)} hashes"
        )
    target = out / "forest-fixed-clock.zip"
    with ZipFile(target, "w") as archive:
        for key, p in sorted(files.items()):
            archive.writestr(ZipInfo(p.relative_to(raw).as_posix()), p.read_bytes())
        index = {p.relative_to(raw).as_posix(): k for k, p in sorted(files.items())}
        archive.writestr(ZipInfo("sha256.json"), json.dumps(index, indent=2) + "\n")
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        for name, key in json.loads(archive.read("sha256.json")).items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == key
    print(
        "Verified",
        len(hashes),
        "unique recordings in",
        target,
        "SHA-256",
        v9.sha(target),
    )


if __name__ == "__main__":
    p = ArgumentParser(description=__doc__)
    p.add_argument("raw", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument(
        "--scope",
        choices=["controlled", "background", "eight", "archive", "final-poses", "all"],
        default="all",
    )
    a = p.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    if a.scope in ("controlled", "all"):
        controls(a.raw, a.output)
    if a.scope in ("final-poses", "all"):
        controls(a.raw, a.output, guarded=True)
    if a.scope in ("background", "all"):
        background(a.raw, a.output, guarded=True)
    if a.scope in ("eight", "all"):
        background(a.raw, a.output, guarded=False)
    if a.scope in ("archive", "all"):
        archive_fixed_clock(a.raw, a.output)
