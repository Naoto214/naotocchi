"""Paired local CLOCK and fixed-step checks in real, decoded game frames (Playwright)."""

import argparse
import hashlib
import json
import os
import platform
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
INIT = """window.finishPerf={parts:{},slow:[],add(name,start){const end=performance.now(),ms=end-start;
 if(ms>=50)this.slow.push([name,start,end]);
 const p=this.parts[name]??={ms:0,calls:0,max:0};p.ms+=ms;p.calls++;p.max=Math.max(p.max,ms);},
 plan(fn){let t=performance.now();try{return fn();}finally{this.add('route',t)}}};"""
# Only the separate attribution trace wraps browser scheduling callbacks. Stacks
# are captured when a timer is registered, never on the normal CLOCK pass.
TASK_TRACE = """(() => {
  for(const name of ['setTimeout','setInterval','requestAnimationFrame']){
    const original=window[name];
    window[name]=function(callback,...args){
      if(typeof callback!=='function')return original.call(this,callback,...args);
      const location=(new Error().stack||'').split('\\n').find(line=>/https?:/.test(line))||'';
      return original.call(this,function(...params){
        const start=performance.now();
        try{return callback.apply(this,params);}finally{
          const end=performance.now();
          if(end-start>=50)finishPerf.slow.push([name+' '+(callback.name||'anonymous')+' '+location,start,end]);
        }
      },...args);
    };
  }
})();"""
SAMPLE = """async ([seconds,seed])=>{
 const opening=finishPerf.reset(seed);
 const probe=finishPerf;probe.parts={};probe.slow=[];const gaps=[],start=performance.now(),stage=document.querySelector('#castStage');
 const before=probe.live.metrics(),nodes=[...stage.querySelectorAll('[data-diorama-actor]')];
 let previous=start;HomeCastTrial.apply({paused:false});
 await new Promise(resolve=>{function frame(){const t=performance.now();gaps.push(t-previous);previous=t;if(t-start>=seconds*1000)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame)});
 const end=performance.now(),after=probe.live.metrics(),phases={...probe.parts},sorted=[...gaps].sort((a,b)=>a-b);
 return {opening,slow:probe.slow.map(([phase,a,b])=>[phase,a-start,b-start]),elapsedMs:end-start,clock:after.clock-before.clock,frames:gaps.length,hz:gaps.length*1000/(end-start),p50:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1),
 over250:gaps.filter(x=>x>250).length,over500:gaps.filter(x=>x>500).length,over1000:gaps.filter(x=>x>1000).length,intervals:gaps,phases,moves:after.moves-before.moves,distance:after.distance-before.distance,sameNodes:nodes.every(n=>n.isConnected),rows:nodes.length};}"""


def sub(s, before, after):
    assert s.count(before) == 1, before
    return s.replace(before, after)


def host_load():
    stat = Path("/sys/fs/cgroup/cpu.stat")
    return {
        "load": os.getloadavg(),
        "cpu": {
            line.split()[0]: int(line.split()[1])
            for line in stat.read_text().splitlines()
        }
        if stat.exists()
        else {},
    }


