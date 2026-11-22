"""Continue from shared actor decisions before and after verified physical handoffs."""

import argparse
import copy
import gzip
import json
from pathlib import Path

from forest_continuation import check
from forest_results import v9


def prepare(tape, scene, probe, key, degrees):
    world = json.loads(scene.read_bytes())
    assert v9.sha(tape) == world["sourceSHA"]
    data = json.loads(gzip.decompress(tape.read_bytes()))
    phase = world["phases"][1]
    assert phase["label"] == "60"
    frame = next(fr for fr in data["trajectory"] if fr["clock"] == phase["clock"])
    before = phase["feet"]
    assert [[a[0], a[1], a[2]] for a in before] == [a[:3] for a in frame["actors"]]
    chosen = next(
        r
        for r in json.loads(probe.read_bytes())
        if r["key"] == key and r["degrees"] == degrees
    )
    assert (
        chosen["found"]
        and chosen["pair"]["curved"]
        and chosen["violations"] == 0
        and chosen["actual"] > 7.999
    )
    stages = chosen["pair"]["stages"]
    assert len({s["key"] for s in stages}) == len(stages) <= 2
    moved = {key} | {s["key"] for s in stages}
    assert {s["key"] for s in chosen["history"]} == moved
    after = copy.deepcopy(before)
    for k in moved:
        steps = [h for h in chosen["history"] if h["key"] == k]
        row = next(a for a in after if a[0] == k)
        row[1:3] = [steps[-1]["x"], steps[-1]["y"]]
    assert len([1 for a, b in zip(before, after) if a != b]) == len(moved)
    return dict(
        opening=str(tape.resolve()),
        before=before,
        after=after,
        provenance=dict(
            source=v9.sha(tape),
            phase_s=phase["clock"],
            probe=v9.sha(probe),
            scene=v9.sha(scene),
            owner=key,
            degrees=degrees,
            helperKeys=[s["key"] for s in stages],
            ownerDisplacementCss=chosen["actual"],
            safetyViolations=chosen["violations"],
            historicalCompleteState=False,
            commonDecisions="The historical opening's full 28 temperaments, next decision times and RNG",
        ),
    )


def service_pose(tape, report, scene=None):
    data = json.loads(gzip.decompress(tape.read_bytes()))
    experiment = json.loads(report.read_bytes())
    issue, observed = experiment["input"], experiment["observed"]
    if scene:
        world = json.loads(scene.read_bytes())
        assert v9.sha(tape) == world["sourceSHA"]
        phase = next(f for f in world["phases"] if f["clock"] == issue["clock"])
        frame = next(f for f in data["trajectory"] if f["clock"] == issue["clock"])
        before = [a[:5] for a in phase["feet"]]
        assert [a[:3] for a in before] == [a[:3] for a in frame["actors"]]
        provenance = dict(
            newShortGoal=issue["original"],
            degrees=issue["degrees"],
            scene=v9.sha(scene),
        )
    else:
        q = data["log"]["requests"][issue["index"]]
        assert (
            q["key"] == issue["key"]
            and q["clock"] == issue["clock"]
            and q["goal"] == issue["original"]
        )
        before = [a[:5] for a in q["peers"]]
        provenance = dict(request=issue["index"], historicalGoal=issue["original"])
    assert before == [a[:5] for a in issue["feet"]]
    assert (
        observed["pair"]["curved"]
        and observed["violations"] == 0
        and observed["gain"] > 0.75
        and observed["actual"] > 7.999
    )
    after = copy.deepcopy(before)
    helpers = [s["key"] for s in observed["pair"]["stages"]]
    moved = {issue["key"], *helpers}
    assert len(helpers) in (1, 2) and {h["key"] for h in observed["history"]} == moved
    for k in moved:
        end = [h for h in observed["history"] if h["key"] == k][-1]
        next(a for a in after if a[0] == k)[1:3] = [end["x"], end["y"]]
    return dict(
        opening=str(tape.resolve()),
        before=before,
        after=after,
        provenance=dict(
            source=v9.sha(tape),
            phase_s=issue["clock"],
            **provenance,
            probe=v9.sha(report),
            owner=issue["key"],
            helperKeys=helpers,
            ownerDisplacementCss=observed["actual"],
            gainToRecordedGoalCss=observed["gain"],
            safetyViolations=0,
            historicalCompleteState=False,
            commonDecisions="The historical opening's full 28 temperaments, next decision times and RNG",
        ),
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("base")
    p.add_argument("tape", type=Path)
    p.add_argument("scene", type=Path)
    p.add_argument("probe", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--game", type=Path, required=True)
    p.add_argument("--seconds", type=int, default=300)
    p.add_argument("--service-tape", type=Path)
    p.add_argument("--service-report", type=Path)
    p.add_argument(
        "--new-goal",
        help="Profile of the recorded scene for a new short native request",
    )
    p.add_argument("--interval", nargs=2, type=float, metavar=("START", "END"))
    p.add_argument("--only", choices=["baseline", "candidate", "candidate-repeat"])
    args = p.parse_args()
    if args.new_goal:
        witness = service_pose(args.tape, args.probe, args.scene)
        check(
            args.base,
            None,
            args.out,
            args.seconds,
            [args.new_goal],
            args.game,
            witness,
            only=args.only,
            interval=args.interval,
        )
        raise SystemExit(0)
    if args.service_tape and args.service_report:
        witness = service_pose(args.service_tape, args.service_report)
        check(
            args.base,
            None,
            args.out / "sekizou",
            args.seconds,
            ["390-214-0-fixed-1"],
            args.game,
            witness,
        )
        raise SystemExit(0)
    for key, deg in [("companion:cat_friend", 120), ("pet:dog", 180)]:
        witness = prepare(args.tape, args.scene, args.probe, key, deg)
        check(
            args.base,
            None,
            args.out / key.split(":")[-1],
            args.seconds,
            ["375-937-0-reference-1"],
            args.game,
            witness,
        )
