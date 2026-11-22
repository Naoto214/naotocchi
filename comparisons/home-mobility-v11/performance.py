"""Time the native V10, foot-only and final homes with the pinned V10 observers."""
import argparse
import json
import re
import runpy
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
V10 = HERE.parent / "home-mobility-v10"
sys.path.insert(0, str(V10))
import performance_common as common

ARMS = ("v10", "v11-foot", "v11")
DEFAULT_ORDER = ",".join(ARMS)
native = common.load("performance_native_v10", V10 / "native-gates.py")
replay = common.load("performance_replay_v10", V10 / "replay-poses.py")


def attributed_page(browser, base, arm, *, traced=False, **options):
    def wrap_model(name, source):
        if not traced:
            return source
        model = "production-model" in name
        renderer = "production-diorama" in name
        if not (model or renderer):
            return source
        if model:
            # The V10 tracer already measures the renderer's full sync.
            # V11 also has a nested diagnostic named sync. Select the physical model signature.
            signature = "function sync(list,next){"
            timed = ("function sync(list,next){if(!mobilityPerf.active)return timedModelSync(list,next);"
                     "const start=performance.now();try{return timedModelSync(list,next);}"
                     "finally{mobilityPerf.finish('modelSync',start,12);}}function timedModelSync(list,next){")
            source = common.clock.replace(source, signature, timed)
        methods = (("localIntentRoute", "yieldLeg", "offerYield", "stepRelief", "chooseWanderGoal") if model
                   else ("measureCurrentBody", "bareCompanionShape", "measurementScope"))
        for name in methods:
            # The original is preserved, including all early returns.
            prefix = "function " + name + "("
            if prefix not in source:
                continue
            if "function perf_" + name + "(" in source:  # already timed by the V10 observer
                continue
            source = re.sub(r"(function " + name + r"\([^()]*?\))\s*\{", r"\1{", source, count=1)
            source = common.clock.wrap(source, name)
        if not model:
            return source
        for state in ("r.search", "request.pairSearch"):
            original = "result=" + state + ".next();"
            label = "ambientPairSlice" if state == "r.search" else "dragPairSlice"
            if original in source and label not in source:
                replacement = ("const sampleStart=mobilityPerf.active?performance.now():null;" + original +
                               "if(sampleStart!==null)mobilityPerf.finish('" + label + "',sampleStart,8);")
                source = common.clock.replace(source, original, replacement)
        return source
    return common.native_page(browser, base, arm, traced=traced, transform=wrap_model, **options)


def run_replay(args):
    # Draw with each page's own complete native controller. The foot-only and final arms
    # are actual entries, so changes to row initialization or closure state remain active.
    source = replay.read(args.tape / (args.kind + ".json"))
    poses = replay.read(args.tape / "active-poses.json.gz")
    phases = replay.read(args.tape / "active-animation-phases.json.gz")
    signature = lambda data: common.digest(json.dumps(data, separators=(",", ":")))
    assert signature(poses) == source["posesSHA256"]
    assert all(row["phaseSHA256"] == signature(phases) for row in source["rows"])
    effects = sorted(item.rsplit("@", 1)[0] for item in phases[0].split("|") if "/animation@" in item)
    install = (V10 / "performance-fixed.js").read_text().replace("PAINTERS", "{native:paint}")
    marker = "fixedCast.run=async(arm,warm)=>{"
    install = common.clock.replace(install, marker, replay.INSTALL + "\n" + marker)
    def attach(name, body):
        if "production-diorama" not in name:
            return body
        return common.clock.replace(body, "    function stop(){", install + "\n    function stop(){")
    reference = source["rows"][0]
    result = dict(kind=args.kind, fixtureSHA256=source["posesSHA256"], phaseSHA256=signature(phases),
                  physicalMoversPerMeasuredFrame=source["physicalMoversPerMeasuredFrame"],
                  warmupFrames=source["warmupFrames"], rows=[])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    recipe_ref = None
    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=common.WPE)
        result["browser"] = browser.version
        for arm in args.order.split(","):
            page, errors, assets = common.native_page(browser, args.base, arm, transform=attach, init=replay.fixed.HOLD)
            sampler = common.clock.Scheduler(.12)
            try:
                page.evaluate("HomeCastTrial.apply({paused:false});0")
                page.wait_for_function("e=>fixedCast.matchNativeIntro(e)", arg={"targets": effects, "controlled": bool(effects)}, timeout=720000)
                recipe = page.evaluate("fixedCast.readRecipes()")
                if recipe_ref is None:
                    recipe_ref = recipe
                assert recipe == recipe_ref, (arm, "Native selection keyframes or timing changed", recipe, recipe_ref)
                page.evaluate("data=>fixedCast.loadReference(data)", dict(initial=source["fixture"]["initial"], data=poses, clip=source["fixture"]["clipSize"]))
                assert page.evaluate("mobilityPerf.live.selected()===null")
                page.expose_function("markSampling", sampler.begin)
                row = page.evaluate("warm=>fixedCast.run('native',warm)", source["warmupFrames"])
                sampler.end()
                phase_log = row.pop("phaseLog")
                assert row["intervalFrames"] == reference["intervalFrames"] and row["cast"] == 28
                assert row["environment"] == reference["environment"] and phase_log == phases, (arm, "environment or visual phase drift", [(i,x,y) for i,(x,y) in enumerate(zip(phases,phase_log)) if x != y][:2])
                assert page.evaluate("fixedCast.readRecipes()") == recipe and not errors
                row.update(arm=arm, assets=assets, distribution=common.distribution(row["intervals"]),
                           cpu=[sampler.rows[0],sampler.rows[-1]], nativeGesture=recipe)
                result["rows"].append(row)
                common.save(args.out, result)
                print(arm, row["distribution"], flush=True)
            finally:
                sampler.end()
                page.close()
        browser.close()


