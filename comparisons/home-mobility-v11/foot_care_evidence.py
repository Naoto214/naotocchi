"""Summarize native post-care syncs, paired exit-check timings, and native save replays."""

import argparse
import hashlib
import json
from pathlib import Path


def load(root, name):
    path = root / (name + ".json")
    return json.loads(path.read_bytes())


def care_reflow(root):
    data = {
        "unit": "CSS px",
        "browser": load(root, "reflow-foot")["browser"],
        "forest320": [],
        "forestGrowth": [],
    }
    for arm in ["v10", "foot"]:
        for event in load(root, "reflow-" + arm)["cases"]:
            phases = []
            for sync in event["audit"]:
                phases.append(
                    {
                        "invalidProjectedFeet": [
                            s["key"]
                            for s in sync["samples"]
                            if not all(s["projectedValidity"].values())
                        ],
                        "clamped": [
                            s["key"] for s in sync["samples"] if s["hadToClamp"]
                        ],
                        "worsenedContacts": {
                            s["key"]: s["worsened"]
                            for s in sync["samples"]
                            if s["worsened"]
                        },
                        "arrangementOver1px": {
                            s["key"]: round(s["arrangeShiftCSS"], 3)
                            for s in sync["samples"]
                            if s["arrangeShiftCSS"] > 1
                        },
                    }
                )
            data["forest320"].append(
                dict(
                    arm=arm,
                    event=event["case"],
                    phases=phases,
                    screenFootCSS={
                        s["key"]: round(s["distanceCSS"], 4)
                        for s in event["screenChanges"]
                    },
                )
            )
    for row in load(root, "foot-care-trial")["cases"]:
        result = row["result"]
        data["forestGrowth"].append(
            dict(
                width=row["width"],
                guard=row["guard"],
                maxPaintedFootShift=result["maxScreenCss"],
                largest=result["residentKey"],
                phases=[
                    {k: v for k, v in s.items() if k != "validateMs"}
                    for s in result["steps"]
                ],
            )
        )
    return data


def saved_group(root, name):
    data = load(root, name)
    cases = []
    for case in data["cases"]:
        watched = case["watched"]
        row = case["trials"]["v10"]
        v11 = case["trials"]["v11-foot"]
        delta = row["distances"]
        old = next(a for a in case["sourceModel"]["people"] if a["key"] == watched)
        after = next(a for a in row["reconstructed"]["people"] if a["key"] == watched)
        cases.append(
            dict(
                case=case["case"],
                sourceSaveSHA256=case["sourceSaveSHA256"],
                region=case["sourceModel"]["region"],
                v10v11All28RestoredIdentical=row["reconstructed"]
                == v11["reconstructed"],
                restoredTargets=sum(
                    bool(a["target"] or a["route"])
                    for a in row["reconstructed"]["people"]
                ),
                careChangesOnLoad=row["careDiff"][:1],
                companionCareDifferences=len(row["careDiff"]),
                watchedBefore=old,
                watchedAfter=after,
                residentDistancesCSS={
                    s["key"]: round(s["distanceCSS"], 4) for s in delta
                },
                maxCSS=max(x["distanceCSS"] for x in delta),
                countChanged=sum(x["distanceCSS"] > 1e-4 for x in delta),
            )
        )
    return dict(
        browser=data["browser"],
        region="forest",
        width=390,
        syntheticClock="1780000000000",
        cases=cases,
    )


def saved(root):
    return {
        name: saved_group(root, filename)
        for name, filename in [
            ("pairedOpening", "foot-save"),
            ("nativeOpening", "foot-save-natural"),
        ]
    }


def timings(root):
    result = load(root, "foot-care-paired")
    rows = []
    for i in sorted(set(r["index"] for r in result["cases"])):
        pair = [r for r in result["cases"] if r["index"] == i]
        if len(pair) < 2:
            continue
        masks = lambda r: [
            [
                s.get(k)
                for k in ("eligible", "accepted", "previousExits", "lost", "reason")
            ]
            for s in r["result"]["steps"]
        ]
        assert (
            pair[0]["opening"] == pair[1]["opening"]
            and pair[0]["final"] == pair[1]["final"]
            and masks(pair[0]) == masks(pair[1])
        )
        item = dict(
            index=i,
            width=pair[0]["width"],
            order=[r["arm"] for r in pair],
            final28SHA256=hashlib.sha256(
                json.dumps(pair[0]["final"], separators=(",", ":")).encode()
            ).hexdigest(),
            decision=masks(pair[0]),
        )
        for r in pair:
            item[r["arm"]] = dict(
                growCallMs=round(r["action"]["elapsed"], 2),
                phaseMs=[round(s["validateMs"], 2) for s in r["result"]["steps"]],
                lastMaxScreenCSS=r["result"]["maxScreenCss"],
            )
        rows.append(item)
    return dict(browser=result["browser"], widthRegion="forest", paired=rows)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("root", type=Path)
    p.add_argument("dest", type=Path)
    p.add_argument("kind", choices=["reflow", "save", "timings"])
    args = p.parse_args()
    result = {"reflow": care_reflow, "save": saved, "timings": timings}[args.kind](
        args.root
    )
    args.dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
