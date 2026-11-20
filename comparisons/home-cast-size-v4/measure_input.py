"""Exercise each resident through trusted browser events and record the V5 routing decision."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright
from measure_performance import HEIGHT, POLICY, ROOT, PresentationTimeout, expected_scale, repeat_on_timeout, save, v3

V3 = ROOT.parent / "home-cast-size-v3"
spec=importlib.util.spec_from_file_location("v3_input_routes",V3/"verify_interact_routes.py")
native_routes=importlib.util.module_from_spec(spec)
spec.loader.exec_module(native_routes)
HIT = (V3/"verify_interact_hits.js").read_text()
DOWN="function down(e){"
HIT_EXPOSE="""window.v4Hit=(x,y)=>{const el=doc.elementFromPoint(x,y);
 return el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')?hit(point({clientX:x,clientY:y}),el):null;};
window.v4CanStart=()=>enabled&&!env.HomeCastTrial.settings.paused&&!blocked();
window.v4Selected=()=>model.selected();
window.v4Down=[];window.v4Up=[];"""
SELECT="if(key)model.select(key);paint();"
MOVE="const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground');"
ACCEPT="a.route=path.slice(1);a.target=path[0];a.source=source;"
STAMP = """()=>{
 const stage=document.querySelector('#castStage');
 window.v4Press=[];
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel']){
   document.addEventListener(type,e=>{
     const item={type,trusted:e.isTrusted,kind:e.pointerType,ts:e.timeStamp,dispatch:performance.now()-e.timeStamp,
       stage:stage.contains(e.target),target:e.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor||e.target.id};
     v4Press.push(item);
     requestAnimationFrame(()=>{item.nextFrame=performance.now()-e.timeStamp});
   },true);
 }
 window.v4Acts=[];
 stage.addEventListener('naotocchi:home-reaction',({detail:e})=>v4Acts.push([e.type,e.source,e.actor?.key,e.listener?.key]));
}"""
AIM="""i=>{
 const residents=HomeCastTrial.inspect(), a=residents[i],owner=document.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
 const pts=qaTapPoints(owner),hits=pts.map(([x,y])=>v4Hit(x,y)),j=Math.max(0,hits.indexOf(a.key));
 const start=pts[j],right=a.foot.x<=innerWidth/2;
 return {key:a.key,role:a.kind,viewport:[innerWidth,innerHeight],fitRecoveries:Number(document.querySelector('#castStage').dataset.populationFitRecoveries||0),settings:HomeCastTrial.settings,
   origin:[a.x,a.y],foot:[a.foot.x,a.foot.y],start,hits,aimPoint:j,
   target:[a.foot.x+(right?12:-12),a.foot.y],projection:NaotocchiHomeViewport.residentPresentation().intentScale||null};
}"""
END="""i=>{
 const a=HomeCastTrial.inspect()[i],p=NaotocchiHomeViewport.residentPresentation();
 return {end:[a.x,a.y],endFoot:[a.foot.x,a.foot.y],nativeKey:a.key,scale:[p.scaleX,p.scaleY],
         down:v4Down,up:v4Up,accepted:window.v4Accepted||[],events:v4Acts,pointers:v4Press,selected:v4Selected(),
         modelTime:JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').clock};
}"""

async def evidence_response(route,hashes):
    response=await route.fetch()
    src=await response.text()
    name=Path(route.request.url.split("?")[0]).name
    hashes[name]=hashlib.sha256(src.encode()).hexdigest()
    if name=="home-production-model.js":
        src=native_routes.instrument(src)
        src=v3.v1.sub(src,ACCEPT,"if(source==='drag')(window.v4Accepted||=[]).push({key,request:{...p},chosen:{...q},waypoints:path.length,clock});"+ACCEPT)
    elif "diorama-" in name:
        src=v3.v1.sub(src,DOWN,HIT_EXPOSE+DOWN)
        src=v3.v1.sub(src,SELECT,"const accepted=key?model.select(key):false;v4Down.push({key,accepted,at:performance.now(),ts:e.timeStamp});paint();")
        src=v3.v1.sub(src,MOVE,MOVE+"v4Up.push({key:g.key||model.selected(),drag:g.drag,success,at:performance.now(),ts:e.timeStamp});")
    await route.fulfill(response=response,body=src)

async def discharge(page,cdp,mode,start,goal):
    if mode=="tap":
        await page.touchscreen.tap(*start)
    elif cdp:
        def pt(x,y):
            return [{"x":x,"y":y,"id":1}]
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":pt(*start)})
        for factor in (0.35,.7,1):
            x,y=(start[k]*(1-factor)+goal[k]*factor for k in (0,1))
            await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":pt(x,y)})
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
    else:
        await page.mouse.move(*start)
        await page.mouse.down()
        await page.mouse.move(*goal,steps=3)
        await page.mouse.up()

async def exercise(browser,args,index,policy,layout,mode,hashes):
    width=args.width
    ctx=await browser.new_context(viewport={"width":width,"height":HEIGHT[width] if args.owner else HEIGHT[width]-52},device_scale_factor=2,has_touch=True,is_mobile=True)
    async def observe(route):
        await evidence_response(route,hashes)
    for name in ("home-production-model.js","home-production-diorama-population.js","population-seating.js","population-policy.js"):
        await ctx.route("**/"+name+"*",observe)
    errors=[]
    try:
        page=await ctx.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        q=urlencode(dict(region=args.region,count=args.count,policy=policy,curve=args.curve,layout=layout,
              paused=1,time="day",season="autumn",weather="sunny",variant="B",compareSplit=0))
        subject=page
        dx=dy=0
        if args.owner:
            owner_query=urlencode(dict(region=args.region,count=args.count,variant=policy,curve=args.curve,layout=layout,paused=1,time="day"))
            await page.goto(args.url.rstrip("/")+"/v4/?"+owner_query,wait_until="domcontentloaded",timeout=args.startup_timeout)
            await page.wait_for_function("document.body.dataset.ready==='true'",polling=250,timeout=args.startup_timeout)
            shell_frame=await page.locator("#home").element_handle()
            subject=await shell_frame.content_frame()
            bounds=await shell_frame.bounding_box()
            dx,dy=bounds["x"],bounds["y"]
            assert "/game/population.html" in subject.url and subject.page is page
        else:
            await page.goto(args.url.rstrip("/")+"/game/population.html?"+q,wait_until="domcontentloaded",timeout=args.startup_timeout)
        try:
            await subject.wait_for_function("n=>window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===n && typeof window.v4CanStart==='function' && HomeBeauty.paintRect?.width",arg=args.count,polling=250,timeout=args.startup_timeout)
        except Exception:
            status=await subject.evaluate("()=>({ready:window.HomeCastTrial?.ready,pop:window.HomeCastTrial?.inspect().length,hook:typeof window.v4CanStart,env:window.HomeBeauty?.paintRect,script:[...document.scripts].map(n=>n.src).filter(x=>x.includes('population'))})")
            raise PresentationTimeout(f"Opening failed: {status}, errors={errors}, hash files={list(hashes)}")
        await subject.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(img=>img.decode()))")
        await subject.evaluate(HIT)
        await subject.evaluate(STAMP)
        plan=await subject.evaluate(AIM,index)
        expected=expected_scale(width,args.count,policy,args.curve)
        assert math.isclose(plan["settings"]["hero"]/120,expected,abs_tol=.0001),plan
        # Probe the V5 target/path branches before writes. This extra result has
        # its own denominator, distinct from the actual pointer / release path.
        dry=None
        if mode=="drag":
            dry=await subject.evaluate("""plan=>{
                const p=NaotocchiHomeViewport.residentPresentation(),a=HomeCastTrial.inspect().find(x=>x.key===plan.key);
                const target={x:a.x+(plan.target[0]-a.foot.x)/p.scaleX,y:a.y+(plan.target[1]-a.foot.y)/p.scaleY};
                const paused=qaNativePaused(),choice=qaDryMove(a.key,target);
                return {paused,target,choice:choice||null,targetErrorCss:choice?Math.hypot((choice.x-target.x)*p.scaleX,(choice.y-target.y)*p.scaleY):null};
            }""",plan)
        cdp=await ctx.new_cdp_session(page) if args.engine=="chromium" else None
        if args.owner:
            await page.locator("#freeze").tap()
            await subject.wait_for_function("!HomeCastTrial.settings.paused",polling=50,timeout=args.startup_timeout)
        else:
            await subject.evaluate("HomeCastTrial.apply({paused:false})")
        gate=await subject.evaluate("v4CanStart()")
        offset=lambda point:[point[0]+dx,point[1]+dy]
        await discharge(page,cdp,mode,offset(plan["start"]),offset(plan["target"]))
        # Observe the real unmodified game for at least 700 ms, including
        # interruptions and the native retry timer. Keep immediate route separate.
        await page.wait_for_timeout(700)
        observed=await subject.evaluate(END,index)
        assert observed["nativeKey"]==plan["key"] and not errors,(observed,errors)
        observed["displacement"]=math.dist(plan["origin"],observed["end"])
        immediate=next((u for u in observed["up"] if u["key"]==plan["key"] and u["drag"]),None)
        routed=next((r for r in observed["accepted"] if r["key"]==plan["key"]),None)
        selected=any(d["key"]==plan["key"] and d["accepted"] for d in observed["down"])
        terminal_error=None
        if routed:
            terminal_error=math.hypot(*[(routed["request"][k]-routed["chosen"][k])*sc for k,sc in zip(("x","y"),observed["scale"])])
        return {"index":index,"mode":mode,"policy":policy,"layout":layout,"actualInput":"touch" if mode=="tap" or cdp else "mouse",
                "ownerShell":args.owner,"frameOffset":[dx,dy],"openingPlanner":dry,"readyForInput":gate,"role":plan["role"],"key":plan["key"],"selectedIntended":selected,
                "dragAttemptedForIntended":bool(immediate),"routeAcceptedOnRelease":bool(immediate and immediate["success"]),
                "routeAcceptedWithinObservation":bool(routed),"targetErrorCss":terminal_error,"plan":plan,"observed":observed}
    finally:
        await ctx.close()

async def run(args):
    data=json.loads(args.out.read_text()) if args.out.exists() else {
        "engine":args.engine,"width":args.width,"height":HEIGHT[args.width]-52,"count":args.count,
        "ownerShell":args.owner,"region":args.region,"curve":args.curve,"dpr":2,"rows":{},"sources":{}}
    for row in data["rows"].values():
        row.setdefault("sourceHashes",dict(data["sources"]))
    assert bool(data.get("ownerShell"))==args.owner, "Use separate files for the game and owner shell"
    for key in ("engine","width","count","region","curve"):
        assert data[key]==getattr(args,key),key
    async with async_playwright() as pw:
        exe=os.getenv("CHROMIUM_PATH","/usr/bin/chromium") if args.engine=="chromium" else os.getenv("WEBKIT_PATH")
        browser=await getattr(pw,args.engine).launch(executable_path=exe)
        data["version"]=browser.version
        population=args.indices or list(range(args.count))
        for policy in args.policies:
            layout=args.layout or ("fixed" if policy=="current" else "optimized")
            for i in population:
                assert 0<=i<args.count
                for mode in args.modes:
                    key=f"{policy}/{layout}/{i}/{mode}"
                    if key in data["rows"]:continue
                    print("Opening",args.region,key,flush=True)
                    hashes={}
                    row=await repeat_on_timeout(lambda: exercise(browser,args,i,policy,layout,mode,hashes))
                    row["sourceHashes"]=hashes
                    data["sources"]=hashes
                    data["rows"][key]=row
                    save(args.out,data)
                    print(args.region,key,row["key"],row["selectedIntended"],row["routeAcceptedOnRelease"],round(row["observed"]["displacement"],2),flush=True)
        await browser.close()

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--owner",action="store_true",help="Exercise the /v4/ shell play button and apply real iframe offsets")
    p.add_argument("--startup-timeout",type=int,default=120000,help="Maximum milliseconds for the real presentation to settle")
    p.add_argument("--url",default="http://127.0.0.1:8304");p.add_argument("--region",required=True,choices=v3.REGIONS)
    p.add_argument("--suite",default="household",choices=["household"]);p.add_argument("--engine",choices=["chromium","webkit"],default="chromium")
    p.add_argument("--width",default=390,type=int,choices=HEIGHT);p.add_argument("--count",default=28,type=int,choices=range(1,29))
    p.add_argument("--curve",default="linear",choices=["linear","step"]);p.add_argument("--layout",choices=["fixed","optimized"])
    p.add_argument("--policies",nargs="+",default=["B","current","A","C"],choices=POLICY);p.add_argument("--indices",nargs="+",type=int)
    p.add_argument("--modes",nargs="+",default=["tap","drag"],choices=["tap","drag"]);p.add_argument("--out",required=True,type=Path)
    asyncio.run(run(p.parse_args()))