def run_sample(browser, url, scene, args, repeat, seed):
    profile = args.mode == "phases" or args.profile_sustained
    region, width, count = scene.split(",")
    width, count = int(width), int(count)
    height = {375: 760, 390: 792, 430: 880}[width]
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=2,
        has_touch=True,
        is_mobile=True,
    )
    ctx.add_init_script(INIT + (TASK_TRACE if args.tasks else ""))
    hashes = {}
    errors = []

    def instrument(route):
        response = route.fetch()
        source = response.text()
        name = Path(urlparse(route.request.url).path).name
        hashes[name] = hashlib.sha256(source.encode()).hexdigest()
        if "diorama" in name:
            old = "const model=modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit});"
            source = sub(
                source,
                old,
                """let model=finishPerf.live=modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit});
              finishPerf.reset=seed=>{
                const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
                model=finishPerf.live=modelAPI.createModel({random,onEvent:emit});model.sync(...finishPerf.scene);paint();
                return model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]);
              };""",
            )
            if profile:
                source = sub(
                    source,
                    "    function sync(){",
                    "    function sync(){const t=performance.now();try{return perfSync();}finally{finishPerf.add('sync',t);}}\n    function perfSync(){",
                )
                source = sub(
                    source,
                    "for(let remaining=",
                    "const probe=finishPerf,mt=performance.now();for(let remaining=",
                )
                old = "world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();"
                source = sub(
                    source,
                    old,
                    "probe.add('model',mt);const wt=performance.now();"
                    + old.removesuffix("paint();")
                    + "probe.add('world',wt);const at=performance.now();paint();probe.add('actors',at);",
                )
        elif "model" in name:
            source = sub(
                source,
                "function sync(list,next){",
                "function sync(list,next){if(next.navigation&&list.length)finishPerf.scene=[list,next];",
            )
            if profile:
                source = sub(
                    source,
                    "return {metrics:()=>({...stats",
                    "const syncModel=sync;sync=(...args)=>{const t=performance.now();try{return syncModel(...args);}finally{finishPerf.add('seating',t);}};return {metrics:()=>({...stats",
                )
                source = sub(
                    source, "const plan=nav=>{", "const plan=nav=>finishPerf.plan(()=>{"
                )
                old = "return {point:q,path,originalReference,expandedReference};\n      };"
                source = sub(source, old, old[:-2] + "});")
        elif "world" in name and profile:
            (anchor,) = [
                line.strip()
                for line in source.splitlines()
                if line.strip().startswith("composeNature(ctx,t,host,fade,")
            ]
            source = sub(
                source,
                anchor,
                "const nt=performance.now();" + anchor + "finishPerf.add('nature',nt);",
            )
        elif name == "script-v2.js" and args.mode == "sustained":
            anchor = (
                "  window.addEventListener('home-v6-egg-ready',()=>renderHomeCast());"
            )
            source = sub(
                source,
                anchor,
                """  finishPerf.blockingState=()=>({
              hidden:document.visibilityState==='hidden',menu:isAnyMenuOverlayOpen(),individuality:individualityDialogOpen,
              conversation:conv2Unit?.kind??null,lowerNoticeMs:Math.max(0,homeV11Presentation().lowerUntil-Date.now()),
              sleeping:!!state.isSleeping,sick:!!state.isSick,dying:!!state.dying,transform:!!state.transformOptions,
              lifeCard:!el.lifeCardOverlay.classList.contains('hidden'),birth:!!birthCelebration,game:!!gameActive,meguru:!!meguruActive,
              movie:document.body.classList.contains('movie-active'),screenHidden:el.screenNormal.classList.contains('hidden'),
              castReaction:el.castResponse.dataset.reaction||null,actorReactions:homeCastActors().map(a=>a.node.dataset.reaction).filter(Boolean),
              blocked:!!homeDioramaBlocked(),buttons:[...document.querySelectorAll('[role=dialog] button')]
                .filter(b=>b.getBoundingClientRect().height>0).map(b=>[b.id,b.textContent.trim()]).slice(0,12)
            });\n"""
                + anchor,
            )
        elif "beauty" in name and seed != 214:
            source = sub(source, "let actorSeed=214;", f"let actorSeed={seed};")
        route.fulfill(response=response, body=source)

    for pattern in (
        "**/home-production-diorama*.js*",
        "**/home-production-model*.js*",
        "**/home-production-touch*.js*",
        "**/home-production-world*.mjs*",
        "**/*beauty.js*",
        "**/*-navigation*.mjs*",
    ):
        ctx.route(pattern, instrument)
    try:
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        if args.mode == "sustained":
            ctx.route("**/script-v2.js*", instrument)
            page.clock.set_system_time(datetime(2026, 10, 15, 3, tzinfo=UTC))
        else:
            page.clock.set_fixed_time(datetime(2026, 10, 15, 3, tzinfo=UTC))
        query = urlencode(
            {
                "region": region,
                "count": count,
                "policy": "B",
                "curve": "linear",
                "layout": "optimized",
                "time": "day",
                "clock": 0,
                "paused": 1,
                "variant": "B",
                "compareSplit": 0,
                "season": "autumn",
                "weather": "sunny",
                "ground": "on",
            }
        )
        document = page.goto(
            url + "?" + query, wait_until="domcontentloaded", timeout=120000
        )
        hashes[Path(urlparse(url).path).name] = hashlib.sha256(
            document.body()
        ).hexdigest()
        page.wait_for_function(
            """n=>window.HomeCastTrial?.ready && window.finishPerf.live && HomeCastTrial.inspect().length===n && HomeBeauty.paintRect?.width""",
            arg=count,
            polling=200,
            timeout=150000,
        )
        page.evaluate(
            "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(e=>e.decode()))"
        )
        opening = page.evaluate(
            """()=>({actors:finishPerf.live.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]),scales:['pet','partner','companion'].map(k=>HomeCastTrial.scale(k)),settings:HomeCastTrial.settings,viewport:[innerWidth,innerHeight]})"""
        )
        assert opening["viewport"] == [width, height] and opening["settings"]["paused"]
        host_start = host_load()
        if args.mode == "replay":
            sample = page.evaluate(
                (HERE / "performance-replay.js").read_text(), [seed, args.steps]
            )
        elif args.mode == "sustained":
            observer = (HERE / "performance-sustained.js").read_text()
            page.on(
                "console",
                lambda msg: (
                    print(msg.text, flush=True)
                    if msg.text.startswith("sustained pause ")
                    else None
                ),
            )
            page.evaluate(
                "args => { ("
                + observer
                + ")(args).then(r=>finishPerf.finished=r).catch(e=>finishPerf.failure=String(e)); }",
                [args.seconds, seed],
            )
            dismissals = []
            while True:
                page.wait_for_function(
                    "finishPerf.finished || finishPerf.failure || finishPerf.dismissRequested",
                    polling=500,
                    timeout=(args.seconds + 120) * 1000,
                )
                status = page.evaluate(
                    "()=>({done:!!finishPerf.finished,failure:finishPerf.failure,request:finishPerf.dismissRequested})"
                )
                assert not status.get("failure"), status
                if status["done"]:
                    break
                assert status["request"]["id"] == "individualityLater", status
                button = page.get_by_role("button", name="あとで", exact=True).and_(
                    page.locator("#individualityLater")
                )
                button.click(timeout=5000)
                assert not button.is_visible()
                dismissals.append(status["request"])
                page.evaluate("finishPerf.dismissRequested=null")
            sample = page.evaluate("finishPerf.finished")
            sample["dismissals"] = dismissals
        else:
            sample = page.evaluate(SAMPLE, [args.seconds, seed])
        assert not errors, errors
        if args.mode != "replay":
            assert (
                sample["sameNodes"] and sample["rows"] == count and sample["clock"] > 0
            )
        return {
            "scene": scene,
            "repeat": repeat,
            "seed": seed,
            "opening": opening,
            "sample": sample,
            "hashes": hashes,
            "hostStart": host_start,
            "hostEnd": host_load(),
        }
    finally:
        ctx.close()


