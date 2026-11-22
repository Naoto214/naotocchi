"""Validate and summarize measured renderer and life-transition records."""

from pathlib import Path
import argparse
import collections
import csv
import hashlib
import json

HERE = Path(__file__).resolve().parent
CASES = (
    "notice",
    "social",
    "expression",
    "growth",
    "evolution",
    "gear-off",
    "gear-on",
    "population-remove",
    "population-add",
    "region",
    "time",
    "width",
    "camera",
    "save-restore",
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(row):
    old, new = row["sceneBefore"], row["sceneAfter"]
    by_key = {p["key"]: p for p in old["people"]}
    replacements = [
        p["key"]
        for p in new["people"]
        if p["key"] in by_key and p["owner"] != by_key[p["key"]]["owner"]
    ]
    start, stop = row["lifeBefore"], row["lifeAfter"]
    assert not row["pageErrors"], (row["case"], row["pageErrors"])
    changes = [s for s in row["shifts"] if s["distanceCSS"] > 1e-4]
    events = row["syncEvents"]
    return dict(
        case=row["case"],
        fromView=[old["width"], old["height"], old["region"], old["projection"]],
        toView=[new["width"], new["height"], new["region"], new["projection"]],
        countBefore=len(old["people"]),
        countAfter=len(new["people"]),
        ownerReplacements=len(replacements) if row["case"] != "save-restore" else None,
        observedInkHandling=dict(
            collections.Counter(e[2] for e in row["observedChanges"])
        ),
        bodyOrLifeChange={
            k: [start[k], stop[k]]
            for k in (
                "base",
                "form",
                "stage",
                "expression",
                "image",
                "gear",
                "region",
                "time",
                "notice",
            )
            if start[k] != stop[k]
        },
        invalidFinalFoot=[
            p["key"] for p in new["people"] if not p["inside"] or not p["terrain"]
        ],
        movedInModel=len(changes),
        maxGroundCoordinateChangeCSS=max(
            (s["distanceCSS"] for s in changes), default=0
        ),
        syncReasonCounts=dict(collections.Counter(s["reason"] for s in events)),
        finalScreenChangeCSS=max(
            (s["distanceCSS"] for s in row.get("screenChanges", [])), default=None
        ),
        savedSHA256=row.get("careSaveSHA256"),
    )


def validate(rows):
    by_name = {x["case"]: x for x in rows}
    assert set(by_name) == set(CASES)
    for k in ("notice", "social", "expression", "time"):
        assert by_name[k]["movedInModel"] == 0, k
    assert by_name["notice"]["bodyOrLifeChange"]["notice"] == [False, True]
    assert by_name["social"]["ownerReplacements"] == 26
    assert (
        by_name["expression"]["bodyOrLifeChange"]["expression"][0]
        != by_name["expression"]["bodyOrLifeChange"]["expression"][1]
    )
    assert (
        "base" in by_name["growth"]["bodyOrLifeChange"]
        and "form" in by_name["evolution"]["bodyOrLifeChange"]
    )
    assert by_name["gear-off"]["bodyOrLifeChange"]["gear"] == ["ribbon", None]
    assert by_name["gear-on"]["bodyOrLifeChange"]["gear"] == [None, "ribbon"]
    assert (
        by_name["population-remove"]["countAfter"] == 27
        and by_name["population-add"]["countAfter"] == 28
    )
    assert by_name["region"]["toView"][2] == "river_lake" and by_name["time"][
        "bodyOrLifeChange"
    ]["time"] == ["day", "night"]
    assert by_name["width"]["toView"][0] == 375 and by_name["camera"]["toView"][:2] == [
        320,
        690,
    ]
    assert (
        by_name["save-restore"]["savedSHA256"]
        and by_name["save-restore"]["countAfter"] == 28
    )
    assert all(not r["invalidFinalFoot"] for r in rows), [
        (r["case"], r["invalidFinalFoot"]) for r in rows if r["invalidFinalFoot"]
    ]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("files", nargs="+", type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument(
        "--corrections",
        type=Path,
        help="CSV of native sync moves and before/after state on reload",
    )
    a = p.parse_args()
    raw = {}
    sources = []
    for f in a.files:
        contents = json.loads(f.read_bytes())
        for row in contents["cases"]:
            raw[row["case"]] = row
        sources.append(dict(name=f.name, sha256=sha(f)))
    summaries = [compact(raw[k]) for k in CASES]
    validate(summaries)
    if a.corrections:
        with a.corrections.open("w", newline="") as out:
            writer = csv.writer(out, lineterminator="\n")
            writer.writerow(
                [
                    "operation",
                    "clock",
                    "resident",
                    "reason",
                    "beforeX",
                    "beforeY",
                    "afterX",
                    "afterY",
                    "groundChangeCSS",
                ]
            )
            for name in CASES:
                row = raw[name]
                for event in row["syncEvents"]:
                    writer.writerow(
                        [
                            name,
                            event["clock"],
                            event["key"],
                            event["reason"],
                            *[
                                round(x, 5)
                                for x in (
                                    *event["from"],
                                    *event["to"],
                                    event["distanceCSS"],
                                )
                            ],
                        ]
                    )
                if name == "save-restore":
                    for event in row["shifts"]:
                        writer.writerow(
                            [
                                name,
                                "",
                                event["key"],
                                "fresh-model-from-native-care-save",
                                *[
                                    round(x, 5)
                                    for x in (
                                        *event["from"],
                                        *event["to"],
                                        event["distanceCSS"],
                                    )
                                ],
                            ]
                        )
    a.out.write_text(
        json.dumps(dict(sources=sources, cases=summaries), indent=2, ensure_ascii=False)
        + "\n"
    )


if __name__ == "__main__":
    main()
