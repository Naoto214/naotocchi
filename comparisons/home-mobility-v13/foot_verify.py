"""Run the independent owner entry on real native actors, renderer, model and save serializer."""
import argparse
import functools
import importlib.util
import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
V11 = HERE.parent / "home-mobility-v11"
V12 = HERE.parent / "home-mobility-v12"
sys.path.insert(0, str(V11))
import foot_replacement as original
import foot_transitions as transitions
import foot_save as saves

MODELS = {arm: f"home-production-model-mobility-{arm}.js" for arm in ("v10","v11-foot","v13-foot")}
PAINTERS = {arm: f"home-production-diorama-mobility-{version}.js"
            for arm,version in (("v10","v10"),("v11-foot","v11"),("v13-foot","v12"))}
REGIONS = "forest river_lake city countryside sea snow mountain jungle desert deepsea star_stop memory_lake home".split()
WIDTHS = [320,375,390,430]
WIDTH_HEIGHT = {320:516,375:615,390:630,430:695}


def once(code, old, new):
    return original.replace_once(code, old, new)


def browser_page(browser, width, height):
    page = browser.new_page(viewport=dict(width=width,height=height), device_scale_factor=2,
        is_mobile=True,has_touch=True,timezone_id="Asia/Tokyo",locale="ja-JP")
    page.set_default_timeout(120000)
    return page


def serve_script(page, dist, name, change):
    content = change((dist/"game"/name).read_text())
    page.route("**/"+name+"*",lambda r: r.fulfill(content_type="text/javascript",body=content))


def open_page(page, base, arm, **params):
    search = urlencode({**original.PARAMETERS, **params})
    page.goto(base+f"/game/mobility-{arm}.html?"+search,wait_until="domcontentloaded")
    page.wait_for_function("window.HomeCastTrial?.ready && HomeDragTrial.opening()")
    page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")


def witnesses(browser, base, dist):
    peers=json.loads((V11/"evidence/foot-recorded-panda.json").read_bytes())["peers"]
    output=[]
    for arm in ("v10","v13-foot"):
        page=browser_page(browser,320,792)
        serve_script(page,dist,MODELS[arm],original.attach_model)
        serve_script(page,dist,PAINTERS[arm],original.attach_renderer)
        open_page(page,base,arm)
        result=page.evaluate("""peers=>{
          restoreMeasuredFeet(peers);
          const before=footNativeProbe.snapshot(),scale=footNativeProbe.scale();
          footNativeProbe.replace('companion:panda');
          const changed=footNativeProbe.snapshot().map((a,i)=>({key:a.key,from:before[i],to:a,
            css:Math.hypot((a.x-before[i].x)*scale.x,(a.y-before[i].y)*scale.y)})).filter(a=>a.css>1e-7);
          return {count:before.length,changed};}""",peers)
        assert result['count']==28
        if arm=="v10":
            assert len(result['changed'])==1 and abs(result['changed'][0]['css']-22.74)<.01
        else:
            assert result['changed']==[]
        output.append(dict(arm=arm,action="replace-panda",**result))
        page.close()
    return output + corridor(browser,base,dist)


