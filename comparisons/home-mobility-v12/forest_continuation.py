"""Replay full native model openings at a fixed clock, independently of the wall-time cohorts."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

from playwright.sync_api import sync_playwright
from forest_watch import observe, baseline
from forest_results import attach_curves, v9

INJECT = """
    globalThis.forestSameClock=(state,ticks,pose,interval)=>{
      if(state.relief||state.waiting.length||state.manualGoals.length)throw Error("Opening contains pending work");
      const original=forestCheckpoint();
      const feet=s=>s.actors.map(a=>[a.key,a.x,a.y,a.w,a.h,a.nextAt,a.activity,a.target,a.route]);
      if(JSON.stringify(feet(original))!==JSON.stringify(feet(state))||original.seed!==state.seed) throw Error("Opening or stream did not match the capture");
      // Early V10 logs predate the diagnostics for these two V10 scheduling fields.
      // A witness starts at clock zero; admit missing fields only if today's real opening has none pending.
      if(!Object.hasOwn(state,"crowdMisses")||!Object.hasOwn(state,"reopenedKey")){
        if(!pose||state.clock!==0||original.crowdMisses.length||original.reopenedKey!=null)throw Error("Unrecorded opening scheduling state");
        state={...original,...state};
      }
      actors=structuredClone(state.actors);clock=state.clock;selected=state.selected;idleAt=state.idleAt;
      if(pose){
        if(pose.length!==actors.length || pose.some(([k,x,y,w,h],i)=>k!==actors[i].key||w!==actors[i].w||h!==actors[i].h||actors[i].target))throw Error("Incompatible posed household");
        pose.forEach(([k,x,y],i)=>{actors[i].x=x;actors[i].y=y;});
      }
      paused=false;nextRecovery=state.nextRecovery;earlyKey=state.earlyKey;reopenedKey=state.reopenedKey;
      retryingKey=null;relief=null;resuming=false;continuing=null;
      for(const [map,values] of [[cooldown,state.cooldown],[crowdMisses,state.crowdMisses],[helpedAt,state.helpedAt],[manualGoals,state.manualGoals],[waiting,state.waiting]]){
        map.clear();for(const [k,v] of structuredClone(values))map.set(k,v);
      }
      Object.assign(stats,structuredClone(state.stats));
      globalThis.setForestSeed(state.seed);
      const frames=[];
      for(let i=0;i<ticks;i++){
        step(1/30,{autonomy:true});
        if(interval&&clock>=interval[0]-1e-7&&clock<=interval[1]+1e-7){
          frames.push([clock,actors.map(a=>[a.key,a.x,a.y,a.activity,a.source,a.face??null])]);
        }
      }
      return {arm:HomeMobilityDiagnostics.read().arm,log:forestLog(),state:forestCheckpoint(),frames};
    };
