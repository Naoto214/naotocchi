"""Measure the V4 renderer on an active, full-size game viewport. Hooks live only in test responses."""
import argparse
import hashlib
import asyncio
import importlib.util
import json
import math
import os
import platform
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import TimeoutError as BrowserTimeout, async_playwright

ROOT = Path(__file__).resolve().parent
v3_path = ROOT.parent / "home-cast-size-v3" / "verify_performance.py"
spec = importlib.util.spec_from_file_location("cast_v3_performance", v3_path)
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)
HEIGHT = {320:568, 344:734, 348:748, 360:780, 375:812, 390:844, 430:932}
POLICY = {"current":0, "A":10, "B":15, "C":20}
CORE = ("river_lake", "forest", "home", "city", "sea")

SOCIAL = """() => {
 const stage=document.querySelector('#castStage'),bubble=document.querySelector('#speechBubble');
 const events=[],lines=[],origin=performance.now();
 stage.addEventListener('naotocchi:home-reaction',({detail:e})=>{
    events.push({t:performance.now()-origin,type:e.type,source:e.source,actor:e.actor?.key,listener:e.listener?.key});
 });
 new MutationObserver(()=>{
    const line=bubble.innerText.trim();
    if(line && bubble.offsetHeight && getComputedStyle(bubble).visibility!=='hidden' && lines.at(-1)?.line!==line)
      lines.push({t:performance.now()-origin,line});
 }).observe(bubble,{attributes:true,subtree:true,childList:true,characterData:true});
 window.v4Events={events,lines};
}"""

def insert(source, needle, addition):
    return v3.v1.sub(source, needle, needle + addition)

SAMPLE = insert(v3.LIVE_SAMPLE, "const before=p.live.metrics(),",
                " startFeet=p.live.snapshot().map(a=>[a.key,a.x,a.y]),")
SAMPLE = v3.v1.sub(SAMPLE, "p95:sorted[", "p50:sorted[Math.ceil(sorted.length*.50)-1],p95:sorted[")
SAMPLE = v3.v1.sub(SAMPLE, "distance:after.distance-before.distance,",
                """feet:p.live.snapshot().map((a,i)=>[a.key,Math.hypot(a.x-startFeet[i][1],a.y-startFeet[i][2])]),
  allDeltas:Object.fromEntries(Object.keys(after).filter(k=>typeof after[k]==='number').map(k=>[k,after[k]-before[k]])),
  reactions:v4Events.events,lines:v4Events.lines,distance:after.distance-before.distance,""")
SAMPLE = v3.v1.sub(SAMPLE, "const p=loadProbe,stage=", "v4Events.events.length=0;v4Events.lines.length=0;const p=loadProbe,stage=")

SCENE_STATE = """()=>({
  viewport:[innerWidth,innerHeight],layout:new URLSearchParams(location.search).get('layout'),fitRecoveries:Number(document.querySelector('#castStage').dataset.populationFitRecoveries||0),settings:HomeCastTrial.settings,scales:['pet','partner','companion'].map(k=>HomeCastTrial.scale(k)),
  native:loadProbe.live.snapshot().map(a=>[a.key,a.w,a.h,a.x,a.y]),
  names:HomeCastTrial.inspect().map(a=>[a.key,a.label]),env:HomeBeauty.settings
})"""

def host_load():
    path=Path("/sys/fs/cgroup/cpu.stat")
    cgroup={k:int(v) for k,v in (line.split() for line in path.read_text().splitlines())} if path.exists() else {}
    return {"loadAverage":os.getloadavg(),"cgroupCpu":cgroup}

class PresentationTimeout(RuntimeError):
    """The game viewport did not settle within its independent startup deadline."""

async def repeat_on_timeout(operation):
    failed=[]
    for attempt in range(3):
        try:
            row=await operation()
            row["priorTimeouts"]=failed
            return row
        except (PresentationTimeout,BrowserTimeout) as exc:
            failed.append(str(exc))
            if attempt==2:raise
            print("Retrying fresh browser context after timeout:",failed[-1],flush=True)

def key_for(scene):
    return "/".join(map(str,scene))