def corridor(browser,base,dist):
    output=[]
    for region in ("mountain","forest"):
        page=browser_page(browser,320,516)
        open_page(page,base,"v13-foot-corridor",region=region,count=10)
        record=json.loads((V11 /f"evidence/corridor-{region}.json").read_bytes())
        for mode in ("native","guard"):
            result=page.evaluate("""([record,mode])=>{
              FootCorridorReplay.restore(record);
              const result=FootCorridorReplay.apply(mode);
              let step=FootCorridorReplay.begin();
              const positions=new Set(),shadows=new Set();
              for(let i=0;!step.done && i<250;i++){
                step=FootCorridorReplay.step();
                const dog=FootCorridorReplay.footprints().find(p=>p[0]==='pet:dog');
                const shadow=[...document.querySelectorAll('.diorama-shadow')].find(s=>
                  Math.hypot(parseFloat(s.style.left)-dog[1],parseFloat(s.style.top)-dog[2])<.002);
                if(!shadow)throw Error('Missing painted shadow at the walking foot');
                positions.add(JSON.stringify(dog));
                shadows.add(JSON.stringify([shadow.style.left,shadow.style.top]));
              }
              return {...result,step,positions:positions.size,shadows:shadows.size};
            }""",[record,mode])
            panda=next(r["css"] for r in result["change"] if r["key"]=="companion:panda")
            held=(region,mode)==("mountain","guard")
            assert result["held"]==held and result["step"]["arrived"]
            assert result["positions"]>2 and result["shadows"]>2
            assert abs(panda-(0 if held else 55.66 if region=="mountain" else 12.22))<.01
            if held:
                assert abs(result["step"]["walked"]-72.56)<.01
            output.append(dict(region=region,panda=panda,**result))
        page.close()
    return output


def interface(browser,base,dist):
    page=browser_page(browser,390,844)
    errors=[]
    page.on("pageerror",lambda error: errors.append(str(error)))
    page.goto(base+"/v13/foot-corridor.html",wait_until="domcontentloaded")
    page.wait_for_function("document.body.dataset.ready==='true'")
    page.locator("#apply").tap()
    page.wait_for_function("document.body.dataset.phase==='arranged'")
    page.locator("#walk").tap()
    page.wait_for_function("document.body.dataset.phase==='finished'")
    result=page.evaluate("FootCorridorComparison.read()")
    assert result["held"] and result["travel"]["arrived"] and abs(result["travel"]["walked"]-72.56)<.01
    assert not errors,errors
    row=dict(text=page.locator('#result').inner_text(),decision=result["decision"],travel=result["travel"],errors=errors)
    page.close()
    return [row]


def controls(browser,base,dist):
    page=browser_page(browser,320,516)
    hook="""    const watched=actor('companion:panda');
    const modeTest=globalThis.footNegativeControl;
    const replacement={...list.find(a=>a.key===watched.key)};
    if(modeTest==='art')replacement.reflowArt+='-different-cell';
    if(modeTest==='gear')replacement.reflowGear+='-different-item';
    if(modeTest==='ink')replacement.reflowInk={...replacement.reflowInk,up:replacement.reflowInk.up+1};
    if(modeTest==='population')list=list.filter(a=>a.key!==watched.key);
    if(modeTest==='projection')next.navigation.reflowGeometry+='-different-projection';
    if(modeTest==='overlap')Object.assign(watched,{x:actors[0].x,y:actors[0].y});
    if(modeTest==='outside')Object.assign(watched,{x:-1000,y:-1000});
    if(modeTest==='route-outside')Object.assign(watched,{target:{x:-1000,y:-1000},source:'keyboard'});
    if(modeTest==='route-safe'){
      const s=scene.navigation.intentScale;
      for(const length of [8,3])for(let i=0;i<48&&!watched.target;i++){
        const end={x:watched.x+length*Math.cos(i*Math.PI/24)/s.x,y:watched.y+length*Math.sin(i*Math.PI/24)/s.y};
        if(yieldLeg(watched,watched,end,new Map()))Object.assign(watched,{target:end,source:'keyboard'});
      }
      if(!watched.target)throw Error('Expected safe native foot target');
      globalThis.footCommandBefore={...watched.target};
    }
    list=list.map(a=>a.key===watched.key?replacement:a);
    const now=geometryExitAudit(next,actors);"""
    def instrument(source):
        source=once(source,"    const now=geometryExitAudit(next,actors);",hook)
        marker="    const after=geometryExitAudit(scene,actors);"
        return once(source,marker,"    globalThis.footCommandAfter={target:actor(watched.key)?.target,source:actor(watched.key)?.source};\n"+marker)
    serve_script(page,dist,"home-production-model-v13-foot-replay.js",instrument)
    open_page(page,base,"v13-foot-corridor",region="mountain",count=10)
    record=json.loads((V11/"evidence/corridor-mountain.json").read_bytes())
    expected={"unchanged":"reserved-exit-open","art":"resident-geometry","gear":"resident-geometry",
        "ink":"resident-geometry","population":"geometry-or-population","projection":"geometry-or-population",
        "overlap":"existing-contact","outside":"invalid-foot","route-outside":"route-or-budget","route-safe":"reserved-exit-open"}
    rows=[]
    for mode,reason in expected.items():
        result=page.evaluate("""([record,mode])=>{
          window.footNegativeControl=mode;
          FootCorridorReplay.restore(record);
          const {decision}=FootCorridorReplay.apply('guard');
          return {mode,decision,before:window.footCommandBefore,after:window.footCommandAfter};
        }""",[record,mode])
        assert result["decision"]["reason"]==reason and result["decision"]["held"]==(mode in ("unchanged","route-safe")),result
        if mode=="route-safe":
            assert result["after"]=={"target":result["before"],"source":"keyboard"}
        rows.append(result)
    page.close()
    return rows