"""


def physical_digest(native):
    log = native["log"]
    value = [
        native["state"],
        *[log[name] for name in ("requests", "motions", "choices", "budget", "syncs")],
    ]
    return hashlib.sha256(
        json.dumps(
            value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode()
    ).hexdigest()


def check(
    base,
    source_dir,
    out,
    seconds,
    profiles,
    game,
    witness=None,
    alternative=None,
    controls=None,
    only=None,
    interval=None,
):
    summaries = []
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as api:
        browser = api.chromium.launch(executable_path="/usr/bin/chromium")
        for profile in profiles:
            path = (
                Path(witness["opening"])
                if witness
                else next(
                    source_dir.glob("[0-9]*/" + profile + "-v11-foot/forest28.json.gz")
                )
            )
            fixture = json.loads(gzip.decompress(path.read_bytes()))
            initial = fixture["initial"]
            width, seed, order, layout, _ = profile.split("-")
            records = {}
            for tag, policy in [
                ("baseline", "v12" if witness else "v11-foot"),
                ("candidate", "v12"),
                ("candidate-repeat", "v12"),
            ]:
                if only and tag != only:
                    continue
                if alternative and tag == "baseline":
                    continue
                pose = (
                    witness["before" if tag == "baseline" else "after"]
                    if witness
                    else None
                )
                arm = policy + ("-reference" if layout == "reference" else "")
                model = "home-production-model-mobility-" + arm + ".js"
                context = browser.new_context(
                    viewport={"width": int(width), "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                    timezone_id="Asia/Tokyo",
                    locale="ja-JP",
                )
                context.add_init_script(
                    baseline.prior.SEED.replace("let seed=214;", f"let seed={seed};")
                )
                page = context.new_page()
                hashes = {}

                def hook(route):
                    name = Path(route.request.url.split("?")[0]).name
                    res = route.fetch()
                    body = res.text()
                    if name == model and alternative and policy == "v12":
                        body = (alternative / model).read_text()
                    hashes[name] = hashlib.sha256(body.encode()).hexdigest()
                    if name == model:
                        body = observe(body)
                        body = baseline.replace_once(
                            body,
                            "    return {metrics:",
                            INJECT + "    return {metrics:",
                        )
                    elif name == "fixture.js":
                        body = baseline.fixture_script(body, int(order), int(seed))
                    elif name.startswith("drag-trial-hooks"):
                        body = baseline.replace_once(
                            body,
                            "let seed = 214;",
                            f"let seed = {seed};globalThis.setForestSeed=n=>{{seed=n}};globalThis.forestSeed=()=>seed;",
                        )
                    else:
                        body = baseline.replace_once(
                            body, "let actorSeed=214;", f"let actorSeed={seed};"
                        )
                    route.fulfill(response=res, body=body)

                page.route(
                    re.compile(
                        r"/(?:home-production-model-mobility-[\w-]+\.js|drag-trial-hooks[\w-]*\.js|beauty/fixture\.js|population-beauty\.js)(?:\?|$)"
                    ),
                    hook,
                )
                page.goto(
                    baseline.forest_url(base, arm),
                    wait_until="domcontentloaded",
                    timeout=120000,
                )
                page.wait_for_function(
                    "HomeCastTrial?.ready&&HomeDragTrial.opening()&&typeof window.forestSameClock==='function'",
                    timeout=120000,
                )
                page.evaluate(
                    'Promise.all([...document.querySelectorAll("#castStage img.character-asset")].map(i=>i.decode()))'
                )
                page.evaluate("HomeMobilityDiagnostics.enable()")
                run = page.evaluate(
                    "args=>forestSameClock(...args)",
                    [initial, seconds * 30, pose, interval],
                )
                context.close()
                if policy == "v11-foot":
                    assert hashes[model] == fixture["sources"][model]["source"]
                if game:
                    expected_model = (
                        alternative if alternative and policy == "v12" else game
                    ) / model
                    assert v9.sha(expected_model) == hashes[model]
                run["arm"] = arm
                run["seed"] = int(seed)
                # Drop tab's URL/resource timing. The identical model messages, RNG,
                # 28 ending states and all actual steps are the reproducibility criteria.
                run["log"].pop("projectionSources", None)
                normal = [
                    l
                    for l in v9.legs(run)
                    if l["completed_normal"] and l["finish_s"] <= seconds + 1e-7
                ]
                people = {a["key"]: 0 for a in initial["actors"]}
                for leg in normal:
                    people[leg["key"]] += 1
                t = run["state"]["clock"]
                assert abs(t - initial["clock"] - seconds) < 1e-6
                cohort, counts = attach_curves(run, cutoff=t)
                native = {k: run[k] for k in ("state", "log")}
                digest = hashlib.sha256(
                    json.dumps(
                        native,
                        ensure_ascii=False,
                        sort_keys=True,
                        separators=(",", ":"),
                    ).encode()
                ).hexdigest()
                if interval:
                    frames = run["frames"]
                    assert len(frames) == round((interval[1] - interval[0]) * 30) + 1
                    assert all(len(frame) == 28 for when, frame in frames)
                    with gzip.open(
                        out / (profile + "-" + tag + "-frames.json.gz"),
                        "wt",
                        compresslevel=6,
                    ) as f:
                        json.dump(
                            dict(
                                opening=v9.sha(path),
                                arm=arm,
                                hashes=hashes,
                                nativeSHA=digest,
                                frames=frames,
                            ),
                            f,
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                records[tag] = (native, digest)
                physical = physical_digest(native)
                baseline_match = None
                if controls:
                    original = controls / (profile + "-baseline.json.gz")
                    if original.is_file():
                        control = json.loads(gzip.decompress(original.read_bytes()))
                        assert control["opening"] == initial
                        baseline_match = physical == physical_digest(
                            control["trajectory"]
                        )
                        print(
                            profile,
                            tag,
                            "whole native behavior identical to V11-foot:",
                            baseline_match,
                            flush=True,
                        )
                findings = dict(
                    profile=profile,
                    tag=tag,
                    witness=witness["provenance"] if witness else None,
                    model=hashes[model],
                    openingSHA256=v9.sha(path),
                    seed=initial["seed"],
                    finalSeed=run["state"]["seed"],
                    seconds=seconds,
                    digest=digest,
                    physicalSHA256=physical,
                    identicalPhysicalBehaviorToFootBaseline=baseline_match,
                    once=sum(n > 0 for n in people.values()),
                    twice=sum(n > 1 for n in people.values()),
                    both=sum(
                        any(
                            l["key"] == k and l["finish_s"] <= seconds / 2
                            for l in normal
                        )
                        and any(
                            l["key"] == k and l["finish_s"] > seconds / 2
                            for l in normal
                        )
                        for k in people
                    ),
                    normal=sum(people.values()),
                    distance_css=round(sum(l["css_distance"] for l in normal), 3),
                    searches=len(cohort),
                    plans=sum(e["found"] for e in cohort),
                    physicalPlans=sum(
                        any(h["native_steps"] for h in e["helpers"]) for e in cohort
                    ),
                    owners=sum(e["owner_strict_normal"] for e in cohort),
                    normalPerResident=people,
                    tracking={k: dict(v) for k, v in counts.items()},
                )
                summaries.append(findings)
                with gzip.open(
                    out / (profile + "-" + tag + ".json.gz"), "wt", compresslevel=3
                ) as target:
                    json.dump(
                        dict(
                            opening=initial,
                            posedFeet=pose,
                            sources=hashes,
                            trajectory=native,
                        ),
                        target,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                print(
                    profile,
                    tag,
                    "normal",
                    findings["normal"],
                    "search",
                    findings["searches"],
                    "plans",
                    findings["plans"],
                    "actual",
                    findings["physicalPlans"],
                    flush=True,
                )
            assert only or records["candidate"][1] == records["candidate-repeat"][1], (
                profile,
                "Native repeat diverged",
            )
        browser.close()
    (out / "forest-same-clock.json").write_text(
        json.dumps(summaries, indent=2, ensure_ascii=False) + "\n"
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("base")
    p.add_argument("archived", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--seconds", type=int, default=600)
    p.add_argument("--game", type=Path)
    p.add_argument("profiles", nargs="+")
    p.add_argument(
        "--alternative",
        type=Path,
        help="diagnostic-only model replacement directory on a loopback origin",
    )
    p.add_argument(
        "--controls", type=Path, help="certified full-step V11-foot reference tapes"
    )
    p.add_argument("--only", choices=["baseline", "candidate", "candidate-repeat"])
    p.add_argument("--interval", nargs=2, type=float, metavar=("START", "END"))
    a = p.parse_args()
    check(
        a.base,
        a.archived,
        a.out,
        a.seconds,
        a.profiles,
        a.game,
        alternative=a.alternative,
        controls=a.controls,
        only=a.only,
        interval=a.interval,
    )
