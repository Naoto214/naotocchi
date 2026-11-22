"""Record 320px fixed-replay inputs from a real V12 forest. Timings stay out of the fixture."""
import argparse
import gzip
import hashlib
import json
import runpy
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
old = runpy.run_path(str(HERE / "performance.py"))["old"]
common = old.common


def encode(obj):
    return json.dumps(obj, separators=(",", ":")).encode()


def record(base, kind, out):
    script = (old.V10 / "performance-fixed.js").read_text().replace("PAINTERS", "{native:paint}")
    marker = "fixedCast.run=async(arm,warm)=>{"
    script = common.clock.replace(script, marker, old.replay.INSTALL + "\n" + marker)

    def attach(name, body):
        if "production-diorama" in name:
            return common.clock.replace(body, "    function stop(){", script + "\n    function stop(){")
        return body

    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=common.WPE)
        page, errors, sources = common.native_page(browser, base, "v12", view=(320, 792),
                                                   init=old.replay.fixed.HOLD, transform=attach)
        page.evaluate("HomeCastTrial.apply({paused:false});0")
        page.wait_for_function("()=>fixedCast.matchNativeIntro({targets:[],controlled:false})")
        candidates = [200, 600, 1200, 2400]
        for scan in candidates:
            fixture = page.evaluate("options=>fixedCast.capture(options)",
                                    dict(clips=30, size=16, scan=scan, seed=214, stress=kind == "stress"))
            poses = fixture.pop("frames")
            samples = [len(frame["moved"]) for i,frame in enumerate(poses) if i>=48 and i%16>=2]
            print(f"{scan} source clips, {len(samples)} measured frames, {sum(samples)} resident movements, max {max(samples)}", flush=True)
            if sum(samples) > len(samples) * .4:
                break
        # At 320px natural movement can be rare. Retain the actual density at
        # this width and report it alongside the denser per-resident stress tape.
        assert any(samples), "No real physical movement in the complete source"
        page.expose_function("markSampling", lambda stamp: None)
        row = page.evaluate("fixedCast.run('native',48)")
        browser.close()
    assert len(poses) == len(row["phaseLog"]) == 480 and not errors
    assert all(len(frame["positions"]) == 28 for frame in poses)
    assert len(row["intervalFrames"]) == 378 and row["cast"] == len(fixture["initial"]) == 28
    movers = [len(poses[i]["moved"]) for i in row["intervalFrames"]]
    assert movers == samples, "Different frame indices in capture and playback"
    phases = row.pop("phaseLog")
    assert all(value >= 1 for _, value in row["environment"])
    out.mkdir(parents=True, exist_ok=True)
    for filename, data in [("active-poses.json.gz", poses), ("active-animation-phases.json.gz", phases)]:
        (out / filename).write_bytes(gzip.compress(encode(data), mtime=0))
    source = dict(width=320, height=792, dpr=2, arm="v12", browser=browser.version, seed=214, assets=sources,
                  warmupFrames=48, fixture=fixture, posesSHA256=common.digest(encode(poses)),
                  physicalMoversPerMeasuredFrame=movers, rows=[dict(phaseSHA256=common.digest(encode(phases)),
                  intervalFrames=row["intervalFrames"], environment=row["environment"])])
    (out / (kind + ".json")).write_bytes(encode(source) + b"\n")
    paths = [out / name for name in (kind + ".json", "active-poses.json.gz", "active-animation-phases.json.gz")]
    (out / "SHA256SUMS").write_text("".join(hashlib.sha256(p.read_bytes()).hexdigest() + "  " + p.name + "\n" for p in paths))
    print(kind, "mean movers", sum(movers) / len(movers), "max movers", max(movers), source["posesSHA256"])


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--kind", required=True, choices=["fixed", "stress"])
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    args = p.parse_args()
    record(args.base, args.kind, args.out)