def scenes(args):
    region=args.region
    if args.scene:
        for item in args.scene:
            width,count,policy,curve,layout,seconds=item.split(",")
            yield region,int(width),int(count),policy,curve,layout,float(seconds)
        return
    if args.suite=="region":
        # Interleave policy and seating order on each matched viewport.
        for width in (375,390,430):
            for i,policy in enumerate(("current","C","A","B")):
                for layout in (("fixed","optimized") if i%2==0 else ("optimized","fixed")):
                    yield region,width,28,policy,"linear",layout,4
        # Every count in the interpolation interval, with both curves and a
        # genuine baseline at the same population, viewport, season and time.
        for n in range(19,28):
            for curve,policy in (("linear","current"),("linear","B"),("step","B")):
                yield region,390,n,policy,curve,"fixed",3
        for width in (320,344,360):
            for policy in ("current","A","B","C"):
                yield region,width,28,policy,"linear","fixed",3
        for n in (1,4,10,18,20):
            yield region,375,n,"current","linear","fixed",3
    elif args.suite=="focus":
        width=375 if region in ("river_lake","forest") else (430 if region=="home" else 390)
        for i,policy in enumerate(("current","C","A","B")):
            for layout in (("fixed","optimized") if i%2==0 else ("optimized","fixed")):
                yield region,width,28,policy,"linear",layout,args.seconds
    else:
        raise ValueError("Select a suite or give at least one scene")

def expected_scale(width,n,policy,curve):
    t=max(0,min(1,(width-320)/55))
    width_factor=t*t*(3-2*t)
    population_factor=0 if n<=18 else (1 if curve=="step" else min(1,(n-18)/10))
    return 1 + width_factor*population_factor*POLICY[policy]/100

async def measure(browser,args,scene):
    region,width,n,policy,curve,layout,seconds=scene
    height=args.game_height or HEIGHT[width]-52
    ctx=await browser.new_context(viewport={"width":width,"height":height},device_scale_factor=2,has_touch=True,is_mobile=True)
    hashes={}
    await ctx.add_init_script(v3.PROFILE)
    async def instrument(route):
        await v3.instrument(route,hashes)
    async def fingerprint(route):
        response=await route.fetch()
        hashes[Path(route.request.url.split("?")[0]).name]=hashlib.sha256(await response.body()).hexdigest()
        await route.fulfill(response=response)
    for name in ("population-seating.js","population-policy.js","cast-population.js","population-beauty.js"):
        await ctx.route("**/"+name+"*",fingerprint)
    for pattern in ("**/home-production-diorama*.js*","**/home-production-model.js*","**/home-production-world*.mjs*"):
        await ctx.route(pattern,instrument)
    errors=[]
    try:
        page=await ctx.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        query=urlencode(dict(region=region,count=n,policy=policy,curve=curve,layout=layout,paused=1,
                  time="day",season="autumn",weather="sunny",variant="B",compareSplit=0))
        await page.goto(args.url.rstrip("/")+"/game/population.html?"+query,wait_until="domcontentloaded",timeout=args.startup_timeout)
        try:
            await page.wait_for_function("n=>window.HomeCastTrial?.ready && !!loadProbe.live && HomeCastTrial.inspect().length===n && HomeBeauty.paintRect?.width",arg=n,polling=250,timeout=args.startup_timeout)
        except Exception:
            status=await page.evaluate("()=>({ready:window.HomeCastTrial?.ready,count:window.HomeCastTrial?.inspect().length,game:!!window.loadProbe?.live,paint:window.HomeBeauty?.paintRect?.width,clock:performance.now()})")
            raise PresentationTimeout(f"Presentation never settled: {status}, errors={errors}, sources={list(hashes)}")
        await page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(img=>img.decode()))")
        state=await page.evaluate(SCENE_STATE)
        assert state["viewport"]==[width,height] and state["settings"]["paused"],state
        assert state["settings"]["policy"]==policy and state["settings"]["curve"]==curve and state["layout"]==layout,state
        scale=expected_scale(width,n,policy,curve)
        assert all(math.isclose(got,base*scale,abs_tol=0.0002) for got,base in zip(state["scales"],v3.BASE_SCALE)),(state["scales"],scale,scene)
        await page.evaluate(SOCIAL)
        # Start every sample from a settled paused pose and a fresh browser
        # context. All subsequent steps use the active native rAF loop.
        await page.evaluate("HomeCastTrial.apply({paused:false})")
        await page.wait_for_function("!HomeCastTrial.settings.paused && !!loadProbe.parts.actors && !!loadProbe.parts.nature",timeout=90000)
        client=await ctx.new_cdp_session(page) if args.trace else None
        if client:
            await client.send("Tracing.start",{"categories":"devtools.timeline,blink.user_timing,cc,benchmark,disabled-by-default-devtools.timeline","transferMode":"ReturnAsStream"})
            await page.evaluate("performance.mark('cast-window-0-start')")
        host_before=host_load()
        sample=await page.evaluate(SAMPLE,seconds)
        sample["hostAtStart"]=host_before
        sample["hostAtEnd"]=host_load()
        if client:
            await page.evaluate("performance.mark('cast-window-0-end')")
            trace=await v3.v1.read_compositor_trace(client)
            assert len(trace)==1,trace
            sample["chromiumTrace"]=trace[0]
        assert sample["rows"]==n and sample["sameNodes"] and not errors,(scene,errors)
        return {"scene":list(scene),"gameViewport":state["viewport"],"openingFitRecoveries":state["fitRecoveries"],"scales":state["scales"],"settings":state["settings"],"environment":state["env"],
                "opening":state["native"],"names":state["names"],"sourceHashes":hashes,"sample":sample,"errors":errors}
    finally:
        await ctx.close()

