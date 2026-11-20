"""Run the original V5 WPE observer on the V5 / V6 native pages and verify the pair."""

import argparse
import json
import os
import platform
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
V5 = HERE.parent / "home-finish-v5"
BASE_MODEL = "d1a8706b7339670b9fc5141bc2eaa056788453fc22c4c3cb3028be5f6d502b05"
REPLAY_SCENES = [
    "forest,430,28",
    "river_lake,375,28",
    "home,390,4",
    "home,390,1",
    "home,390,28",
]


def trace_model(source):
    """Only used on the independent 12-second attribution pass."""
    tick = "function step(dt,flags={}){"
    move = "function move(key,p,source='tap',{pointerDrop=false}={}){"
    assert source.count(tick) == source.count(move) == 1
    source = source.replace(
        tick,
        tick
        + """
        const t=performance.now(),from=clock;
        try{return traceStep(dt,flags);}finally{
          finishPerf.slow.push(['tick '+JSON.stringify([from,clock,dt,!!flags.blocked]),t,performance.now()]);
        }} function traceStep(dt,flags={}){""",
    )
    source = source.replace(
        move,
        move
        + """
        const t=performance.now();
        try{return traceMove(key,p,source,{pointerDrop});}finally{
          finishPerf.slow.push(['move '+JSON.stringify([key,source,pointerDrop,clock]),t,performance.now()]);
        }} function traceMove(key,p,source='tap',{pointerDrop=false}={}){""",
    )
    for name in ("dragDestination", "offerYield"):
        anchor = f"function {name}("
        if anchor in source:
            assert source.count(anchor) == 1
            brace = source.index("){", source.index(anchor)) + 2
            source = (
                source[:brace]
                + f"finishPerf.slow.push(['{name}',performance.now(),performance.now()]);"
                + source[brace:]
            )
    return source


def native_observer(reverse=False, trace=False):
    # The frozen V5 observer addresses its original script filename twice. The
    # comparison build renames the candidate copy, so register its genuine URL
    # for exactly the same read-only pause classifier and source fingerprint.
    path = V5 / "measure-performance.py"
    source = path.read_text()
    for old, new in (
        (
            'elif name == "script-v2.js" and',
            'elif name in ("script-v2.js", "script-v2-drag-v6.js") and',
        ),
        (
            '            ctx.route("**/script-v2.js*", instrument)\n',
            "",
        ),
        (
            'for pattern in (\n        "**/home-production-diorama',
            'for pattern in (\n        "**/script-v2*.js*",\n        "**/home-production-diorama',
        ),
    ):
        assert source.count(old) == 1, old
        source = source.replace(old, new)
    if reverse:
        # Reverse only the arm order. Keep the random seed and the fixture unchanged.
        anchor = "if (repeat + index) % 2 == 0"
        assert source.count(anchor) == 1
        source = source.replace(anchor, "if (repeat + index) % 2 == 1")
    if trace:
        # Leave the actual two 180s CLOCK pairs unprofiled. Add tick/intent labels
        # and the V5 callback stack recorder only on the short attribution pass.
        anchor = "        route.fulfill(response=response, body=source)"
        assert source.count(anchor) == 1
        source = source.replace(
            anchor, '        if "model" in name: source=trace_model(source)\n' + anchor
        )
        anchor = 'INIT + (TASK_TRACE if args.tasks else "")'
        assert source.count(anchor) == 1
        source = source.replace(anchor, "INIT + TASK_TRACE")
    namespace = {
        "__file__": str(path),
        "__name__": "v5_wpe_observer",
        "trace_model": trace_model,
    }
    exec(compile(source, str(path), "exec"), namespace)  # noqa: S102 - versioned, local observer
    return namespace["main"]


def sample_host(path):
    """Measure cgroup usage in this worker, independent of the host-wide load average."""
    stat = Path("/sys/fs/cgroup/cpu.stat")
    data = {
        "utc": datetime.now(UTC).isoformat(),
        "cpuMax": Path("/sys/fs/cgroup/cpu.max").read_text().strip(),
        "samples": [],
    }

    def read():
        return {
            k: int(v)
            for k, v in (line.split() for line in stat.read_text().splitlines())
        }

    for _ in range(2):
        before = read()
        started = time.monotonic()
        time.sleep(5)
        elapsed = time.monotonic() - started
        after = read()
        data["samples"].append(
            {
                "seconds": elapsed,
                "cpuCores": (after["usage_usec"] - before["usage_usec"])
                / (1e6 * elapsed),
                "nrThrottled": after["nr_throttled"] - before["nr_throttled"],
                "load": os.getloadavg(),
            }
        )
    path.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    return data


