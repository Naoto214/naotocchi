"""Measure the real owner-only home with the original Linux WPE observers and tapes."""
import argparse
import importlib.util
import json
import re
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("perf_v12", HERE.parent / "home-mobility-v12/performance-trace.py")
trace = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trace)
old = trace.old
common = old.common
ARMS = ["v12", "v13-a", "v13-b", "v13-c", "v13-d"]
original_page = common.native_page


def fingerprinted_page(browser, base, arm, **options):
    page, errors, assets = original_page(browser, base, arm, **options)
    urls = page.evaluate("""()=>performance.getEntriesByType('resource').map(r=>r.name)
                         .filter(u=>new URL(u).pathname.includes('/home-visible-ground-navigation'))""")
    if not urls:
        raise ValueError("Could not identify the loaded navigation module for " + arm)
    for url in [page.url, *urls]:
        response = page.request.get(url)
        assert response.ok, response.url
        name = Path(urlsplit(url).path).name
        assets[name] = common.digest(response.body())
        response.dispose()
    return page, errors, assets


common.native_page = fingerprinted_page


def measure_live(args, arms):
    # Each arm starts in a fresh browser on the same runner in the prescribed order.
    # D may intentionally start from different seats. The upstream single-arm
    # check still verifies all 28 retained/visible actors, the clock and native gates.
    native_page = common.native_page

    def viewport(browser, base, arm, *, transform, **options):
        def instrument(name, body):
            source = transform(name, body)
            if args.trace and "production-model" in name and re.search(r"function\s*\*\s*curvedHandoff\s*\(", source):
                return trace.observe_iteration(source)
            return source
        return native_page(browser, base, arm, view=(args.width, 792), transform=instrument, **options)

    common.native_page = viewport
    old.native.native_page = old.attributed_page
    result = dict(width=args.width, order=args.direction, seconds=args.seconds, warmupSeconds=args.warmup,
                  trace=args.trace, rows=[])
    with tempfile.TemporaryDirectory() as temp:
        for arm in arms:
            scratch = Path(temp) / (arm + ".json")
            run = argparse.Namespace(**{**vars(args), "order": arm, "out": scratch})
            old.native.run(run)
            measured = json.loads(scratch.read_bytes())
            result["browser"] = measured["browser"]
            result["rows"].extend(measured["rows"])
            common.save(args.out, result)
            print(arm, measured["rows"][0]["distribution"], flush=True)


def measure_touch(args, arms):
    driver = common.load("v9_touch_probe", common.V9 / "performance-touch.py")
    result = dict(width=args.width, order=args.direction, timeoutMs=5000, rows=[])
    with sync_playwright() as pw:
        bridge = common.touch.WebKitTouch(common.WPE or pw.webkit.executable_path)
        try:
            browser = pw.webkit.connect(bridge.endpoint)
            result["browser"] = browser.version

            def page(arm):
                return common.native_page(browser, args.base, arm, init=driver.LISTEN,
                                          transform=driver.instrument, view=(args.width, 792))

            tape = (HERE / "performance-touch-controls.json").read_bytes()
            probes = json.loads(tape)["widths"][str(args.width)]["controls"]
            assert [p["key"] for p in probes] == ["companion:" + r for r,_,_ in driver.COMMANDS]
            for p, (_, dx, dy) in zip(probes, driver.COMMANDS, strict=True):
                if p["start"] is not None:
                    assert [p["start"][0]+dx, p["start"][1]+dy] == p["finish"]
            result.update(controls=probes, controlsSHA256=common.digest(tape), warmupSeconds=8)
            for arm in arms:
                pg, errors, assets = page(arm)
                pg.evaluate("HomeCastTrial.apply({paused:false});0")
                pg.wait_for_timeout(8000)
                openings = pg.evaluate("mobilityPerf.reset(214).snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h])")
                assert len(openings) == 28
                readings = []
                for command in probes:
                    if command["start"] is None:
                        continue
                    pg.evaluate("mobilityPerf.reset(214);window.footProbe={firstStepMs:null,arrivalMs:null};0")
                    driver.touch.send(pg, bridge, command["start"], command["finish"], "drag")
                    pg.wait_for_function("footProbe.done", timeout=35000)
                    sample = pg.evaluate("footProbe")
                    assert sample["trusted"], sample
                    readings.append(dict(command=command, **sample))
                assert readings and not errors, errors
                result["rows"].append(dict(arm=arm, assets=assets, opening=openings, readings=readings))
                common.save(args.out, result)
                print(arm, len(readings), "trusted controls", flush=True)
                pg.close()
        finally:
            bridge.close()


def measure_seating(args, arms):
    result = {"width": args.width, "order": args.direction, "rows": []}
    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=common.WPE)
        result["browser"] = browser.version
        for arm in arms:
            def instrument(name, source):
                if arm != "v13-d" or "production-model" not in name:
                    return source
                start = "scene.navigation.v13SeatReceipt=("
                end = "b=>exit.every(q=>separated(lead,q,b)));"
                source = common.clock.replace(source, start, "const tSeat=performance.now();" + start)
                return common.clock.replace(source, end, end +
                    "(mobilityPerf.seatTrial||=[]).push({ms:performance.now()-tSeat,...scene.navigation.v13SeatReceipt});")
            page, errors, assets = common.native_page(browser, args.base, arm, view=(args.width,792), transform=instrument)
            rows = page.evaluate("""()=>{
              const boot=mobilityPerf.seatTrial||[],observations=[];
              for(let i=0;i<6;i++){
                mobilityPerf.seatTrial=[];const start=performance.now(),model=mobilityPerf.reset(214);
                const elapsed=performance.now()-start,actors=model.snapshot();
                observations.push({ms:elapsed,passes:mobilityPerf.seatTrial,opening:actors.map(a=>[a.key,a.x,a.y])});
              }
              return {boot, observations};
            }""")
            assert not errors and all(len(o["opening"]) == 28 for o in rows["observations"])
            result["rows"].append(dict(arm=arm, assets=assets, **rows))
            common.save(args.out, result)
            page.close()
        browser.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("suite", choices=["live", "trace", "fixed", "stress", "touch", "seating"])
    p.add_argument("--arms", choices=ARMS, nargs="+", default=ARMS)
    p.add_argument("--direction", choices=["forward", "reverse"], required=True)
    p.add_argument("--width", type=int, choices=[320, 375, 390], default=390)
    p.add_argument("--seconds", type=float, default=180)
    p.add_argument("--warmup", type=float, default=8)
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    p.add_argument("--tape", type=Path)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    arms = args.arms if args.direction == "forward" else args.arms[::-1]
    if args.suite in ("live", "trace"):
        args.trace = args.suite == "trace"
        measure_live(args, arms)
    elif args.suite == "seating":
        measure_seating(args, arms)
    elif args.suite == "touch":
        measure_touch(args, arms)
    else:
        if not args.tape:
            p.error("A fixed playback requires its original --tape")
        reference = json.loads((args.tape / (args.suite + ".json")).read_bytes())
        if args.width != reference.get("width", 390):
            p.error("The replay viewport must match the source tape")
        native_page = common.native_page

        def replay_page(browser, base, arm, **options):
            return native_page(browser, base, arm, view=(args.width, 792), **options)

        common.native_page = replay_page
        args.order, args.kind = ",".join(arms), args.suite
        old.run_replay(args)


if __name__ == "__main__":
    main()