SYNC_PROBE = """
    globalThis.testFootNavigation = () => {
      const prior=actors.map(a=>({key:a.key,x:a.x,y:a.y,target:a.target,route:a.route}));
      const nav=scene.navigation;
      const list=actors.map(a=>({...a}));
      sync(list,{...scene,navigation:{...nav}});
      const decision=globalThis.HomeV12Reflow.read(actors[0].key);
      const scale=nav.intentScale;
      const movement=actors.map((a,i)=>({key:a.key,css:Math.hypot((a.x-prior[i].x)*scale.x,(a.y-prior[i].y)*scale.y)}));
      return {decision,changed:movement.filter(x=>x.css>1e-6),routesPreserved:
        actors.every((a,i)=>JSON.stringify([a.target,a.route])===JSON.stringify([prior[i].target,prior[i].route]))};
    };
    return {metrics:"""


def regions(browser,base,dist):
    results=[]
    for width in WIDTHS:
        for region in REGIONS:
            page=browser_page(browser,width,WIDTH_HEIGHT[width])
            serve_script(page,dist,MODELS["v13-foot"],lambda s:once(s,"    return {metrics:",SYNC_PROBE))
            open_page(page,base,"v13-foot",region=region,count=10)
            r=page.evaluate('testFootNavigation()')
            if r['decision']['held']:
                assert not r['changed'] and r['routesPreserved'],(region,width,r)
            results.append(dict(region=region,width=width,height=WIDTH_HEIGHT[width],count=10,**r))
            print(region,width,r['decision']['reason'],flush=True)
            page.close()
    return results


def care(browser,base,dist):
    # The native transition driver calls the original game operations, including onAgeChanged,
    # equip/unequip and evolution. Rewrite only its fixture URL and instrumentation targets.
    helper=transitions.run
    class HomeURL(str):
        def __add__(self, fragment):
            return str(self) + fragment.replace('/game/mobility-v10.html?', '/game/mobility-v13-foot.html?')
    transitions.MODEL=MODELS["v13-foot"]
    transitions.RENDER=PAINTERS["v13-foot"]
    transitions.patched=lambda s,k: s if k=="patchFoot" else original.patched(s,k)
    rows=[]
    for case in ("notice","social","expression","time","growth","evolution","gear-off","gear-on","width","region"):
        r=helper(browser,HomeURL(base),dist,case)
        assert not r['pageErrors'] and all(a['terrain'] and a['inside'] for a in r['sceneAfter']['people'])
        if case in ("notice","social","expression","time"):
            assert not r["shifts"] and not r["screenChanges"]
        if case=="growth": assert r['lifeAfter']['age']>r['lifeBefore']['age']
        if case=="evolution": assert r['lifeAfter']['form']!=r['lifeBefore']['form']
        if case.startswith("gear-"): assert r['lifeAfter']['gear']!=r['lifeBefore']['gear']
        rows.append(dict(case=case,before=[r["lifeBefore"][k] for k in ("stage","form","gear")],
                         after=[r["lifeAfter"][k] for k in ("stage","form","gear")],
                         shifted=len(r["shifts"]),maxScreenCSS=max((s["distanceCSS"] for s in r["screenChanges"]),default=0),
                         remeasured=sum(s[2]=="remeasured" for s in r["observedChanges"]),pageErrors=r["pageErrors"]))
        print(rows[-1],flush=True)
    return rows


