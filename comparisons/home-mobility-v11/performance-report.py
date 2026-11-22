"""Validate paired V11 CI trials and write a compact report, preserving raw downloads separately."""
import argparse
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path

ARMS = ["v10", "v11-foot", "v11"]
PHASES = ("step", "move", "route", "localIntentRoute", "yieldLeg", "offerYield",
          "ambientPairSlice", "dragPairSlice", "stepRelief", "chooseWanderGoal",
          "sync", "modelSync", "measureCurrentBody", "measurementScope", "bareCompanionShape",
          "paint", "paintForeground", "world", "nature")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(value):
    return sha(json.dumps(value, separators=(",", ":")).encode())


def summary(values):
    if not values:
        return None
    sorted_values = sorted(values)
    def pct(p):
        return sorted_values[math.ceil(p * len(values)) - 1]
    return dict(n=len(values), p50=pct(.5), p95=pct(.95), p99=pct(.99), max=sorted_values[-1],
                over250=sum(x > 250 for x in values), over500=sum(x > 500 for x in values),
                over1000=sum(x > 1000 for x in values))


def thread_delta(first, last):
    return {key: round(last[5][key] - first[5][key], 2) for key in ("main", "raster", "compositor")}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def report(args):
    args.out.mkdir(parents=True, exist_ok=True)
    args.archive.mkdir(parents=True, exist_ok=True)
    frames = []
    result = dict(run=args.run, browser=None, openingSHA256=None, assets={}, native={}, replay={}, touch=[], sync=[],
                  sourceSHA256={}, confirmedOwnerTrialSources=bool(args.dist))
    def raw(name):
        files = list(args.directory.rglob(name + ".json"))
        assert len(files) == 1, (name, files)
        data = files[0].read_bytes()
        result["sourceSHA256"][name + ".json"] = sha(data)
        (args.archive / (name + ".json.gz")).write_bytes(gzip.compress(data, compresslevel=6, mtime=0))
        value = json.loads(data)
        result["browser"] = result["browser"] or value["browser"]
        assert value["browser"] == result["browser"]
        for row in value["rows"]:
            files = row["assets"]
            assert all(any(word in f for f in files) for word in ["production-model", "production-diorama", "production-world"])
            for resource, expected in files.items():
                assert result["assets"].setdefault(resource, expected) == expected
                if args.dist:
                    matches = list(args.dist.rglob(resource))
                    assert any(sha(x.read_bytes()) == expected for x in matches), (resource, expected)
        return value
    for name in ["forward", "reverse", "trace"]:
        data = raw(name)
        expected = list(reversed(ARMS)) if name == "reverse" else ARMS
        assert [r["arm"] for r in data["rows"]] == expected
        result["native"][name] = []
        for row in data["rows"]:
            observed = row["sample"]
            digest = fingerprint(observed["opening"])
            result["openingSHA256"] = result["openingSHA256"] or digest
            assert digest == result["openingSHA256"] and observed["retained"]
            assert observed["visibleAtOpen"] == observed["visibleAtEnd"] == 28
            assert observed["clock"] > 0 and not observed["diagnostics"]["enabled"]
            assert observed["elapsedMs"] >= data["seconds"] * 1000 and data["seconds"] == (25 if name == "trace" else 180)
            frame = summary(observed["intervals"])
            assert frame == row["distribution"]
            if name != "trace":
                frames.append(dict(family="autonomous", order=name, arm=row["arm"], **frame))
            longest = row["longest"]
            compact = dict(arm=row["arm"], frames=frame, wallMs=observed["elapsedMs"], modelSeconds=observed["clock"],
                           moves=observed["moves"], distanceTerrain=observed["distance"], events=observed["events"],
                           pausedMs=observed["pausedMs"], gateHistory=observed["gateHistory"],
                           maxInterval=longest["range"], maxIntervalCPUms=longest["webThreadCpuMs"],
                           alignmentErrorMs=longest["osRangeErrorMs"], cpuMs=thread_delta(row["os"][0], row["os"][-1]))
            if name == "trace":
                compact["phaseTotalsInclusive"] = {k: v for k, v in observed["audit"]["parts"].items() if k in PHASES}
                compact["domReads"] = observed["audit"]["counts"]
            result["native"][name].append(compact)
    for kind in ["fixed", "stress"]:
        data = raw(kind)
        rows = data["rows"]
        assert [r["arm"] for r in rows] == ARMS + list(reversed(ARMS))
        movement = data["physicalMoversPerMeasuredFrame"]
        assert len(movement) == len(rows[0]["intervalFrames"]) == 378
        model = dict(fixtureSHA256=data["fixtureSHA256"], phaseSHA256=data["phaseSHA256"], physicalMovement={
            "residentsInAll480Frames": len(rows[0]["countByKey"]), "maxSimultaneous": max(movement),
            "meanSimultaneous": sum(movement) / len(movement), "framesWithFour": sum(x>=4 for x in movement),
            "framesWithEight":sum(x>=8 for x in movement)}, rows=[])
        for index, row in enumerate(rows):
            order = "forward" if index < len(ARMS) else "reverse"
            assert row["cast"] == 28 and len(row["environment"]) == 480
            for attr in ("intervalFrames", "environment", "countByKey", "nativeGesture"):
                assert row[attr] == rows[0][attr], (kind, attr)
            frame = summary(row["intervals"])
            assert frame == row["distribution"]
            frames.append(dict(family=kind, order=order, arm=row["arm"], **frame))
            cpu = thread_delta(*row["cpu"])
            group = {f"atLeast{limit}":summary([gap for gap, n in zip(row["intervals"], movement) if n >= limit])
                     for limit in (1,4,8)}
            model["rows"].append(dict(arm=row["arm"], order=order, frames=frame, cpuMs=cpu, busy=group))
        result["replay"][kind] = model
    touch = raw("touch")["rows"]
    assert [r["arm"] for r in touch] == ARMS
    if list(args.directory.rglob("touch-reverse.json")):
        reversed_touch = raw("touch-reverse")["rows"]
        assert [r["arm"] for r in reversed_touch] == ARMS[::-1]
        touch = [*touch, *reversed_touch]
    commands = None
    for index,row in enumerate(touch):
        readings = row["readings"]
        command = [r["command"] for r in readings]
        if commands is None:
            commands = command
        assert command == commands and all(r["trusted"] for r in readings)
        matched = [r for r in readings if r["command"]["key"] == r.get("key")]
        moving = [r for r in matched if r["firstStepMs"] is not None]
        arrivals = [r["arrivalMs"] for r in moving if r["arrivalMs"] is not None]
        result["touch"].append(dict(arm=row["arm"], order="forward" if index < len(ARMS) else "reverse", commands=len(command), selected=len(matched), arrivals=len(arrivals),
                                    moved=len(moving), movingKeys=[r["key"] for r in moving], onset=summary([r["firstStepMs"] for r in moving]),
                                    arrival=summary(arrivals), queue=summary([r["queueMs"] for r in readings])))
    sync = raw("sync")["rows"]
    assert [r["arm"] for r in sync] == ARMS
    if list(args.directory.rglob("sync-reverse.json")):
        reversed_sync = raw("sync-reverse")["rows"]
        assert [r["arm"] for r in reversed_sync] == ARMS[::-1]
        sync = [*sync, *reversed_sync]
    for index,row in enumerate(sync):
        for count in (0,1,26):
            samples = [s for s in row["samples"] if s["count"] == count]
            assert len(samples) == 20
            result["sync"].append(dict(arm=row["arm"], order="forward" if index < len(ARMS) else "reverse", replaced=count, native=summary([s["nativeSyncMs"] for s in samples]),
                                       afterDecode=summary([s["afterDecodeMs"] for s in samples])))
    route_files = list(args.directory.rglob("routes.json"))
    assert len(route_files)==1
    source = route_files[0].read_bytes()
    result["sourceSHA256"]["routes.json"] = sha(source)
    (args.archive / "routes.json.gz").write_bytes(gzip.compress(source, compresslevel=6, mtime=0))
    routes = json.loads(source)
    assert [(r["order"],r["arm"]) for r in routes["rows"]] == [
        *(("forward",a) for a in ARMS), *(("reverse",a) for a in reversed(ARMS))]
    assert routes["seconds"] == 600 and all(r["initialFeet"]==routes["rows"][0]["initialFeet"] for r in routes["rows"])
    for row in routes["rows"]:
        assert result["assets"][row["source"]] == row["sourceSHA256"]
    result["modelProfile"] = dict(node=routes["node"], seconds=routes["seconds"], seed=routes["seed"],
        rows=[dict(arm=r["arm"],order=r["order"],moves=r["metrics"]["moves"],distance=r["metrics"]["distance"],
                   timing=r["timing"]) for r in routes["rows"]])
    write(args.out / "performance.json", result)
    with (args.out / "performance-frames.csv").open("w", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=frames[0])
        writer.writeheader()
        writer.writerows(frames)
    write(args.archive / "checksums.json", {"commit":args.commit, "run":args.run, "files": {
        p.name:sha(p.read_bytes()) for p in sorted(args.archive.glob("*.gz"))}})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--run", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--dist", type=Path, help="Byte-verify all JS sources against this native distribution")
    report(parser.parse_args())
