"""Verify all native captures and join the same residents across four mobile widths."""

import argparse
import csv
import gzip
import hashlib
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "home-mobility-v10"))
from forest_metrics import input_rows, refusal_intervals, v9


def digest(data):
    return hashlib.sha256(
        json.dumps(
            data, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()


def distance(a, b, scale):
    return math.hypot((a[0] - b[0]) * scale[0], (a[1] - b[1]) * scale[1])


def csv_rows(path):
    with path.open() as f:
        return list(csv.DictReader(f))


def write_csv(path, rows):
    if rows:
        with path.open("w") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)


def inspect(path):
    width, seed, order, layout, repeat, policy = path.parent.name.split("-", 5)
    profile = dict(
        width=int(width),
        seed=int(seed),
        order=int(order),
        layout=layout,
        repeat=int(repeat),
    )
    d = v9.load(path)
    arm = (
        policy
        if layout == "fixed"
        else ("v9-seats" if policy == "v9" else policy + "-reference")
    )
    assert (d["width"], d["seed"], d["order"], d["arm"]) == (
        int(width),
        int(seed),
        int(order),
        arm,
    )
    assert (
        not d["errors"]
        and d["wallSeconds"] >= 600
        and d["baseline"]["modelSeconds"] >= 600
    )
    assert all(
        len(s["actors"]) == 28 and s["visible"] == "visible" and not s["paused"]
        for s in d["trajectory"]
    )
    extra_path = path.parent / "rays-16.json"
    checked16 = {}
    if extra_path.exists():
        extra = v9.load(extra_path)
        assert extra["recordSHA256"] == v9.sha(path)
        checked16 = {(m["phase"], m["key"]): m for m in extra["observations"]}
    roster = d["initial"]["actors"]
    # At clock zero all entry points must have identical feet, sizes, routes,
    # chosen roles and random-generator state. Later autonomous choices may differ.
    signature = digest(
        [
            d["initial"]["seed"],
            [
                [
                    a.get(k)
                    for k in (
                        "key",
                        "kind",
                        "x",
                        "y",
                        "w",
                        "h",
                        "temperament",
                        "nextAt",
                        "lastWalk",
                        "activity",
                        "after",
                        "source",
                        "target",
                        "route",
                        "manualUntil",
                        "direction",
                        "faceKey",
                        "recent",
                    )
                ]
                for a in roster
            ],
        ]
    )
    opening = input_rows(path.parent / "touch-initial-checkpoint.json", d, d["initial"])
    aged = input_rows(path.parent / "touch-checkpoint.json", d, d["checkpoint"])
    for snap in ("touch-initial-checkpoint.json", "touch-checkpoint.json"):
        input_hashes = v9.load(path.parent / snap)["arms"][arm]["sources"]
        for name, hashes in d["sources"].items():
            assert (
                name in input_hashes
                and hashes["source"] == input_hashes[name]["source"]
            ), (arm, snap, name, "source differs")
    rays = v9.load(path.parent / "directions.json.gz")
    assert rays["input"] == v9.sha(path)
    geometry = {
        (r["phase"], r["key"]): r["geometry"]
        for r in rays["observations"]
        if r["phase"] != "refusal"
    }
    refused_rays = defaultdict(list)
    for item in rays["observations"]:
        if item["phase"] == "refusal":
            q = d["log"]["requests"][item["request"]]
            assert q["key"] == item["key"] and q["planned"] and not q["accepted"]
            if q["clock"] <= 600:
                refused_rays[q["key"]].append(item["geometry"])
    restore = v9.load(path.parent / "restore.json")
    assert (
        len(restore["roster"]) == 28
        and restore["nativeRevisionAfter"] >= restore["nativeRevisionBefore"]
    )
    rows = csv_rows(path.parent / "residents.csv")
    assert len(rows) == 28 and len({r["key"] for r in rows}) == 28
    legs = v9.legs(d)
    proposals = [x for x in d["log"].get("proposals", []) if x["clock"] <= 600]
    syncs = d["log"]["syncs"]
    budget = {(t, k) for t, k in d["log"].get("budget", [])}
    people = []
    shift_rows = []
    changed_rows = {}
    for p in proposals:
        if p["raw"] == p["chosen"]:
            continue
        start, scale = p["from"], p["scale"]

        def bearing(v):
            return round(
                math.degrees(
                    math.atan2(
                        (v[1] - start[1]) * scale[1], (v[0] - start[0]) * scale[0]
                    )
                ),
                2,
            )

        changed_rows[p["key"], p["clock"]] = dict(
            **profile,
            resident=p["key"],
            game_s=round(p["clock"], 3),
            desired_css=round(distance(start, p["raw"], scale), 3),
            desired_deg=bearing(p["raw"]),
            chosen_css=round(distance(start, p["chosen"], scale), 3),
            chosen_deg=bearing(p["chosen"]),
            arrivals=[],
        )

    for s in syncs:
        ink = s["ink"] or {}
        stable = (
            s["sameBody"] and s["sameRegion"] and s["sameProjection"] and s["sameSize"]
        )
        replaced = (
            stable
            and ink.get("sameAsset")
            and ink.get("sameExtentInputs")
            and ink.get("sameNode") is False
        )
        shift_rows.append(
            dict(
                **profile,
                policy=policy,
                key=s["key"],
                clock=s["clock"],
                css=s["distanceCss"],
                from_x=s["from"][0],
                from_y=s["from"][1],
                to_x=s["to"][0],
                to_y=s["to"][1],
                same_projection=bool(s["sameProjection"]),
                same_body=bool(s["sameBody"]),
                replacement_only=int(bool(replaced)),
                prior_ink=ink.get("hadInk"),
                current_ink=ink.get("hasInk"),
                gate="/".join(s["gate"] or []),
            )
        )
    for r in rows:
        k = r["key"]
        normal = [
            l
            for l in legs
            if l["key"] == k and l["completed_normal"] and l["finish_s"] <= 600
        ]
        assert len(normal) == int(r["normal_count_cutoff"]) and len(
            [l for l in normal if l["finish_s"] <= 300]
        ) == int(r["normal_first_half"])
        own = [
            l
            for l in legs
            if l["key"] == k and l["source"] == "ambient" and l["start_s"] <= 600
        ]
        requests = [
            q
            for q in d["log"]["requests"]
            if q["key"] == k and q["source"] == "ambient" and q["clock"] <= 600
        ]
        failed = [
            (q["clock"], "refused")
            for q in requests
            if q["planned"] and not q["accepted"]
        ]
        choices = [
            (
                t,
                "budget"
                if (t, k) in budget
                else ("voluntary" if "budget" in d["log"] else "idle_choice"),
            )
            for t, key, n in d["log"]["choices"]
            if key == k and n in ("turn", "look", "sit", "rest") and t <= 600
        ]
        episodes = refusal_intervals(
            [(t, "refusal") for t, _ in failed]
            + [(l["start_s"], "own_step") for l in own]
            + choices,
            600,
        )
        ended = Counter(e[2] for e in episodes)
        failed_geometry = refused_rays[k]
        assert len(failed_geometry) == len(failed)
        stranded = sum(not any(g["reachable"].values()) for g in failed_geometry)
        near = sum(
            any(directions for px, directions in g["toward"].items() if int(px) >= 8)
            for g in failed_geometry
        )
        contacts = sum(bool(g["contacts"]) for g in failed_geometry)
        # A changed destination can make the leg count on one definition only.
        # Report both gains from exactly the same approved physical route.
        original_gains = []
        chosen_gains = []
        qualified_raw = 0
        own_proposals = [p for p in proposals if p["key"] == k]
        arrivals = [
            l for l in own if l["native_non_escape_arrival"] and l["finish_s"] <= 600
        ]
        for l in arrivals:
            q = d["log"]["requests"][int(l["request"])]
            proposal = next(
                (p for p in reversed(own_proposals) if p["clock"] <= q["clock"]), None
            )
            start = [l["from_x"], l["from_y"]]
            end = [l["end_x"], l["end_y"]]
            if (
                proposal
                and proposal["chosen"] == q["goal"]
                and proposal["raw"] != proposal["chosen"]
            ):
                scale = proposal["scale"]
                raw = proposal["raw"]
                change = changed_rows[k, proposal["clock"]]
                change["arrivals"].append(
                    dict(
                        at_s=round(l["finish_s"], 3),
                        walked_css=l["css_distance"],
                        toward_original_css=round(
                            distance(start, raw, scale) - distance(end, raw, scale), 3
                        ),
                        end_error_css=round(distance(end, q["goal"], scale), 3),
                        ordinary=l["completed_normal"],
                    )
                )
                original_gains.append(
                    distance(start, raw, scale) - distance(end, raw, scale)
                )
                chosen_gains.append(
                    distance(start, q["goal"], scale) - distance(end, q["goal"], scale)
                )
            else:
                scale = q["scale"]
                raw = q["goal"]
            net = distance(start, end, scale)
            gain = distance(start, raw, scale) - distance(end, raw, scale)
            qualified_raw += int(net >= 8 - 1e-7 and gain > 0.75)
        initial_inks = geometry["opening", k]["reachable"]
        end_inks = geometry["endpoint", k]["reachable"]
        o = opening[k]
        a = aged[k]
        ms = [q for q in shift_rows if q["key"] == k]
        row = dict(
            **profile,
            policy=policy,
            arm=arm,
            key=k,
            requests=len(requests),
            plans=int(r["plans_cutoff"]),
            peer_change_retries=r["peer_change_retries"],
            peer_change_plans=r["peer_change_plans"],
            long_wait_reopens=r["reopened_original_goal_retries"],
            long_wait_reopen_plans=r["reopened_original_goal_plans"],
            normal=len(normal),
            first_half=int(r["normal_first_half"]),
            second_half=int(r["normal_second_half"]),
            normal_with_original_direct_intent=qualified_raw,
            arrivals_on_reselected_goal=len(original_gains),
            original_gain_css=round(sum(original_gains), 3),
            chosen_gain_css=round(sum(chosen_gains), 3),
            normal_distance_css=r["normal_dist_cutoff_css"],
            actual_distance_terrain=r["total_model_px"],
            actual_walk_distance_css=r["total_walked_css"],
            help_offers_made=r["offers_given"],
            help_offers_received=r["offers_received"],
            helping_steps_received=r["helping_steps_received"],
            plan_rate=r["plan_rate_cutoff"],
            longest_blocked_s=r["longest_step_refusal_s"],
            longest_to_plan_s=r["longest_plan_refusal_s"],
            after_first_longest_blocked_s=r["longest_post_first_refusal_s"],
            recovery_rate=r["step_recovery_excluding_idle_choices"],
            failed_requests=len(failed),
            failures_with_initial_contact=contacts,
            failures_without_any_direct_step=stranded,
            failures_with_8px_safe_progress=near,
            refused_episodes=len(episodes),
            refused_seconds=round(sum(end - start for start, end, _ in episodes), 3),
            episodes_over_60=sum(end - start > 60 for start, end, _ in episodes),
            episodes_over_180=sum(end - start > 180 for start, end, _ in episodes),
            recovered=ended["own_step"],
            voluntary_end=(ended["voluntary"] if "budget" in d["log"] else ""),
            budget_end=(ended["budget"] if "budget" in d["log"] else ""),
            idle_without_cause=ended["idle_choice"],
            ambient_budget_decisions=int(r["waits_ambient_budget"]),
            open_at_cutoff=ended["open"],
            yields_performed=r["yielded_legs_cutoff"],
            normal_after_receiving_help=r["normal_after_received_help"],
            self_normal_after_yield=r["yields_followed_by_own_normal"],
            opening_trusted=int(o["trusted"]),
            opening_selected=int(o["selected"]),
            opening_issued=int(o["issued"]),
            opening_arrived=int(o["terminalArrived"]),
            opening_near4=int(o["terminalNear4"]),
            opening_finger_error_css=o.get("endFingerErrorCss", ""),
            aged_trusted=int(a["trusted"]),
            aged_selected=int(a["selected"]),
            aged_issued=int(a["issued"]),
            aged_arrived=int(a["terminalArrived"]),
            aged_near4=int(a["terminalNear4"]),
            aged_finger_error_css=a.get("endFingerErrorCss", ""),
            drag_steps=int(o.get("stepCount", 0)) + int(a.get("stepCount", 0)),
            drag_unsafe_steps=int(o.get("unsafeSteps", 0))
            + int(a.get("unsafeSteps", 0)),
            drag_swept_violations=int(o.get("sweptViolations", 0))
            + int(a.get("sweptViolations", 0)),
            opening_safe_candidates=sum(map(len, initial_inks.values())),
            aged_safe_candidates=sum(map(len, end_inks.values())),
            opening_3px_headings=len(initial_inks["3"]),
            opening_8px_headings=len(initial_inks["8"]),
            opening_16px_headings="",
            aged_3px_headings=len(end_inks["3"]),
            aged_8px_headings=len(end_inks["8"]),
            aged_16px_headings="",
            sync_foot_changes=len(ms),
            stable_replacement_shifts=sum(q["replacement_only"] for q in ms),
            other_between_legs=r["untracked_between_leg_shifts"],
            max_between_legs_css=r["largest_between_leg_shift_css"],
            speed_bound_exceedances=r["speed_bound_exceedances"],
        )
        for phase, column in [
            ("opening", "opening_16px_headings"),
            ("endpoint", "aged_16px_headings"),
        ]:
            item = checked16.get((phase, k))
            if item and item["matchingControlDirections"]:
                row[column] = len(item["headings16"])
        assert (
            row["normal"] == row["first_half"] + row["second_half"]
            and int(row["speed_bound_exceedances"]) >= 0
        )
        assert (
            sum(e[1] - e[0] for e in episodes) >= 0
            and abs(
                max((e[1] - e[0] for e in episodes), default=0)
                - float(row["longest_blocked_s"])
            )
            <= 0.00051
        )
        people.append(row)
    focus = ["pet:dog", "companion:tanuki", "companion:panda", "companion:box"]
    sums = lambda key: sum(int(r[key]) for r in people)
    event_goal = [q for q in proposals if q["raw"] != q["chosen"]]
    largest = max(people, key=lambda r: float(r["longest_blocked_s"]))
    cell = dict(
        **profile,
        policy=policy,
        arm=arm,
        initial_sha256=signature,
        raw_sha256=v9.sha(path),
        browser=d["browser"],
        model_source=d["sources"][f"home-production-model-mobility-{arm}.js"]["source"],
        renderer_source=next(
            s["source"]
            for name, s in d["sources"].items()
            if "production-diorama" in name
        ),
        wall_s=round(d["wallSeconds"], 3),
        model_s=round(d["baseline"]["modelSeconds"], 3),
        own_once=sum(r["normal"] >= 1 for r in people),
        own_twice=sum(r["normal"] >= 2 for r in people),
        both_halves=sum(r["first_half"] > 0 and r["second_half"] > 0 for r in people),
        walking_legs=sums("normal"),
        walk_distance_css=round(
            sum(float(r["normal_distance_css"]) for r in people), 3
        ),
        requests=sums("requests"),
        plans=sums("plans"),
        focus_walks="/".join(
            str(next(r["normal"] for r in people if r["key"] == k)) for k in focus
        ),
        longest_blocked_s=largest["longest_blocked_s"],
        longest_blocked_actor=largest["key"],
        opening_trusted=sums("opening_trusted"),
        opening_reached=sums("opening_arrived"),
        aged_trusted=sums("aged_trusted"),
        aged_reached=sums("aged_arrived"),
        opening_near4=sums("opening_near4"),
        aged_near4=sums("aged_near4"),
        drag_steps=sums("drag_steps"),
        drag_unsafe_steps=sums("drag_unsafe_steps"),
        drag_swept_violations=sums("drag_swept_violations"),
        changes_on_sync=len(syncs),
        same_body_replacement_moves=sums("stable_replacement_shifts"),
        between_legs_shifts=sums("other_between_legs"),
        max_between_legs_css=max(float(r["max_between_legs_css"]) for r in people),
        speed_bound_exceedances=sums("speed_bound_exceedances"),
        replaced_proposals=len(event_goal),
        proposals=len(proposals),
        strict_original_direct_legs=sums("normal_with_original_direct_intent"),
        restored_own_starts=restore.get("ambientStarts", 0),
    )
    if not event_goal:
        assert cell["walking_legs"] == cell["strict_original_direct_legs"], (
            "unmodified desires differ",
            cell["arm"],
        )
    return cell, people, shift_rows, list(changed_rows.values())


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("raw", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--complete", action="store_true")
    p.add_argument(
        "--game",
        type=Path,
        help="validate all recorded production model and renderer hashes against this published comparison build",
    )
    p.add_argument(
        "--final-run",
        type=int,
        help="select the run containing the final V11 model if multiple final revisions are archived",
    )
    a = p.parse_args()
    p_assets = Path(a.game) if a.game else None
    files = sorted(a.raw.rglob("forest28.json.gz"))
    cells = []
    residents = []
    shifts = []
    goal_changes = []
    receipts = []
    openings = {}
    pair_versions = {}
    for path in files:
        if not (path.parent / "residents.csv").exists():
            continue
        receipt = v9.load(path.parent / "receipt.json")
        if (
            a.final_run
            and path.parent.name.endswith("-v11")
            and receipt["run"] != a.final_run
        ):
            continue
        assert receipt["complete"] and receipt["case"] == path.parent.name
        assert receipt["sha256"] == v9.sha(path.parent / "runner.zip")
        receipts.append(
            {k: v for k, v in receipt.items() if k not in ("complete", "files")}
        )
        cell, rows, changes, choices = inspect(path)
        goal_changes.extend(choices)
        cell["workflow_run"] = receipt["run"]
        cell["commit"] = receipt["commit"]
        if p_assets:
            model = p_assets / ("home-production-model-mobility-" + cell["arm"] + ".js")
            paint = p_assets / (
                "home-production-diorama-mobility-"
                + cell["policy"].split("-")[0]
                + ".js"
            )
            assert (
                hashlib.sha256(model.read_bytes()).hexdigest() == cell["model_source"]
            ), (cell["arm"], "unmatched model build")
            assert (
                hashlib.sha256(paint.read_bytes()).hexdigest()
                == cell["renderer_source"]
            ), (cell["arm"], "unmatched renderer build")
        key = tuple(cell[k] for k in ("width", "seed", "order", "layout"))
        assert (
            openings.setdefault(key, cell["initial_sha256"]) == cell["initial_sha256"]
        ), ("unmatched opening", key)
        pair = (*key, cell["repeat"])
        versions = pair_versions.setdefault(pair, set())
        assert cell["policy"] not in versions, ("duplicate policy", pair)
        versions.add(cell["policy"])
        cells.append(cell)
        residents.extend(rows)
        shifts.extend(changes)
    if a.complete:
        assert len(cells) == 32 and len(pair_versions) == 8
        assert all(
            v == {"v9", "v10", "v11-foot", "v11"} for v in pair_versions.values()
        )
        assert len({c["browser"] for c in cells}) == 1
    assert cells
    a.out.mkdir(parents=True, exist_ok=True)
    (a.out / "forest-receipts.json").write_text(json.dumps(receipts, indent=2) + "\n")
    (a.out / "forest-goal-changes.json").write_text(
        json.dumps(goal_changes, indent=2) + "\n"
    )
    write_csv(a.out / "forest-cases.csv", cells)
    write_csv(a.out / "forest-residents.csv", residents)
    write_csv(a.out / "forest-sync-changes.csv", shifts)
    print(
        len(cells),
        "verified homes;",
        len(residents),
        "individuals;",
        len(shifts),
        "native sync movements",
    )


if __name__ == "__main__":
    main()