SYNC = """
mobilityPerf.syncTrial = async(count) => {
  if(pendingResidentPresentation)throw Error("Viewport still fitting");
  const companions=[...rows].filter(([,r])=>r.kind==='companion');
  if(rows.size!==28||companions.length!==26)throw Error("Reference household is incomplete");
  const expected=companions.slice(0,count);
  const replaceStart=performance.now();
  for(const [key,row] of expected)row.owner.replaceWith(row.owner.cloneNode(true));
  const oldOwners=expected.map(([k,row])=>row.owner);
  const start=performance.now();
  sync();
  const syncEnded=performance.now();
  const rebound=expected.every(([key],i)=>rows.get(key)?.owner!==oldOwners[i]&&rows.get(key)?.owner.isConnected);
  if(!rebound||rows.size!==28||pendingResidentPresentation)throw Error("Native row replacement did not settle in this sync");
  // Enforce the native image decode and layout before starting the next trial.
  await Promise.all([...rows.values()].map(r=>r.owner.querySelector('img.character-asset')?.decode()).filter(Boolean));
  return {count, replacementMs:start-replaceStart, nativeSyncMs:syncEnded-start, afterDecodeMs:performance.now()-start};
};
"""


def run_sync(args):
    def attach(name, body):
        if "production-diorama" in name:
            return common.clock.replace(body, "    function stop(){", SYNC + "\n    function stop(){")
        return body
    result = {"samplesPerReplacementCount": 20, "warmupCycles": 2, "rows": []}
    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=common.WPE)
        result["browser"] = browser.version
        for arm in args.order.split(","):
            page, errors, assets = common.native_page(browser, args.base, arm, transform=attach)
            try:
                page.wait_for_timeout(600)
                trials = []
                for cycle in range(22):
                    counts = (0, 1, 26) if cycle % 2 == 0 else (26, 1, 0)
                    for count in counts:
                        page.evaluate("new Promise(r=>mobilityPerf.nativeRaf(()=>mobilityPerf.nativeRaf(r)))")
                        record = page.evaluate("n=>mobilityPerf.syncTrial(n)", count)
                        if cycle >= 2:
                            trials.append(record)
                assert not errors, errors
                result["rows"].append(dict(arm=arm, assets=assets, samples=trials))
                common.save(args.out, result)
            finally:
                page.close()
        browser.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("suite", choices=["native", "replay", "sync", "touch"])
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    p.add_argument("--order", default=DEFAULT_ORDER)
    p.add_argument("--seconds", type=float, default=180)
    p.add_argument("--warmup", type=float, default=8)
    p.add_argument("--trace", action="store_true")
    p.add_argument("--tape", type=Path)
    p.add_argument("--kind", choices=["fixed", "stress"], default="fixed")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    if args.suite == "native":
        native.native_page = attributed_page
        native.run(args)
    elif args.suite == "touch":
        common.ARMS = args.order.split(",")
        path = common.V9 / "performance-touch.py"
        sys.argv = [str(path), "--base", args.base, "--out", str(args.out)]
        runpy.run_path(str(path), run_name="__main__")
    elif args.suite == "sync":
        run_sync(args)
    else:
        if not args.tape:
            p.error("--tape is required for a replay")
        run_replay(args)


if __name__ == "__main__":
    main()
