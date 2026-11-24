"""Measure the real live V5 home on all three branches of the private comparison."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import os
import platform
import re
from pathlib import Path
from urllib.parse import urlencode, urlparse

from playwright.async_api import async_playwright

# Keep the sampling boundaries and units identical to the approved #570 trial.
reference = Path(__file__).resolve().parents[1] / "home-cast-size-v1" / "verify_load.py"
spec = importlib.util.spec_from_file_location("reference_cast_perf", reference)
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)

# Timings use the browser's own monotonic clock. Read the selected actor and the
# movement marker immediately after the native stage handler has run.
INPUT = """() => {
 const stage=document.getElementById('castStage'), samples=[];
 window.perfInput={samples,expected:null};
 for (const type of ['pointerdown','pointermove','pointerup']) {
   stage.addEventListener(type,e=>{
     const entered=performance.now(), ts=e.timeStamp;
     const d={type,kind:e.pointerType,expected:perfInput.expected,dispatchMs:Math.max(0,entered-ts)};
     e.__perfSample=d;
   },true);
   stage.addEventListener(type,e=>{
     const d=e.__perfSample;if(!d)return;
     const handled=performance.now(),ts=e.timeStamp;
     d.afterHandlerMs=Math.max(0,handled-ts);d.selected=loadProbe.live.selected();
     d.marker=!stage.querySelector('.diorama-target').hidden;
     samples.push(d);
     requestAnimationFrame(()=>{d.nextRafMs=Math.max(0,performance.now()-ts);});
   });
 }
}"""

POINT = """offset=>{
 const all=[...document.querySelectorAll('#castStage [data-diorama-actor]')];
 for(let i=0;i<all.length;i++){
   const n=all[(offset+i)%all.length],k=n.dataset.dioramaActor;
   const r=n.querySelector('img.character-asset')?.getBoundingClientRect();
   if(!r || k===loadProbe.live.selected())continue;
   for(const u of [.5,.4,.6])for(const v of [.55,.65,.45]){
     const x=r.x+r.width*u,y=r.y+r.height*v;
     const target=document.elementFromPoint(x,y);
     if(target?.closest('[data-diorama-actor]')===n)return {x,y,k};
   }
 }
 return null;
}"""

async def attempt_inputs(page, context, engine, attempts):
    await page.evaluate(INPUT)
    client = await context.new_cdp_session(page) if engine == "chromium" else None
    for i in range(attempts):
        point=await page.evaluate(POINT, i*5)
        if not point:
            continue
        x,y,k=point["x"],point["y"],point["k"]
        await page.evaluate("k=>perfInput.expected=k", k)
        # CDP touch goes through the browser's input dispatch, including hit tests.
        # Playwright's WebKit backend provides mouse dragging and touchscreen taps.
        dx=32 if x<page.viewport_size["width"]*0.5 else -32
        if i%2==0:
            await page.touchscreen.tap(x,y)
        elif client:
            await client.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":1}]})
            for f in [.5,1]:
                await client.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x+dx*f,"y":y+2*f,"id":1}]})
            await client.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        else:
            await page.mouse.move(x,y)
            await page.mouse.down()
            await page.mouse.move(x+dx,y+2,steps=2)
            await page.mouse.up()
        await page.wait_for_timeout(90)
    await page.evaluate("new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))")
    return await page.evaluate("perfInput.samples")

def write(path,payload):
    path.parent.mkdir(exist_ok=True,parents=True)
    path.write_text(json.dumps(payload,ensure_ascii=False,indent=1,allow_nan=False)+"\n")

async def run(args):
    game_height=args.height-52
    result={"engine":args.engine,"host":platform.system(),"affinity":sorted(os.sched_getaffinity(0)),
            "viewport":[args.width,args.height],"gameContentHeight":game_height,"dpr":2,
            "region":args.region,"rows":[]}
    async with async_playwright() as pw:
        executable=os.getenv("CHROMIUM_PATH","/usr/bin/chromium") if args.engine=="chromium" else os.getenv("WEBKIT_PATH")
        browser=await getattr(pw,args.engine).launch(executable_path=executable)
        result["browser"]=browser.version
        # Each scene gets an independent page/unchanged seed. Reverse mode order
        # on the second pass and rotate at different population sizes.
        for trial in range(args.repeats):
            for idx,count in enumerate(args.counts):
                modes=list(args.modes); shift=idx%len(modes)
                modes=modes[shift:]+modes[:shift]
                if trial%2:modes.reverse()
                for mode in modes:
                    context=await browser.new_context(viewport={"width":args.width,"height":game_height},has_touch=True,device_scale_factor=2)
                    await context.add_init_script(v1.INIT)
                    if args.contacts:
                        await context.add_init_script("window.v5ClearanceCalls=0;")
                    seen={}
                    async def instrument(route):
                        response=await route.fetch()
                        src=await response.text()
                        name=Path(urlparse(route.request.url).path).name
                        seen[name]=hashlib.sha256(src.encode()).hexdigest()
                        if name=="seating.js":
                            matches=list(re.finditer(r"(?<=\=)\s*makeSeats\(([^;()]+)\)",src))
                            if len(matches)!=1:raise ValueError("Unexpected seating computation boundary")
                            call=matches[0].group().strip()
                            src=src[:matches[0].start()]+" (()=>{const t=performance.now();try{return "+call+"}finally{loadProbe.add('seating',t)}})()"+src[matches[0].end():]
                            src+="""
