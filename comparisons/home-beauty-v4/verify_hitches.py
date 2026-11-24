"""Profile the actual game in a localhost-only disposable comparison build.

Example: taskset -c 0,1 python verify_hitches.py http://127.0.0.1:8194 D3 /tmp/d3.json
No instrumentation is included in the served site or shipped game.
"""

import argparse
import asyncio
import bisect
import hashlib
import json
import os
import re
from collections import Counter
from pathlib import Path
from time import monotonic
from urllib.parse import urlencode, urlparse

from playwright.async_api import async_playwright

# Rewrite whole function bindings in local responses, keeping this/args/result/exceptions.
# "frame(now)" distinguishes the controller callback from an unrelated frame helper.
HOOKS = {
    "home-production-diorama.js": (
        "frame(now)",
        "paint",
        "sync",
        "update",
        "down",
        "move",
        "up",
    ),
    "home-production-model.js": ("step", "sync"),
    "home-production-world.mjs": ("draw", "navigation", "setEnvironment"),
    "home-production-touch.js": ("apply",),
    "script.js": (
        "loop",
        "render",
        "tick",
        "renderHomeDiorama",
        "renderEnvironment",
        "renderPetVisual",
    ),
    "paint.mjs": ("composeNature",),
    "full-motion.mjs": ("drawFullMotion",),
    "sea-e.mjs": ("drawSeaE",),
}
CARE = """() => {
    const key = Array.from({length: localStorage.length}, (_, i) => localStorage.key(i))
      .find(key => /beauty-v[24]-fixture$/.test(key));
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    const used = [];
    function act(id) {
      const button = document.getElementById(id);
      if (button && !button.disabled && button.getBoundingClientRect().height > 0) {
        button.click();
        used.push(id);
      }
    }
    if (state.stage === 'growing') {
      if (state.isSleeping && state.energy > 90) act('sleepBtn');
      if (state.isSick) act('medicineBtn');
      if (state.poopCount > 0) act('cleanBtn');
      if (state.hunger < 55 && !state.isSleeping) act('feedBtn');
    }
    return {used, stage: state.stage};
}"""

VISIBLE_ACTOR = """() => {
    const actors = [...document.querySelectorAll('#castStage [data-diorama-actor]')];
    actors.sort((a, b) => b.style.zIndex - a.style.zIndex);
    for (const actor of actors) {
      const rect = actor.getBoundingClientRect();
      for (let v = .4; v < .9; v += .12) {
        for (let u = .35; u < .7; u += .1) {
          const x = rect.x + rect.width * u;
          const y = rect.y + rect.height * v;
          if (document.elementFromPoint(x, y)?.closest('[data-diorama-actor]') === actor) {
            return [x, y];
          }
        }
      }
    }
    return null;
}"""


def cgroup():
    try:
        return {
            a: int(b)
            for a, b in (
                line.split()
                for line in Path("/sys/fs/cgroup/cpu.stat").read_text().splitlines()
            )
        }
    except OSError:
        return {}


def clip(rows, a, b):
    return [(max(a, x), min(b, y)) for x, y in rows if y > a and x < b]


def coverage(rows):
    end = -1
    total = 0
    for x, y in sorted(rows):
        total += max(0, y - max(x, end))
        end = max(y, end)
    return round(total, 2)


