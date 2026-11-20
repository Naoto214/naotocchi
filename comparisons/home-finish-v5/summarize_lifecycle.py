"""Summarize two reports produced by the unchanged native birth browser test."""
import argparse
from hashlib import sha256
import json
from pathlib import Path

NATIVE = ("home-production-diorama.js", "home-production-model.js", "home-production-world.mjs",
          "home-visible-ground-navigation.mjs", "home-art-navigation.mjs", "home-route-navigation.mjs")


def key(row):
    return row["engine"], row["width"], row["height"], row["motion"], row["safe"]


def summarize(before, after):
    assert not before["errors"] and not after["errors"]
    baseline = {key(row): row for row in before["results"]}
    candidate = {key(row): row for row in after["results"]}
    assert len(baseline) == len(candidate) == 10 and baseline.keys() == candidate.keys()
    rows = []
    for case, current in candidate.items():
        old = baseline[case]
        phases = ("newborn", "grown", "resumed")
        assert all(current[p]["safe"] and old[p]["safe"] for p in phases)
        delta = max(abs(current[p]["ground"][axis] - old[p]["ground"][axis])
                    for p in phases for axis in ("x", "y", "z"))
        growth = max(abs(current["newborn"]["ground"][a] - current["grown"]["ground"][a])
                     for a in ("x", "y", "z"))
        assert delta < 1e-12 and growth < 1e-12, (case, delta, growth)
        for phase in phases:
            a, b = old[phase], current[phase]
            assert a["asset"] == b["asset"] and a["stage"] == b["stage"] and a["age"] == b["age"]
            assert len(b["buttons"]) == 9 and b["notice"]["height"] == 42 and b["comment"]["height"] == 76
        assert current["afterBirthCare"] == current["newborn"]["save"]["actionCounts"]["pet"] + 1
        assert current["grown"]["save"]["speciesLine"] == current["resumed"]["save"]["speciesLine"]
        rows.append({"engine":case[0], "width":case[1], "height":case[2], "motion":case[3], "safeInsets":case[4],
                     "newbornGround":current["newborn"]["ground"], "restoredAdultGround":current["resumed"]["ground"],
                     "maxWorldDifference":delta, "maxGrowthFootDifference":growth})
    return rows


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("baseline", type=Path)
    p.add_argument("candidate", type=Path)
    p.add_argument("baseline_game", type=Path)
    p.add_argument("candidate_game", type=Path)
    p.add_argument("output", type=Path)
    args = p.parse_args()
    report = {"test":"tests/home-production-birth-browser.cjs",
              "cases":summarize(json.loads(args.baseline.read_bytes()), json.loads(args.candidate.read_bytes()))}
    for name, source in (("before",args.baseline_game),("after",args.candidate_game)):
        report[name] = {path:sha256((source/path).read_bytes()).hexdigest() for path in NATIVE}
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(f'{len(report["cases"])} matching native hatching, growth, care and restored-adult cases')


if __name__ == "__main__":
    main()
