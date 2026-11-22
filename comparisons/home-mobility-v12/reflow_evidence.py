"""Compact real care masks losslessly, with individual foot changes and source-file digests."""

import argparse
import base64
import hashlib
import json
import math
from pathlib import Path


def read(path):
    return json.loads(path.read_bytes())


def fingerprint(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bits(indices):
    raw = bytearray(18)
    for i in indices:
        raw[i // 8] |= 1 << (i % 8)
    return base64.b64encode(raw).decode("ascii")


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("raw", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument(
        "--crosschecks",
        type=Path,
        help="Matched renderer crosschecks on the frozen kernel before deferred-drag composition",
    )
    a = p.parse_args()
    src = a.raw
    dest = a.out
    names = ["growth.json", "growth-latest.json", "frozen-size320.json"]
    names = [n for n in names if (src / n).is_file()]
    data = {}
    for name in names:
        for row in read(src / name)["cases"]:
            data[row["width"], row["policy"]] = row
    widths = {}
    for w in [320, 375, 390, 430]:
        base = data[w, "legacy"]
        keys = [r[0] for r in base["opening"]]
        before = [bits(base["rays"][k]["before"]) for k in keys]
        cases = {}
        for mode in ["legacy", "keep", "walk", "helpers", "minimal", "auto"]:
            row = data[w, mode]
            assert (
                row["opening"] == base["opening"]
                and [bits(row["rays"][k]["before"]) for k in keys] == before
            )
            result = row["result"]
            end = {key: (x, y) for key, x, y in row["ending"]}
            change = [
                round(math.hypot(end[k][0] - x, end[k][1] - y), 4)
                for k, x, y in base["opening"]
            ]
            steps = []
            for s in result["steps"]:
                steps.append(
                    {
                        k: s[k]
                        for k in [
                            "sequence",
                            "accepted",
                            "reason",
                            "previousExits",
                            "lost",
                            "attempts",
                            "witness",
                            "correction",
                        ]
                        if k in s
                    }
                )
            had = sum(len(row["rays"][k]["before"]) for k in keys)
            lost = sum(len(row["rays"][k]["lost"]) for k in keys)
            cases[mode] = dict(
                stage=[result["stageBefore"], result["stageAfter"]],
                maxCSS=round(result["maxScreenCss"], 4),
                largest=result["residentKey"],
                shiftsCSS=change,
                after=[bits(row["rays"][k]["after"]) for k in keys],
                previouslyOpen=had,
                lost=lost,
                steps=steps,
                travel=row["extra"]["travel"],
            )
        widths[w] = dict(keys=keys, before=before, cases=cases)
    write(
        dest / "foot-growth.json",
        dict(
            browser=read(src / names[0])["browser"],
            sources={n: fingerprint(src / n) for n in names},
            mask="Base64 of 18 bytes. Bit i%8 in byte floor(i/8), CSS distance [3,8,16][floor(i/48)], clockwise heading (i%48)*7.5 degrees from positive X.",
            widths=widths,
        ),
    )
    transitions = []
    for c in read(src / "transitions.json")["cases"]:
        moved = {s["key"]: round(s["distanceCSS"], 3) for s in c["screenChanges"]}
        transitions.append(
            dict(
                case=c["case"],
                affected=len(moved),
                screenCSS=moved,
                reused=sum(x[-1] == "reused" for x in c["observedChanges"]),
                remeasured=sum(x[-1] == "remeasured" for x in c["observedChanges"]),
                modelSyncEvents=len(c["syncEvents"]),
                errors=c["pageErrors"],
            )
        )
    saved = []
    for r in read(src / "save.json")["cases"]:
        old, new = r["trials"]["v11-ref"], r["trials"]["v12"]
        assert (
            old["reconstructed"] == new["reconstructed"]
            and old["careDiff"] == new["careDiff"]
        )
        saved.append(
            dict(
                case=r["case"],
                hash=r["sourceSaveSHA256"],
                same28=True,
                distancesCSS={
                    k["key"]: round(k["distanceCSS"], 4)
                    for k in new["distances"]
                    if k["distanceCSS"] > 1e-7
                },
            )
        )
    red = read(src / "redraw.json")
    life = []
    for name in ("live-final", "live-repeat"):
        file = src / (name + ".json")
        if not file.exists():
            continue
        for r in read(file)["cases"]:
            steps = r["life"]["steps"]
            life.append(
                dict(
                    source=name,
                    case=r["case"],
                    preflight=r["preflight"],
                    shiftCSS=r["result"]["maxScreenCss"],
                    steps=steps,
                    bothRetained=len(steps) == 2 and all(s["accepted"] for s in steps),
                    expired=r["life"].get("expired"),
                    lastReason=r["life"]["lastReason"],
                    call=r["call"],
                )
            )
    corridor = {
        e: read(src / n)["cases"]
        for e, n in [("Chromium", "corridor-final.json"), ("WPE", "corridor-wpe.json")]
        if (src / n).exists()
    }
    if a.crosschecks and "WPE" not in corridor:
        corridor["WPE-frozen-kernel"] = read(a.crosschecks / "corridor-wpe.json")[
            "cases"
        ]
    extra = {}
    for name in [
        "live-oracle",
        "readout-current",
        "readout-hashes",
        "wpe-live-390",
        "head-check",
    ]:
        if (src / (name + ".json")).is_file():
            extra[name] = read(src / (name + ".json"))
    lake = src / "memory-lake.json"
    if lake.exists():
        replay = read(lake)
        target = replay["record"]
        matches = [
            case
            for trial in replay["attempts"]
            for case in trial["simulated"]
            if case["prior"] == target["before"] and case["final"] == target["after"]
        ]
        extra["memoryLake"] = {
            "archivedMemberSHA256": replay["source"],
            "record": target,
            "naturalMatches": sum(a["exactNatural"] for a in replay["attempts"]),
            "controlledMatches": [
                {
                    k: case[k]
                    for k in [
                        "ground",
                        "visible",
                        "bounds",
                        "route",
                        "decision",
                        "seatedContacts",
                        "reservedExit",
                        "oldScale",
                        "newScale",
                    ]
                }
                for case in matches
            ],
        }
    terrain = read(src / "pairs-final.json")
    controls = [
        dict(
            case=r["mode"],
            reason=r["decision"]["reason"],
            held=r["decision"]["held"],
            expected=r.get("expected"),
            target=r["after"]["target"],
        )
        for r in read(src / "controls.json")["cases"]
    ]
    write(
        dest / "foot-events.json",
        dict(
            engine=read(src / "transitions.json")["browser"],
            transitions=transitions,
            redraw={k: red[k] for k in ["count", "changed"]},
            restored=saved,
            corridor=corridor,
            controls=controls,
            limitedNativeGrowth=life,
            twoParticipants=terrain,
            checks=extra,
            ui=read(src / "ui-growth.json")["cases"],
        ),
    )


if __name__ == "__main__":
    main()
