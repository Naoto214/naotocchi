"""Native Linux WebKit frame timing with optional JS/worker/scheduler attribution."""

import argparse
import hashlib
import json
import os
import re
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse

import psutil
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
INIT = """window.mobilityPerf={nativeRaf:requestAnimationFrame.bind(window),nativeAtBoot:Object.fromEntries(Object.entries({rAF:requestAnimationFrame,timer:setTimeout,now:performance.now}).map(([k,v])=>[k,Function.prototype.toString.call(v).includes('[native code]')])),active:false,count:{},parts:{},slow:[],context:'other',
 hit(label){this.count[label]=(this.count[label]||0)+1;},
 finish(label,start,limit=12){const t=performance.now(),dt=t-start,p=this.parts[label]||={calls:0,ms:0,max:0};p.calls++;p.ms+=dt;p.max=Math.max(p.max,dt);if(dt>=limit)this.slow.push([label,start,t]);}};"""
DOM = """(()=>{const q=mobilityPerf;for(const [obj,key] of [[Element.prototype,'getBoundingClientRect'],[window,'getComputedStyle']]){
 const fn=obj[key];obj[key]=function(...args){if(!q.active)return fn.apply(this,args);q.hit(q.context+'.'+key);if(key==='getBoundingClientRect'&&this.classList.contains('home-living-world'))q.hit(q.context+'.worldRect');return fn.apply(this,args);};}
 const named=new WeakMap();for(const api of ['setTimeout','setInterval','requestAnimationFrame']){const orig=window[api];window[api]=function(cb,...args){if(typeof cb!=='function')return orig.call(this,cb,...args);let where=named.get(cb);if(where===undefined){where=cb.name==='apply'?(new Error().stack||'').split('\\n').find(x=>/home-production|script-v2/.test(x))||'':'';named.set(cb,where);}const label=api+' '+(cb.name||'anonymous')+(where?' '+where:'');return orig.call(this,function(...v){if(!q.active)return cb.apply(this,v);const t=performance.now();try{return cb.apply(this,v)}finally{q.finish(label,t,25);}},...args);};}})();"""


def replace(src, old, new):
    assert src.count(old) == 1, old
    return src.replace(old, new)


def wrap(src, name, label=None, threshold=12):
    # The genuine implementation (including all early returns) stays intact in
    # trace mode. No wrappers or counter calls enter the normal timing arm.
    match = re.search(r"function " + name + r"\(([^()]*?)\)\{", src)
    if not match:
        return src
    anchor = match.group()
    newname = "perf_" + name
    label = label or name
    body = f"""if(!mobilityPerf.active)return {newname}.apply(this,arguments);const stamp=performance.now(),ctx=mobilityPerf.context;mobilityPerf.context='{label}';try{{return {newname}.apply(this,arguments);}}finally{{mobilityPerf.finish('{label}',stamp,{threshold});mobilityPerf.context=ctx;}}}}"""
    return replace(
        src,
        anchor,
        anchor
        + body
        + " "
        + anchor.replace("function " + name + "(", "function " + newname + "("),
    )