def digest(raw, profile, origin):
    # CDP reports monotonic microseconds. DOM event times are relative to navigation.
    ids = {n["id"]: n for n in profile["nodes"]}
    times = []
    t = profile["startTime"]
    for delta in profile["timeDeltas"]:
        t += delta
        times.append(t / 1000 - origin * 1000)
    spans = {}
    for tag, x, y in raw.pop("spans"):
        spans.setdefault(tag, []).append((x, y))
    tasks = raw.pop("tasks")
    loafs = raw.pop("loaf")
    gaps = raw.pop("gaps")
    for row in raw["total"].values():
        row.update({key: round(row[key], 2) for key in ("maxMs", "totalMs")})
    raw["allLongTasks"] = len(tasks)
    raw["allLongAnimationFrames"] = len(loafs)
    raw["maxLongTaskMs"] = round(max((y - x for x, y in tasks), default=0), 2)
    raw["allGaps250ms"] = len(gaps)
    raw["stampCounts"] = {
        str(k): sum(g["stampTo"] - g["stampFrom"] >= k - 0.1 for g in gaps)
        for k in (250, 500, 1000, 2000)
    }
    raw["wallCounts"] = {
        str(k): sum(g["to"] - g["from"] >= k - 0.1 for g in gaps)
        for k in (250, 500, 1000, 2000)
    }
    raw["top"] = []
    for g in sorted(
        gaps,
        key=lambda g: max(g["to"] - g["from"], g["stampTo"] - g["stampFrom"]),
        reverse=True,
    )[:12]:
        # Attribute work to actual callback arrival times. A compositor timestamp
        # can lag the executing callback by a frame during main-thread stalls.
        a, b = g["from"], g["to"]
        matched = {key: clip(rows, a, b) for key, rows in spans.items()}
        left = bisect.bisect_left(times, a)
        right = bisect.bisect_left(times, b)
        hits = Counter()
        for node in profile["samples"][left:right]:
            cf = ids[node]["callFrame"]
            hits[
                (cf["url"].split("/")[-1] or "native")
                + "/"
                + (cf["functionName"] or "(anonymous)")
            ] += 1
        g.update(
            wallMs=round(b - a, 2),
            stampMs=round(g["stampTo"] - g["stampFrom"], 2),
            stageMs={k: coverage(v) for k, v in matched.items() if v},
            stageUnionMs=coverage([z for v in matched.values() for z in v]),
            longTaskMs=coverage(clip(tasks, a, b)),
            loafMs=coverage(clip([(f["from"], f["to"]) for f in loafs], a, b)),
            cpuSamples=right - left,
            gcSamples=hits["native/(garbage collector)"],
            topCPU=hits.most_common(8),
        )
        lf = sorted(
            (f for f in loafs if f["to"] > a and f["from"] < b),
            key=lambda f: min(b, f["to"]) - max(a, f["from"]),
            reverse=True,
        )
        g["loafDetail"] = [
            {
                **f,
                "scripts": sorted(
                    f["scripts"], key=lambda s: s["to"] - s["from"], reverse=True
                )[:3],
            }
            for f in lf[:2]
        ]
        raw["top"].append(g)
    raw["cpuProfile"] = {
        "samples": len(times),
        "firstMs": times[0] if times else None,
        "lastMs": times[-1] if times else None,
    }
    return raw


