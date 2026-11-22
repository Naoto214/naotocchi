"""Verify 28-actor WPE observations, SHA-256 receipts, orders, input and tape equality."""
import argparse
import csv
import hashlib
import json
import re
import runpy
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
old = runpy.run_path(str(HERE.parent / "home-mobility-v11/performance-report.py"))
ARMS = ["v12", "v13-a", "v13-b", "v13-c", "v13-d"]
SUITES = ["live", "trace", "touch", "fixed", "stress"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def stats(numbers):
    return old["summary"](numbers)


def report(directory, dist, out, supplements=()):
    raw = {}
    runs = []
    result = dict(browser=None, archives=[], assets={}, sources={}, readingRuns={},
                  live=[], trace=[], touch=[], fixed=[], stress=[])
    for folder in [directory, *supplements]:
        receipt = json.loads((folder / "receipt.json").read_bytes())
        assert receipt["status"] == "completed" and receipt["conclusion"] in ("success", "failure")
        assert all(j["status"]=="completed" for j in receipt["jobs"])
        runs.append({k:receipt[k] for k in ("run", "url", "commit", "conclusion", "jobs")})
        for archive in receipt["archives"]:
            path = folder / archive["name"]
            assert sha(path.read_bytes()) == archive["sha256"] and path.stat().st_size == archive["bytes"]
            result["archives"].append(dict(run=receipt["run"], **archive))
            if "-seat-375-" in archive["name"]:
                continue  # The four 375px observations are verified by performance-seat-report.py.
            with zipfile.ZipFile(path) as z:
                rootnames = [n for n in z.namelist() if "/" not in n]
                if not rootnames:
                    continue
                [name] = rootnames
                assert path.name == "mobility-v13-performance-" + name[:-5] + ".zip"
                stem = name[:-5]
                experiment, order = stem.rsplit("-", 1)
                matching = [j for j in receipt["jobs"] if experiment in j["name"] and order in j["name"]]
                assert len(matching)==1, (name, matching)
                if matching[0]["conclusion"] != "success":
                    continue
                if name.startswith(("fixed-320-", "stress-320-")):
                    sums = z.read("tape/SHA256SUMS").decode().splitlines()
                    assert len(sums) == 3
                    for entry in sums:
                        digest, filename = entry.split()
                        assert sha(z.read("tape/" + filename)) == digest
                data = z.read(name)
                result["sources"][name] = sha(data)
                result["readingRuns"][name] = receipt["run"]
                raw[name] = json.loads(data)
    assert len(raw) == 20, sorted(raw)
    result.update(run=runs[0]["run"], url=runs[0]["url"], commit=runs[0]["commit"], runs=runs)
    frames = []
    openings = {}
    first_commands = {}
    for width in [320, 390]:
        for suite in SUITES:
            fixed_reference = None
            for direction, order in [("forward", ARMS), ("reverse", ARMS[::-1])]:
                data = raw[f"{suite}-{width}-{direction}.json"]
                browser = result["browser"] or data["browser"]
                assert data["browser"] == browser
                result["browser"] = browser
                assert [r["arm"] for r in data["rows"]] == order
                if suite in ("live", "trace"):
                    assert data["width"] == width and data["seconds"] == (180 if suite == "live" else 40)
                if suite == "touch":
                    commands = data["controls"]
                    assert len(commands) == 9 and first_commands.setdefault(width, commands) == commands
                if suite in ("fixed", "stress"):
                    tape = (data["fixtureSHA256"], data["phaseSHA256"], data["physicalMoversPerMeasuredFrame"])
                    fixed_reference = fixed_reference or (tape, data["rows"][0])
                    assert fixed_reference[0] == tape
                for row in data["rows"]:
                    arm = row["arm"]
                    assert all(any(word in name for name in row["assets"]) for word in
                               ("production-model", "production-world", "production-diorama", "home-visible-ground-navigation", "mobility-"+arm+".html"))
                    for name, expected in row["assets"].items():
                        assert name == Path(name).name
                        if name not in validated:
                            candidate = dist / name
                            matches = [candidate] if candidate.exists() else list(dist.rglob(name))
                            assert matches and {sha(p.read_bytes()) for p in matches} == {expected}, name
                            validated[name] = expected
                        assert validated[name] == expected
                    summary = dict(width=width, order=direction, arm=arm)
                    if suite == "touch":
                        rows = row["readings"]
                        assert [r["command"] for r in rows] == [c for c in commands if c["start"] is not None]
                        assert all(r["trusted"] for r in rows)
                        selected = [r for r in rows if r.get("key") == r["command"]["key"]]
                        moved = [r for r in selected if r["firstStepMs"] is not None]
                        arrived = [r for r in moved if r["arrivalMs"] is not None]
                        summary.update(issued=len(rows), selected=len(selected), moved=len(moved), arrived=len(arrived),
                                       movers=[r["key"] for r in moved], onset=stats([r["firstStepMs"] for r in moved]),
                                       arrival=stats([r["arrivalMs"] for r in arrived]), queue=stats([r["queueMs"] for r in rows]))
                    elif suite in ("live", "trace"):
                        s = row["sample"]
                        assert s["retained"] and s["visibleAtOpen"] == s["visibleAtEnd"] == len(s["opening"]) == 28
                        assert s["elapsedMs"] >= data["seconds"] * 1000 and not s["diagnostics"]["enabled"]
                        digest = old["fingerprint"](s["opening"])
                        assert openings.setdefault((width, arm), digest) == digest, (width, arm, digest, openings)
                        summary.update(openingSHA256=digest, wallMs=s["elapsedMs"], modelSeconds=s["clock"], moves=s["moves"],
                                       distance=s["distance"], events=s["events"], pausedMs=s["pausedMs"],
                                       scales=s["scales"], cpuMs=old["thread_delta"](row["os"][0], row["os"][-1]))
                        if suite == "live":
                            summary["frames"] = stats(s["intervals"])
                            assert summary["frames"] == row["distribution"]
                            summary["longest"] = {k:row["longest"][k] for k in
                                ["duration", "range", "webThreadCpuMs", "osRangeErrorMs"]}
                        else:
                            parts = s["audit"]["parts"]
                            assert all(k in parts for k in ["step", "paint", "world", "route"]), (width, arm, sorted(parts))
                            summary["parts"] = {k:parts[k] for k in (*old["PHASES"], "curvedHandoffSlice") if k in parts}
                    else:
                        ref = fixed_reference[1]
                        assert all(row[k] == ref[k] for k in ["intervalFrames", "environment", "nativeGesture", "countByKey"])
                        assert row["cast"] == 28 and len(row["environment"]) == 480 and len(row["intervalFrames"]) == 378
                        assert all(calls for _, calls in row["environment"])
                        movers = data["physicalMoversPerMeasuredFrame"]
                        assert len(movers) == 378
                        summary.update(frames=stats(row["intervals"]), posesSHA256=data["fixtureSHA256"],
                                       phasesSHA256=data["phaseSHA256"], maxMoving=max(movers), meanMoving=sum(movers)/len(movers),
                                       cpuMs=old["thread_delta"](*row["cpu"]))
                        assert summary["frames"] == row["distribution"]
                    if "frames" in summary:
                        frames.append(dict(suite=suite, width=width, order=direction, arm=arm, **summary["frames"]))
                    result[suite].append(summary)
    result["assets"] = validated
    result["touchControls"] = first_commands
    out.mkdir(parents=True, exist_ok=True)
    (out / "performance.json").write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
    with (out / "performance-frames.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(frames[0]))
        writer.writeheader()
        writer.writerows(frames)
    print("Verified raw ZIPs", len(raw), "frame series", len(frames), "inputs",
          sum(r["issued"] for r in result["touch"]), "unique source files", len(validated))
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("archive", type=Path)
    p.add_argument("--game", required=True, type=Path)
    p.add_argument("--supplement", action="append", type=Path, default=[])
    p.add_argument("--out", default=HERE / "evidence", type=Path)
    args = p.parse_args()
    report(args.archive, args.game, args.out, args.supplement)
