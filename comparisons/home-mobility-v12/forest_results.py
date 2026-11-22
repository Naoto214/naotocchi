"""Validate 28-resident native records and compare complete ten-minute windows."""

import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import sys

V11 = Path(__file__).resolve().parents[1] / "home-mobility-v11"
sys.path.insert(0, str(V11))
from forest_collect import inspect, v9, write_csv

ARMS = ("v10", "archived-foot", "fresh-foot", "v12")
PROFILES = ("width", "seed", "order", "layout", "repeat")


def read(path):
    return json.loads(path.read_bytes())


def attach_curves(d, cutoff=600):
    """A proposal, a physical helper step and an owner's completed walk are separate events."""
    events = [e for e in d["log"].get("curvedYields", []) if e["clock"] <= cutoff]
    sessions, active = [], {}
    for event in events:
        kind, owner = event["type"], event["owner"]
        k = (event["source"], owner)
        if kind == "search":
            item = {
                "owner": owner,
                "source": event["source"],
                "s": event["clock"],
                "events": [],
            }
            active[k] = item
            sessions.append(item)
        if k not in active:
            raise ValueError(f"{kind} without corresponding search for {k}")
        active[k]["events"].append(event)
    native = v9.legs(d)
    people = defaultdict(Counter)
    for i, run in enumerate(sessions):
        limit = next(
            (
                r["s"]
                for r in sessions[i + 1 :]
                if r["owner"] == run["owner"] and r["source"] == run["source"]
            ),
            cutoff,
        )
        stages = [e for e in run["events"] if e["type"] == "start"]
        plans = [e for e in run["events"] if e["type"] == "plan"]
        owner_events = [e for e in run["events"] if e["type"] == "owner"]
        assert len(plans) <= 1 and len(owner_events) <= 1
        run["found"] = bool(plans and plans[0]["found"])
        run["completed_search"] = bool(plans)
        run["stages_requested"] = len(plans[0].get("stages", [])) if run["found"] else 0
        run["stages_started"] = len(stages)
        run["owner_command"] = bool(owner_events and owner_events[0]["accepted"])
        run["helpers"] = []
        recipient = people[run["owner"]]
        recipient["curve_searches"] += 1
        recipient["curve_plans"] += run["found"]
        for j, e in enumerate(stages):
            aid = e["helper"]
            stop = (
                stages[j + 1]["clock"]
                if j + 1 < len(stages)
                else (owner_events[0]["clock"] if owner_events else limit)
            )
            stage = e["stages"][e["stage"]]
            assert stage["key"] == aid and 1 <= len(e["stages"]) <= 2
            # A generator can be interrupted. Require this helper to actually
            # leave this captured foot for this recipient at this stage.
            motions = [
                leg
                for leg in native
                if leg["key"] == aid
                and leg["source"] == "yield"
                and leg["helper_for"] == run["owner"]
                and e["clock"] - 1e-8 <= leg["start_s"] <= stop + 1e-8
                and abs(leg["from_x"] - stage["from"]["x"]) < 1e-6
                and abs(leg["from_y"] - stage["from"]["y"]) < 1e-6
            ]
            leg = motions[0] if motions else None
            arrived = bool(
                leg and leg["status"] == "arrival" and leg["finish_s"] <= cutoff
            )
            remaining = (
                math.hypot(
                    leg["end_x"] - stage["to"]["x"], leg["end_y"] - stage["to"]["y"]
                )
                if leg
                else None
            )
            next_own = next(
                (
                    l
                    for l in native
                    if leg
                    and l["key"] == aid
                    and l["completed_normal"]
                    and l["start_s"] >= leg["last_step_s"]
                    and l["finish_s"] <= cutoff
                ),
                None,
            )
            wait = (
                None
                if not next_own
                else round(next_own["finish_s"] - leg["last_step_s"], 3)
            )
            window = None if not leg else round(cutoff - leg["last_step_s"], 3)
            run["helpers"].append(
                dict(
                    key=aid,
                    bend="via" in stage,
                    at_s=e["clock"],
                    from_xy=stage["from"],
                    via=stage.get("via"),
                    to=stage["to"],
                    native_steps=leg["steps"] if leg else 0,
                    walked_css=leg["css_distance"] if leg else 0,
                    reached=arrived,
                    exact_endpoint=bool(arrived and remaining < 1e-6),
                    endpoint_error_terrain_px=round(remaining, 6)
                    if remaining is not None
                    else None,
                    observed_remaining_s=window,
                    next_own_normal_after_s=wait,
                )
            )
            helper = people[aid]
            helper["curve_helper_started"] += 1
            helper["curve_helper_walked"] += bool(leg)
            helper["curve_helper_reached"] += arrived
            helper["curve_helper_own_after"] += next_own is not None
            helper["curve_helper_no_own_60"] += bool(
                window is not None and window >= 60 and (wait is None or wait > 60)
            )
        assert len({h["key"] for h in run["helpers"]}) == len(run["helpers"]) <= 2
        owner_leg = None
        if run["owner_command"]:
            e = owner_events[0]
            rq = next(
                (
                    idx
                    for idx, q in enumerate(d["log"]["requests"])
                    if q["key"] == run["owner"]
                    and q["source"] == run["source"]
                    and q["accepted"]
                    and abs(q["clock"] - e["clock"]) < 1e-8
                    and q["goal"] == [e["goal"]["x"], e["goal"]["y"]]
                ),
                None,
            )
            if rq is not None:
                owner_leg = next(
                    (
                        l
                        for l in native
                        if l["request"] == rq and l["start_s"] <= cutoff
                    ),
                    None,
                )
        run["owner_last_foot"] = (
            [owner_leg["end_x"], owner_leg["end_y"]] if owner_leg else None
        )
        run["owner_last_step_s"] = owner_leg["last_step_s"] if owner_leg else None
        run["owner_steps"] = owner_leg["steps"] if owner_leg else 0
        run["owner_walked_css"] = owner_leg["css_distance"] if owner_leg else 0
        run["owner_strict_normal"] = bool(
            owner_leg
            and owner_leg["completed_normal"]
            and owner_leg["finish_s"] <= cutoff
        )
        recipient["curve_owner_normal"] += run["owner_strict_normal"]
    return sessions, people