def save(path,data):
    path.parent.mkdir(exist_ok=True,parents=True)
    temp=path.with_suffix(".part")
    temp.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"),allow_nan=False)+"\n")
    temp.replace(path)

async def run(args):
    assert not args.game_height or args.scene, "Height overrides apply to explicit --scene measurements only"
    assert not args.trace or args.engine=="chromium", "Timeline trace requires Chromium"
    allowed=list(scenes(args))
    data=json.loads(args.out.read_text()) if args.out.exists() else {"engine":args.engine,"host":platform.system(),
            "affinity":sorted(os.sched_getaffinity(0)),"dpr":2,"toolbarCssPx":52,"rows":{}}
    assert data["engine"]==args.engine
    async with async_playwright() as pw:
        exe=os.getenv("CHROMIUM_PATH","/usr/bin/chromium") if args.engine=="chromium" else os.getenv("WEBKIT_PATH")
        browser=await getattr(pw,args.engine).launch(executable_path=exe)
        data["version"]=browser.version
        for scene in allowed:
            key=key_for(scene)
            if args.game_height:key+=f"@height{args.game_height}"
            if args.trace:key+="+trace"
            if key in data["rows"]:continue
            print("Opening",key,flush=True)
            row=await repeat_on_timeout(lambda: measure(browser,args,scene))
            data["rows"][key]=row
            save(args.out,data)
            s=row["sample"]
            print(key,round(s["rafHz"],1),round(s["max"]),round(s["clock"],1),flush=True)
        await browser.close()

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--startup-timeout",type=int,default=120000,help="Maximum milliseconds for the real presentation to settle")
    p.add_argument("--url",default="http://127.0.0.1:8304")
    p.add_argument("--region",required=True,choices=v3.REGIONS);p.add_argument("--suite",choices=["region","focus"],default="focus")
    p.add_argument("--engine",default="chromium",choices=["chromium","webkit"]);p.add_argument("--seconds",type=float,default=12)
    p.add_argument("--game-height",type=int,help="Override rendered game height for explicit --scene rows")
    p.add_argument("--trace",action="store_true",help="Include Chromium Paint, RasterTask and layout timings")
    p.add_argument("--scene",action="append",help="WIDTH,COUNT,POLICY,CURVE,LAYOUT,SECONDS");p.add_argument("--out",type=Path,required=True)
    asyncio.run(run(p.parse_args()))