def save(browser,base,dist):
    import hashlib
    def room(arm,raw=None):
        page=browser_page(browser,390,792)
        page.add_init_script("Date.now=()=>1780000000000;")
        serve_script(page,dist,PAINTERS[arm],lambda s:once(s,"    function sync(){",saves.BRIDGE))
        serve_script(page,dist,transitions.GAME,lambda s:once(once(s,transitions.ROOT_EVENT,saves.SAVE),
            "setInterval(loop, TICK_MS);","globalThis.footSaveAdvanceCareTick=loop;"))
        if raw:
            serve_script(page,dist,"beauty/fixture.js",lambda s:once(s,"JSON.stringify(state));",json.dumps(raw)+");"))
        open_page(page,base,arm,paired=0)
        return page
    source=room("v13-foot")
    results=[]
    for when in ("opening","active","parked"):
        if when=="active": watched=source.evaluate("footSaveScene.begin()")
        if when=="parked": source.evaluate("k=>footSaveScene.park(k)",watched)
        raw=source.evaluate("captureNativeFootSave()")
        before=source.evaluate("footSaveScene.read()")
        saved=json.loads(raw)
        output=[]
        for arm in ("v11-foot","v13-foot"):
            restored=room(arm,raw)
            after=restored.evaluate("footSaveScene.read()")
            life=json.loads(restored.evaluate("captureNativeFootSave()"))
            assert life['companions']==saved['companions'] and life['speciesLine']==saved['speciesLine'] and life['lifetime']['equippedItemId']==saved['lifetime']['equippedItemId']
            assert len(after['people'])==28 and not any(a['target'] or a['route'] for a in after['people'])
            output.append(after)
            restored.close()
        assert output[0]==output[1]
        distances=[((a['x']-b['x'])*before['scale']['x'])**2+((a['y']-b['y'])*before['scale']['y'])**2
                   for a,b in zip(before['people'],output[1]['people'])]
        results.append(dict(when=when,saveSHA256=hashlib.sha256(raw.encode()).hexdigest(),
            identicalRestoredActors=28,companionsAndEquipmentEqual=True,maxRestoreCSS=max(distances)**.5))
    source.close()
    return results


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("suite",choices=["witnesses","corridor","interface","controls","regions","care","save","legacy"])
    parser.add_argument("dist",type=Path)
    parser.add_argument("out",type=Path)
    parser.add_argument("--engine",choices=["chromium","webkit"],default="chromium")
    parser.add_argument("--executable",help="Browser executable path")
    args=parser.parse_args()
    if args.suite=="legacy":
        spec=importlib.util.spec_from_file_location('v12_protection',V12/'verify-protected.py')
        legacy=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(legacy)
        result=legacy.native_tests(args.dist/'game','v13-foot')
    else:
        server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(original.Local,directory=args.dist))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as pw:
                binary=args.executable or ("/usr/bin/chromium" if args.engine=="chromium" else None)
                browser=getattr(pw,args.engine).launch(executable_path=binary)
                result=dict(engine={"chromium":"Chromium","webkit":"Linux WebKit"}[args.engine],version=browser.version,
                    cases=globals()[args.suite](browser,"http://127.0.0.1:"+str(server.server_port),args.dist))
                browser.close()
        finally:
            server.shutdown()
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