def native(filename, source, trace):
    if "production-model" in filename:
        source = replace(
            source,
            "function sync(list,next){",
            "function sync(list,next){if(next.navigation&&list.length)mobilityPerf.scene=[list,next];",
        )
        if trace:
            for name in [
                "move",
                "step",
                "offerYield",
                "dragDestination",
                "ambient",
                "choose",
            ]:
                source = wrap(
                    source, name, threshold=0 if name in ("step", "offerYield") else 8
                )
            for sign in [
                "function contactSegmentSafe(from,to,peer,rx,ry){",
                "function clearance(a,p,b){",
            ]:
                if sign in source:
                    key = sign.split("(")[0].split(" ")[1]
                    source = replace(
                        source,
                        sign,
                        sign
                        + "if(mobilityPerf.active)mobilityPerf.hit('"
                        + key
                        + "');",
                    )
            start = "const plan=nav=>{"
            end = "return {point:q,path,originalReference,expandedReference};\n      };"
            if source.count(start) == 1 and source.count(end) == 1:
                source = replace(
                    source, start, "const plan=nav=>{const t=performance.now();try{"
                )
                source = replace(
                    source,
                    end,
                    end[:-2]
                    + "}finally{if(mobilityPerf.active)mobilityPerf.finish('route',t,8);}};",
                )
    if "production-diorama" in filename:
        anchor = "const model=modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit});"
        source = replace(
            source,
            anchor,
            """let model=mobilityPerf.live=modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit});
        mobilityPerf.reset=seed=>{const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};model=mobilityPerf.live=modelAPI.createModel({random,onEvent:emit});model.bindMobility?.();model.sync(...mobilityPerf.scene);paint();return model;};""",
        )
        if trace:
            for name in [
                "paint",
                "paintForeground",
                "actorBounds",
                "sync",
                "applyHomeBlock",
            ]:
                source = wrap(source, name)
    if trace and "production-world" in filename:
        source = wrap(source, "draw", "world")
        anchor = next(
            line.strip()
            for line in source.splitlines()
            if line.strip().startswith("composeNature(ctx,t,host,fade,")
        )
        source = replace(
            source,
            anchor,
            "const pn=performance.now();"
            + anchor
            + "if(mobilityPerf.active)mobilityPerf.finish('nature',pn);",
        )
    return source


def host():
    return {
        k: int(v)
        for k, v in (
            line.split()
            for line in Path("/sys/fs/cgroup/cpu.stat").read_text().splitlines()
        )
    }


class Scheduler:
    def __init__(self, interval):
        self.interval = interval
        self.cpu_seconds = 0
        self.rows = []
        self.stop = threading.Event()
        self.mark = None

    def begin(self, js):
        self.mark = [time.monotonic(), js]
        self.thread = threading.Thread(target=self.collect, daemon=True)
        self.thread.start()

    def collect(self):
        started_cpu = time.thread_time()
        procs = [
            p
            for p in psutil.Process().children(recursive=True)
            if "WPE" in p.name() or "MiniBrowser" in p.name()
        ]
        threads = {}
        for proc in procs:
            if proc.name() != "WPEWebProcess":
                continue
            for task in Path(f"/proc/{proc.pid}/task").iterdir():
                try:
                    label = task.joinpath("comm").read_text().strip().lower()
                except FileNotFoundError:
                    continue
                group = (
                    "main"
                    if task.name == str(proc.pid)
                    else "raster"
                    if re.search("llvmpipe|skiacpu", label)
                    else "compositor"
                    if "compositor" in label
                    else "gc"
                    if re.search("heaphelper|ollector", label)
                    else "jit"
                    if "jit" in label
                    else "other"
                )
                threads[task / "schedstat"] = group
        while not self.stop.is_set():
            thread_cpu = {}
            for file, group in threads.items():
                try:
                    ns = int(file.read_text().split()[0])
                    thread_cpu[group] = thread_cpu.get(group, 0) + ns
                except FileNotFoundError:
                    continue
            counts = {}
            for p in procs:
                try:
                    stat = Path(f"/proc/{p.pid}/schedstat").read_text().split()
                    cpu = p.cpu_times()
                    counts[str(p.pid)] = [
                        p.name(),
                        round((cpu.user + cpu.system) * 1000),
                        round(int(stat[0]) / 1e6, 2),
                        round(int(stat[1]) / 1e6, 2),
                        int(stat[2]),
                    ]
                except (FileNotFoundError, psutil.NoSuchProcess):
                    continue
            c = host()
            self.rows.append(
                [
                    round((time.monotonic() - self.mark[0]) * 1000, 2),
                    c["usage_usec"],
                    c["nr_throttled"],
                    c["throttled_usec"],
                    counts,
                    {k: round(ns / 1e6, 2) for k, ns in thread_cpu.items()},
                ]
            )
            self.stop.wait(self.interval)
        self.cpu_seconds = time.thread_time() - started_cpu

    def end(self):
        self.stop.set()
        if self.mark:
            self.thread.join(1)