def main(args):
    output = (
        json.loads(args.out.read_text())
        if args.out.exists()
        else {
            "mode": args.mode,
            "host": platform.platform(),
            "engine": args.engine,
            "seconds": args.seconds,
            "steps": args.steps,
            "taskTrace": args.tasks,
            "profileSustained": args.profile_sustained,
            "rows": [],
        }
    )
    assert (output["mode"], output["engine"], output["seconds"], output["steps"]) == (
        args.mode,
        args.engine,
        args.seconds,
        args.steps,
    )
    if args.profile_sustained:
        assert args.mode == "sustained" and output.get("profileSustained"), (
            "Profile sustained work in a separate file"
        )
    if args.tasks:
        assert args.mode == "phases" and output.get("taskTrace"), (
            "Task attribution belongs in a separate phase run"
        )
    args.out.parent.mkdir(exist_ok=True, parents=True)
    with sync_playwright() as pw:
        exe = (
            os.getenv("WEBKIT_PATH")
            if args.engine == "webkit"
            else os.getenv("CHROMIUM_PATH", "/usr/bin/chromium")
        )
        browser = getattr(pw, args.engine).launch(executable_path=exe)
        output["version"] = browser.version
        for repeat in range(args.repeat):
            for index, scene in enumerate(args.scene):
                seed = (214, 2903)[repeat % 2]
                pair = (
                    ["before", "after"]
                    if (repeat + index) % 2 == 0
                    else ["after", "before"]
                )
                for variant in pair:
                    if any(
                        (r["scene"], r["repeat"], r["variant"])
                        == (scene, repeat, variant)
                        for r in output["rows"]
                    ):
                        continue
                    row = run_sample(
                        browser, getattr(args, variant), scene, args, repeat, seed
                    )
                    row["variant"] = variant
                    output["rows"].append(row)
                    temp = args.out.with_suffix(".part")
                    temp.write_text(
                        json.dumps(output, ensure_ascii=False, separators=(",", ":"))
                        + "\n"
                    )
                    temp.replace(args.out)
                    s = row["sample"]
                    print(
                        scene,
                        variant,
                        repeat,
                        {
                            k: s[k]
                            for k in [
                                "max",
                                "over500",
                                "over1000",
                                "clock",
                                "elapsedMs",
                                "digest",
                            ]
                            if k in s
                        },
                        flush=True,
                    )
        browser.close()
    for repeat in range(args.repeat):
        for scene in args.scene:
            rows = [
                r
                for r in output["rows"]
                if r["scene"] == scene and r["repeat"] == repeat
            ]
            a, b = rows
            assert a["opening"]["scales"] == b["opening"]["scales"], ("scale", scene)
            if args.mode != "replay":
                assert a["sample"]["opening"] == b["sample"]["opening"], (
                    "native starting seats",
                    scene,
                )
            if args.mode == "replay":
                assert (
                    a["sample"]["digest"] == b["sample"]["digest"]
                    and a["sample"]["saveStable"]
                    and b["sample"]["saveStable"]
                ), ("replay", scene, repeat)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--before", required=True)
    p.add_argument("--after", required=True)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--engine", choices=["webkit", "chromium"], default="webkit")
    p.add_argument(
        "--mode", choices=["clock", "phases", "replay", "sustained"], required=True
    )
    p.add_argument("--scene", action="append", required=True)
    p.add_argument("--tasks", action="store_true")
    p.add_argument("--profile-sustained", action="store_true")
    p.add_argument("--repeat", type=int, default=2)
    p.add_argument("--seconds", type=float, default=12)
    p.add_argument("--steps", type=int, default=300)
    main(p.parse_args())