CURVE_KEYS = (
    "curve_searches",
    "curve_plans",
    "curve_owner_normal",
    "curve_helper_started",
    "curve_helper_walked",
    "curve_helper_reached",
    "curve_helper_own_after",
    "curve_helper_no_own_60",
)


def compare(args):
    expected = {
        (str(r["run"]), r["case"]): r
        for r in read(V11 / "evidence/forest-receipts.json")
    }
    plans = [
        (args.archived, "v10", "v10"),
        (args.archived, "v11-foot", "archived-foot"),
        (args.raw, "v11-foot", "fresh-foot"),
        (args.raw, "v12", "v12"),
    ]
    cells, people, syncs, searches, receipts = [], [], [], [], []
    for base, policy, tag in plans:
        for receipt_path in sorted(base.glob("[0-9]*/*/receipt.json")):
            info = read(receipt_path)
            if info["case"].split("-", 5)[-1] != policy:
                continue
            if (
                tag == "v12"
                and args.candidate_run
                and info["run"] != args.candidate_run
            ):
                continue
            path = receipt_path.parent / "forest28.json.gz"
            assert (
                info["complete"]
                and v9.sha(receipt_path.parent / "runner.zip") == info["sha256"]
            )
            if base == args.archived:
                assert (
                    expected[str(info["run"]), info["case"]]["sha256"] == info["sha256"]
                )
            cell, rows, shifts, changed_goals = inspect(path)
            assert not changed_goals and not cell["replaced_proposals"], (
                "A prechanged wandering goal was included"
            )
            d = v9.load(path)
            if args.game:
                for name, hashes in d["sources"].items():
                    candidates = [args.game / name, args.game / "beauty" / name]
                    file = next((f for f in candidates if f.is_file()), None)
                    assert file and v9.sha(file) == hashes["source"], (
                        info["case"],
                        name,
                        "wrong source",
                    )
            if tag == "v12":
                assert d.get("projectionSources"), (
                    "Native V12 projection modules missing"
                )
                if args.game:
                    for name, expected_sha in d["projectionSources"].items():
                        assert v9.sha(args.game / name) == expected_sha, (
                            name,
                            "cross-build projection",
                        )
            sid = info["case"].rsplit("-" + policy, 1)[0]
            meta = dict(
                profile=sid,
                cohort=tag,
                workflow_run=info["run"],
                commit=info["commit"],
                artifact=info["artifact"],
            )
            receipts.append(
                {**meta, **{k: info[k] for k in ("case", "sha256", "bytes")}}
            )
            cell.update(meta)
            cell["projection_sources"] = json.dumps(
                d.get("projectionSources", {}), sort_keys=True
            )
            cases, by_actor = attach_curves(d)
            for event in cases:
                event.update(meta)
            searches.extend(cases)
            end = d["log"].get("latestReflow") or {}
            for r in rows:
                r.update(meta)
                own = by_actor[r["key"]]
                r.update({s: own[s] for s in CURVE_KEYS})
                r["reflow_decisions"] = end.get(r["key"], {}).get("events", 0)
                r["reflow_moves"] = end.get(r["key"], {}).get("moves", 0)
            active = [s for s in cases if any(h["native_steps"] for h in s["helpers"])]
            cell.update(
                curve_searches=len(cases),
                finished_searches=sum(x["completed_search"] for x in cases),
                curve_plans=sum(x["found"] for x in cases),
                curve_starts=sum(bool(x["helpers"]) for x in cases),
                assistants_physically_walked=len(active),
                assisted_owner_normals=sum(x["owner_strict_normal"] for x in active),
                curve_one_stage=sum(x["stages_requested"] == 1 for x in cases),
                curve_two_stages=sum(x["stages_requested"] == 2 for x in cases),
                affected_helpers=len(
                    {
                        h["key"]
                        for x in active
                        for h in x["helpers"]
                        if h["native_steps"]
                    }
                ),
                helper_moved_without_owner_normal=sum(
                    not x["owner_strict_normal"] for x in active
                ),
                all_yield_steps=sum(int(r["yields_performed"]) for r in rows),
                normal_after_yield=sum(int(r["self_normal_after_yield"]) for r in rows),
                yields_received=sum(int(r["help_offers_received"]) for r in rows),
                blocked_above_180=sum(int(r["episodes_over_180"]) for r in rows),
            )
            for s, trace in zip(shifts, d["log"]["syncs"], strict=True):
                s.update(meta)
                reason = trace.get("reflow") or {}
                s["reason"] = reason.get("reason", "")
            people.extend(rows)
            cells.append(cell)
            syncs.extend(shifts)
    groups = defaultdict(list)
    for c in cells:
        groups[c["profile"]].append(c)
    for key, group in groups.items():
        assert len({c["cohort"] for c in group}) == len(group), ("duplicate", key)
        assert len({c["initial_sha256"] for c in group}) == 1, ("unequal opening", key)
        if args.complete:
            assert {c["cohort"] for c in group} == set(ARMS), key
    if args.complete:
        assert (
            len(groups) == 8
            and len(people) == 896
            and all(
                float(c["wall_s"]) >= 600 and float(c["model_s"]) >= 600 for c in cells
            )
        )
        assert (
            len({c["browser"] for c in cells if c["cohort"] in ("fresh-foot", "v12")})
            == 1
        )
    args.out.mkdir(parents=True, exist_ok=True)
    for name, rows in (
        ("cases", cells),
        ("residents", people),
        ("foot-changes", syncs),
    ):
        write_csv(args.out / ("forest-" + name + ".csv"), rows)
    for name, data in (("curve-searches", searches), ("receipts", receipts)):
        (args.out / ("forest-" + name + ".json")).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        )
    print(
        "Certified native households",
        len(cells),
        "residents",
        len(people),
        "foot changes",
        len(syncs),
        "curve search lifecycles",
        len(searches),
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    for k in ("archived", "raw", "out"):
        p.add_argument(k, type=Path)
    p.add_argument(
        "--game",
        type=Path,
        help="verify native script digests against the owner game directory",
    )
    p.add_argument("--candidate-run", type=int)
    p.add_argument("--complete", action="store_true")
    compare(p.parse_args())