;{
 const bindSeats=HomeOpeningSeats.withOpeningSeats;
 HomeOpeningSeats.withOpeningSeats=(...args)=>{
   const start=performance.now();
   try{return bindSeats(...args);}
   finally{loadProbe.add('bindSeating',start);}
 };
}
"""
                        elif "diorama" in name:
                            src=v1.sub(src,"const model=modelAPI.createModel(","const model=window.loadProbe.live=modelAPI.createModel(")
                            pre="for(let remaining="
                            src=v1.sub(src,pre,"const lp=window.loadProbe,mt=performance.now();"+pre)
                            draw="world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();"
                            src=v1.sub(src,draw,"lp.add('model',mt);const wt=performance.now();"+draw[:-8]+
                                       "lp.add('world',wt);const at=performance.now();paint();lp.add('actors',at);")
                        elif "world" in name:
                            line,=(line.strip() for line in src.splitlines() if line.strip().startswith("composeNature(ctx,t,host,fade,"))
                            src=v1.sub(src,line,"const nt=performance.now();"+line+"window.loadProbe.add('nature',nt);")
                        else:
                            signature="function sync(list,next){"
                            src=v1.sub(src,signature,signature+"window.loadProbe.syncs++;")
                            if args.contacts:
                                clearance="function clearance(a,p,b){"
                                src=v1.sub(src,clearance,clearance+"window.v5ClearanceCalls++;")
                            src=v1.sub(src,"const plan=nav=>{","const plan=nav=>window.loadProbe.plan(()=>{")
                            end="return {point:q,path,originalReference,expandedReference};\n      };"
                            src=v1.sub(src,end,end[:-2]+"});")
                        await route.fulfill(response=response,body=src)
                    for glob in ("**/home-production-diorama*.js*", "**/home-production-model.js*",
                                 "**/home-production-world*.mjs*","**/seating.js*"):
                        await context.route(glob,instrument)
                    page=await context.new_page()
                    errors=[]
                    page.on("pageerror",lambda exc:errors.append(str(exc)))
                    root=args.final if mode=="final" else args.reference
                    game="final.html" if mode=="final" else "index.html"
                    q=dict(count=count,region=args.region,time="day",season="autumn",weather="sunny",variant="B",compareSplit=0,paused=0)
                    if mode!="current":q.update(hero=120,partner=120,companions=105)
                    await page.goto(root.rstrip("/")+"/game/"+game+"?"+urlencode(q),wait_until="domcontentloaded",timeout=120000)
                    try:
                        await page.wait_for_function("n=>window.HomeCastTrial?.ready && window.loadProbe?.live && HomeCastTrial.inspect().length===n && !!loadProbe.parts.actors",arg=count,timeout=90000)
                    except Exception:
                        print("Readiness failure", mode, list(seen), errors, await page.evaluate("""()=>({
                            settled:window.HomeCastTrial?.ready, cast:window.HomeCastTrial?.inspect()?.length,
                            phases:Object.keys(loadProbe.parts), metadata:document.getElementById('castStage')?.dataset?.livingMetrics})"""),flush=True)
                        raise
                    startup=await page.evaluate("()=>({untilTrialReadyMs:performance.now(),firstPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,width:innerWidth,height:innerHeight,nativeUpdates:loadProbe.parts.actors?.calls,syncs:loadProbe.syncs,seating:loadProbe.parts.seating||null,seatingBindings:loadProbe.parts.bindSeating||null})")
                    pose=await page.evaluate("""()=>({keys:HomeCastTrial.inspect().map(a=>a.key),
                      scales:['pet','partner','companion'].map(k=>HomeCastTrial.scale(k)),paused:HomeCastTrial.settings.paused,
                      savedSize:HomeCastTrial.inspect().map(a=>[a.key,a.w,a.h]),origin:HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y])})""")
                    assert not pose["paused"] and len(pose["keys"])==count
                    assert pose["scales"]==([1,1,1] if mode=="current" else [1.2,1.2,1.05]),pose
                    client = await context.new_cdp_session(page) if args.trace else None
                    if client:
                        await client.send("Tracing.start",{"categories":"devtools.timeline,blink.user_timing,cc,benchmark,disabled-by-default-devtools.timeline",
                                                            "transferMode":"ReturnAsStream"})
                        await page.evaluate("performance.mark('cast-window-0-start')")
                    if args.contacts:
                        before=await page.evaluate("v5ClearanceCalls")
                    sample=await page.evaluate(v1.SAMPLE,args.seconds)
                    if args.contacts:
                        sample["clearanceCalls"]=await page.evaluate("v5ClearanceCalls")-before
                    if client:
                        await page.evaluate("performance.mark('cast-window-0-end')")
                        sample["trace"]=(await v1.read_compositor_trace(client))[0]
                    inputs=await attempt_inputs(page,context,args.engine,args.inputs) if args.inputs else []
                    assert sample["sameNodes"] and sample["rows"]==count and not errors,errors
                    fingerprint=lambda key:hashlib.sha256(json.dumps(pose[key],sort_keys=True,separators=(",",":")).encode()).hexdigest()
                    result["rows"].append({"mode":mode,"trial":trial,"count":count,"scales":pose["scales"],
                        "sameRosterKey":fingerprint("keys"),"modelSizes":fingerprint("savedSize"),"startPose":fingerprint("origin"),
                        "hashes":seen,"startup":startup,"sample":sample,"inputs":inputs,"errors":errors})
                    write(args.out,result)
                    print(mode,count,trial,round(sample["rafHz"],1),round(sample["max"]),len(inputs),flush=True)
                    await context.close()
        await browser.close()

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference",default="http://127.0.0.1:8201")
    p.add_argument("--final",default="http://127.0.0.1:8202")
    p.add_argument("--engine",choices=["chromium","webkit"],default="chromium")
    p.add_argument("--modes",nargs="+",choices=["current","adopted","final"],default=["current","adopted","final"])
    p.add_argument("--region",default="forest");p.add_argument("--counts",type=int,nargs="+",default=[28])
    p.add_argument("--seconds",type=float,default=30);p.add_argument("--repeats",type=int,default=1)
    p.add_argument("--width",type=int,default=320);p.add_argument("--height",type=int,default=568)
    p.add_argument("--contacts",action="store_true",help="Count native pair-clearance checks in a separate diagnostic run")
    p.add_argument("--inputs",type=int,default=8);p.add_argument("--trace",action="store_true");p.add_argument("--out",type=Path,required=True)
    asyncio.run(run(p.parse_args()))