def verify(path, mode):
    report = json.loads(path.read_text())
    scenes = REPLAY_SCENES if mode == "replay" else ["forest,390,28"]
    assert len(report["rows"]) == 2 * len(scenes)
    history_file = (
        "performance-owner-replay.json"
        if mode == "replay"
        else "performance-sustained-forest.json"
    )
    historical = {
        r["scene"]: r
        for r in json.loads((V5 / "evidence" / history_file).read_text())["rows"]
        if r["variant"] == "after"
    }
    manifest = json.loads((HERE / "native/sources.json").read_text())
    for scene in scenes:
        by_version = {r["variant"]: r for r in report["rows"] if r["scene"] == scene}
        baseline, candidate = by_version["before"], by_version["after"]
        assert BASE_MODEL in baseline["hashes"].values(), "V5 release model fingerprint"
        assert "home-production-model-drag-v6.js" in candidate["hashes"], (
            "V6 native model"
        )
        assert baseline["seed"] == candidate["seed"] == 214
        for r in (baseline, candidate):
            settings = r["opening"]["settings"]
            assert settings["policy"] == "B" and settings["curve"] == "linear"
        for name, expected in manifest.items():
            assert expected["before"] in baseline["hashes"].values(), (
                scene,
                name,
                "V5 source",
            )
            assert expected["after"] in candidate["hashes"].values(), (
                scene,
                name,
                "V6 source",
            )
        assert "script-v2-drag-v6.js" in candidate["hashes"]
        assert "script-v2.js" in baseline["hashes"]
        assert baseline["opening"]["viewport"] == candidate["opening"]["viewport"]
        assert baseline["opening"]["scales"] == candidate["opening"]["scales"]
        a, b = baseline["sample"], candidate["sample"]
        if mode == "replay":
            assert a["digest"] == historical[scene]["sample"]["digest"], (
                scene,
                "original V5 recording",
            )
            for key in (
                "digest",
                "eventDigest",
                "contactDigest",
                "metrics",
                "rngCalls",
                "commands",
                "yields",
                "events",
            ):
                assert a[key] == b[key], (scene, key, a[key], b[key])
            assert (
                a["saveStable"]
                and b["saveStable"]
                and a["storageKeys"] == b["storageKeys"] > 0
            )
        else:
            assert (
                len(a["opening"]) == 28
                and a["opening"]
                == b["opening"]
                == historical[scene]["sample"]["opening"]
            )
            for s in (a, b):
                assert (
                    s["sameNodes"]
                    and s["rows"] == 28
                    and s["elapsedMs"] >= report["seconds"] * 1000
                )
                assert len(s["minutes"]) == (1 if mode == "trace" else 3)
                assert all(m["clock"] > 0 for m in s["minutes"])
                if mode == "trace":
                    assert any(kind.startswith("tick ") for kind, *_ in s["slow"])
                    assert any(kind.startswith("move ") for kind, *_ in s["slow"])
                    assert all(
                        kind not in ("dragDestination", "offerYield")
                        for kind, *_ in s["slow"]
                    )
                    assert all(
                        json.loads(kind[5:])[1:3] == ["ambient", False]
                        for kind, *_ in s["slow"]
                        if kind.startswith("move ")
                    )
                assert sum(m["moves"] for m in s["minutes"]) == s["moves"] > 0
                assert (
                    sum(s["intervals"]) == s["elapsedMs"]
                    and max(s["intervals"]) == s["max"]
                )


def main(args):
    out = args.out.resolve()
    out.parent.mkdir(exist_ok=True, parents=True)
    if args.mode == "host":
        print(json.dumps(sample_host(out), ensure_ascii=False))
        return
    if not args.verify_only:
        observe = native_observer(args.reverse, args.mode == "trace")
        if args.mode == "sustained" and sys.platform.startswith("linux"):
            print(
                json.dumps(sample_host(out.with_name(out.stem + "-host.json"))),
                flush=True,
            )
        observe(
            SimpleNamespace(
                before=args.base.rstrip("/") + "/game/drag-v5.html",
                after=args.base.rstrip("/") + "/game/drag-v6.html",
                out=out,
                engine="webkit",
                mode="sustained" if args.mode == "trace" else args.mode,
                scene=REPLAY_SCENES if args.mode == "replay" else ["forest,390,28"],
                tasks=False,
                profile_sustained=args.mode == "trace",
                repeat=1,
                seconds=180 if args.mode == "sustained" else 12,
                steps=300,
            )
        )
        if args.mode == "trace":
            # These two extra observers are installed by this wrapper.
            result = json.loads(out.read_text())
            result.update(taskTrace=True, stepTrace=True)
            out.write_text(
                json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n"
            )
    verify(out, args.mode)
    print(f"Verified {args.mode} on {platform.system()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["host", "sustained", "replay", "trace"])
    parser.add_argument("--base", default="http://127.0.0.1:8366")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument(
        "--reverse", action="store_true", help="measure V6 before V5 with the same seed"
    )
    main(parser.parse_args())