async def run(args):
    base = urlparse(args.url)
    if base.scheme != "http" or base.hostname not in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("Only a local comparison build may be instrumented")
    errors = []
    hashes = {}
    checkpoints = []
    drags = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path="/usr/bin/chromium", args=["--no-sandbox"]
        )
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            has_touch=True,
        )
        page = await ctx.new_page()
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        await page.add_init_script(path=Path(__file__).with_name("hitch_probe.js"))

        async def route_js(route):
            request_url = urlparse(route.request.url)
            if (request_url.scheme, request_url.netloc) != (base.scheme, base.netloc):
                await route.continue_()
                return
            file = request_url.path.split("/")[-1]
            response = await route.fetch()
            src = await response.text()
            hashes[file] = hashlib.sha256(src.encode()).hexdigest()
            for spec in HOOKS[file]:
                name = spec.split("(")[0]
                params = (
                    r"\([^)]*\)" if "(" not in spec else re.escape(spec[len(name) :])
                )
                pattern = rf"function\s+{name}({params})\s*\{{"
                matches = list(re.finditer(pattern, src))
                if len(matches) != 1:
                    errors.append(f"{file}/{spec}: found {len(matches)}")
                    continue
                m = matches[0]
                tag = file + "/" + name
                new = (
                    m.group(0)
                    + f'const hitchAt=performance.now();try{{return __hitch_{name}.apply(this,arguments)}}finally{{window.hitchProbe.span("{tag}",hitchAt,performance.now())}}}}function __hitch_{name}'
                    + m.group(1)
                    + "{"
                )
                src = src[: m.start()] + new + src[m.end() :]
            await route.fulfill(response=response, body=src)

        for file in HOOKS:
            await page.route("**/" + file + "*", route_js)
        query = urlencode(
            {
                "region": "sea",
                "time": "evening",
                "season": "summer",
                "weather": "rain",
                "count": 28,
                "variant": args.variant,
                "speed": 1,
                "strength": 1,
            }
        )
        await page.goto(
            args.url.rstrip("/") + "/game/index.html?" + query,
            wait_until="domcontentloaded",
        )
        await page.wait_for_function(
            """v=>window.HomeBeauty?.settings?.variant===v&&HomeBeauty.paintRect?.height>=innerHeight-1&&document.querySelectorAll('#castStage [data-diorama-actor]').length===28""",
            arg=args.variant,
        )
        missing = HOOKS.keys() - hashes.keys()
        if errors or missing:
            raise RuntimeError({"scriptErrors": errors, "missingHooks": sorted(missing)})
        cdp = await ctx.new_cdp_session(page)
        await cdp.send("Performance.enable")
        origin = next(
            m["value"]
            for m in (await cdp.send("Performance.getMetrics"))["metrics"]
            if m["name"] == "NavigationStart"
        )
        await cdp.send("Profiler.enable")
        await cdp.send("Profiler.setSamplingInterval", {"interval": 8000})
        await cdp.send("Profiler.start")
        await page.evaluate("hitchProbe.start()")
        started = monotonic()
        stats0 = cgroup()
        for sec in sorted({0, args.seconds, *range(20, args.seconds, 20)}):
            await asyncio.sleep(max(0, started + sec - monotonic()))
            check = await page.evaluate("hitchProbe.checkpoint()")
            check["targetSeconds"] = sec
            if 0 < sec < args.seconds:
                check["care"] = await page.evaluate(CARE)
            if sec in (0, 180, 400) and sec < args.seconds:
                pos = await page.evaluate(VISIBLE_ACTOR)
                if pos:
                    x, y = pos
                    for i in range(12):
                        kind = (
                            "touchStart"
                            if i == 0
                            else "touchEnd"
                            if i == 11
                            else "touchMove"
                        )
                        await cdp.send(
                            "Input.dispatchTouchEvent",
                            {
                                "type": kind,
                                "touchPoints": []
                                if i == 11
                                else [
                                    {
                                        "x": min(386, x + i * 3.6),
                                        "y": y + i * 1.5,
                                        "id": 1,
                                    }
                                ],
                            },
                        )
                drags.append({"seconds": sec, "target": pos})
            checkpoints.append(check)
            print(args.variant, sec, check["peak"], check["state"], flush=True)
        # Serialize in the browser to avoid a large Playwright object graph.
        raw = json.loads(await page.evaluate("JSON.stringify(hitchProbe.stop())"))
        stats1 = cgroup()
        profile = (await cdp.send("Profiler.stop"))["profile"]
        result = {
            "variant": args.variant,
            "browser": browser.version,
            "url": args.url,
            "requestedSeconds": args.seconds,
            "cpuAffinity": sorted(os.sched_getaffinity(0)),
            "intervalMicros": 8000,
            "cgroupDifference": {k: stats1[k] - v for k, v in stats0.items()},
            "scriptSHA256": hashes,
            "errors": errors,
            "drag": drags,
            "checkpoints": checkpoints,
            "capture": digest(raw, profile, origin),
        }
        Path(args.out).write_text(
            json.dumps(result, ensure_ascii=False, indent=1) + "\n"
        )
        await browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("variant", choices=["D3", "E3"])
    parser.add_argument("out")
    parser.add_argument("--seconds", type=int, default=600)
    asyncio.run(run(parser.parse_args()))