def sample(browser, url, args, arm):
    trace = args.trace
    ctx = browser.new_context(
        viewport={"width": 390, "height": 792},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    hashes = {}
    errors = []
    os_probe = Scheduler(0.12 if args.quiet else 0.045)
    native_clock = """const original=Date,offset=Date.UTC(2026,9,15,3)-original.now();
    globalThis.Date=new Proxy(original,{
      construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[original.now()+offset],newTarget);},
      apply(){return new original(original.now()+offset).toString();},
      get(target,k,receiver){if(k==='now')return ()=>original.now()+offset;return Reflect.get(target,k,receiver);}
    });"""
    ctx.add_init_script(
        "(()=>{" + native_clock + INIT + (DOM if trace else "") + "})();"
    )

    def route(r):
        response = r.fetch()
        name = Path(urlparse(r.request.url).path).name
        text = response.text()
        hashes[name] = hashlib.sha256(text.encode()).hexdigest()
        if arm.endswith("~") and "production-touch" in name:
            text = args.test_touch.read_text()
            hashes[name + ".isolated-patch"] = hashlib.sha256(text.encode()).hexdigest()
        if args.hud_cost and name == "telemetry.js":
            anchor = "window.HomeMobilityDiagnostics=Object.freeze(api);"
            text = replace(
                text,
                anchor,
                """for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(api))){
              if(typeof descriptor.value!=='function')continue;
              const original=descriptor.value;
              api[key]=function(...args){if(!mobilityPerf.active)return original.apply(this,args);
                const start=performance.now();try{return original.apply(this,args);}finally{mobilityPerf.finish('diagnostics.'+key,start);}};
            }"""
                + anchor,
            )
        r.fulfill(response=response, body=native(name, text, trace))

    for pat in (
        "**/*production-model*.js*",
        "**/*production-diorama*.js*",
        "**/*production-world*.mjs*",
        "**/script-v2*.js*",
        "**/telemetry.js*",
        "**/*production-touch*.js*",
    ):
        ctx.route(pat, route)
    try:
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        if args.legacy_clock:
            page.clock.set_system_time(datetime(2026, 10, 15, 3, tzinfo=UTC))
        if trace or args.quiet:
            page.expose_function("markSampling", os_probe.begin)
        params = {
            "region": "forest",
            "count": 28,
            "time": "day",
            "season": "autumn",
            "weather": "sunny",
            "paused": 1,
            "clock": 0,
            "variant": "B",
            "policy": "B",
            "layout": "optimized",
            "curve": "linear",
            "compareSplit": 0,
            "ground": "on",
            "diagnostics": int(arm.endswith("+")),
        }
        document = page.goto(
            url + "?" + urlencode(params), wait_until="domcontentloaded", timeout=120000
        )
        hashes[Path(urlparse(url).path).name] = hashlib.sha256(
            document.body()
        ).hexdigest()
        page.wait_for_function(
            "window.HomeCastTrial?.ready&&window.mobilityPerf?.reset&&mobilityPerf.scene&&HomeCastTrial.inspect().length===28",
            timeout=120000,
        )
        page.evaluate(
            "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(e=>e.decode()))"
        )
        scheduling = page.evaluate(
            "()=>Object.fromEntries(Object.entries({rAF:requestAnimationFrame,timer:setTimeout,now:performance.now}).map(([k,v])=>[k,Function.prototype.toString.call(v).includes('[native code]')]))"
        )
        initialScheduling = page.evaluate("mobilityPerf.nativeAtBoot")
        if not args.legacy_clock:
            assert all(initialScheduling.values()), initialScheduling
        cpu = host()
        result = page.evaluate(
            (HERE / "performance-window.js").read_text(),
            {
                "seconds": args.seconds,
                "trace": trace,
                "osClock": args.quiet,
                "seed": 214,
            },
        )
        os_probe.end()
        final = host()
        scheduler_rows = os_probe.rows
        if args.quiet:
            # Preserve native CPU/runnable-wait snapshots bracketing each >500ms
            # gap and the five longest gaps. The 180s browser rAF record is whole.
            reference = result["start"] - sum(result["osMark"]) / 2
            at = 0
            gaps = []
            for duration in result["intervals"]:
                gaps.append((duration, at, at + duration))
                at += duration
            selected = sorted(gaps, reverse=True)[:5] + [g for g in gaps if g[0] > 500]
            indexes = set()
            for _, a, b in selected:
                for edge in (a, b):
                    idx = min(
                        range(len(scheduler_rows)),
                        key=lambda i: abs(scheduler_rows[i][0] - reference - edge),
                    )
                    indexes.update(
                        range(max(0, idx - 1), min(len(scheduler_rows), idx + 2))
                    )
            scheduler_rows = [scheduler_rows[i] for i in sorted(indexes)]
        assert not errors, errors
        assert (
            result["retained"]
            and result["clock"] > 0
            and result["settings"]["policy"] == "B"
        )
        return {
            "arm": arm,
            "url": url,
            "seconds": args.seconds,
            "build": hashes,
            "nativeAtBoot": initialScheduling,
            "schedulingAfterGameGuards": scheduling,
            "sample": result,
            "cpu": [cpu, final],
            "os": scheduler_rows,
            "samplerCpuMs": round(os_probe.cpu_seconds * 1000, 2),
        }
    finally:
        os_probe.end()
        ctx.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    p.add_argument("--prefix", default="mobility-")
    p.add_argument("--arms", default="v5,v6,v7")
    p.add_argument("--expect-v7", help="require this SHA-256 for fetched V7 model")
    p.add_argument("--seconds", type=float, default=60)
    p.add_argument("--trace", action="store_true")
    p.add_argument(
        "--hud-cost",
        action="store_true",
        help="time only telemetry method bodies on separate diagnostic runs",
    )
    p.add_argument(
        "--quiet",
        action="store_true",
        help="record two five-second preflight CPU samples",
    )
    p.add_argument(
        "--test-touch", type=Path, help="test-only touch source for an arm suffixed ~"
    )
    p.add_argument(
        "--legacy-clock",
        action="store_true",
        help="reproduce the historic Playwright timer shim",
    )
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "trace": a.trace,
        "order": a.arms.split(","),
        "seed": 214,
        "nativeView": [390, 792, 2],
        "baselineDate": "2026-10-15T03:00:00Z",
        "start": datetime.now(UTC).isoformat(),
        "rows": [],
    }
    assert not a.out.exists(), a.out
    if a.quiet:
        idle = []
        for _ in range(2):
            prior = host()
            start = time.monotonic()
            time.sleep(5)
            elapsed = time.monotonic() - start
            later = host()
            idle.append(
                {
                    "seconds": elapsed,
                    "cpuCores": (later["usage_usec"] - prior["usage_usec"])
                    / (elapsed * 1e6),
                    "throttles": later["nr_throttled"] - prior["nr_throttled"],
                }
            )
        report["preflight"] = idle
        print("Preflight", idle, flush=True)
    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=os.getenv("WEBKIT_PATH"))
        report["version"] = browser.version
        for arm in report["order"]:
            r = sample(browser, f"{a.base}/{a.prefix}{arm.rstrip('+~')}.html", a, arm)
            if a.expect_v7 and arm.startswith("v7"):
                assert r["build"]["home-production-model-mobility-v7.js"] == a.expect_v7
            report["rows"].append(r)
            a.out.write_text(json.dumps(report, separators=(",", ":")) + "\n")
            print(
                arm,
                {
                    k: r["sample"][k]
                    for k in [
                        "max",
                        "p95",
                        "p99",
                        "over500",
                        "over1000",
                        "hz",
                        "clock",
                        "moves",
                    ]
                },
                flush=True,
            )
        browser.close()
    ref = report["rows"][0]["sample"]
    assert all(r["sample"]["scales"] == ref["scales"] for r in report["rows"])
    assert all(r["sample"]["opening"] == ref["opening"] for r in report["rows"]), (
        "native starting poses differ"
    )
    print("Initial feet identical:", len(ref["opening"]))


if __name__ == "__main__":
    main()
