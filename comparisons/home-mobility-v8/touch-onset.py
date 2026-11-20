"""Confirm physical drag start and final foot on native (uncontrolled) frame time."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("input_clock",HERE/"performance-touch.py")
driver=importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
clock=driver.clock
PROBE="""
document.addEventListener('pointerup',e=>{
 const t=window.footEvidence;
 if(!t||e.pointerType!=='touch')return;
 t.released=e.timeStamp;t.trusted=e.isTrusted;
 function observe(){
   if(window.footEvidence!==t)return;
   if(sampleFoot()){t.done=true;return;}
   mobilityPerf.nativeRaf(observe);
 }
 mobilityPerf.nativeRaf(observe);
},true);
window.sampleFoot=()=>{
 const t=window.footEvidence;if(!t?.released)return false;
 const now=performance.now(),delta=now-t.released;
 if(t.key&&t.plan){
   const a=mobilityPerf.live.snapshot().find(s=>s.key===t.key);
   const dist=p=>Math.hypot(a.x-p.x,a.y-p.y);
   if(t.firstStepMs===null&&dist(t.from)>=1)t.firstStepMs=delta;
   if(t.firstStepMs!==null&&!a.target&&!a.route.length&&dist(t.plan)<.25){
     t.arrivalMs=delta;t.end={x:a.x,y:a.y};return true;
   }
 }
 return delta>=5000;
};
"""


def check(browser,base,arm,inputs):
    page=browser.new_page(viewport={"width":390,"height":792},is_mobile=True,has_touch=True,device_scale_factor=2)
    page.add_init_script("(()=>{"+clock.INIT+PROBE+"})();")
    build={}
    def measure(r):
        res=r.fetch();name=r.request.url.rsplit("/",1)[-1].split("?")[0]
        raw=res.text();build[name]=hashlib.sha256(raw.encode()).hexdigest()
        s=clock.native(name,raw,False)
        if "production-model" in name:
            anchor="a.route=path.slice(1);a.target=path[0];a.source=source;"
            s=clock.replace(s,anchor,anchor+"""
              if(window.footEvidence?.key===a.key&&source==='drag'){
               const end=path.at(-1);footEvidence.plan={x:end.x,y:end.y};
              }""")
        if "production-diorama" in name:
            anchor="const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground',{pointerDrop:g.drag});"
            s=clock.replace(s,anchor,"""if(g.drag&&window.footEvidence){
                 const a=model.snapshot().find(a=>a.key===(g.key||model.selected()));
                 if(a)Object.assign(footEvidence,{key:a.key,from:{x:a.x,y:a.y},request:p});
               }"""+anchor+"if(g.drag&&window.footEvidence)footEvidence.accepted=success;")
        r.fulfill(response=res,body=s)
    page.route("**/*production-model*.js*",measure)
    page.route("**/*production-diorama*.js*",measure)
    try:
        query={"region":"forest","count":28,"time":"day","season":"autumn","weather":"sunny","paused":1,"clock":0,"variant":"B","policy":"B","layout":"optimized","curve":"linear","compareSplit":0,"ground":"on"}
        page.goto(base+"/mobility-"+arm+".html?"+urlencode(query),wait_until="domcontentloaded",timeout=120000)
        page.wait_for_function("mobilityPerf.scene&&mobilityPerf.reset&&HomeCastTrial.inspect().length===28",timeout=120000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
        page.evaluate("HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);0")
        if inputs is None:
            visible=page.evaluate(driver.TARGETS)
            assert len(visible)>=3
            inputs=[]
            for i,(dx,dy) in enumerate([(18,0),(-22,0),(12,12),(0,20),(26,-6),(-16,12)]):
                row=visible[i*3%len(visible)];x,y=row["point"]
                inputs.append({"expected":row["key"],"start":[x,y],"end":[x+dx,y+dy]})
        cdp=page.context.new_cdp_session(page)
        records=[]
        for command in inputs:
            page.evaluate("mobilityPerf.reset(214);window.footEvidence={firstStepMs:null,arrivalMs:null};0")
            driver.touch.send(page,cdp,command["start"],command["end"],"drag")
            page.wait_for_function("window.footEvidence?.done",timeout=45000)
            row=page.evaluate("footEvidence")
            assert row["trusted"]
            records.append({**command,**row})
        return {"fingerprints":build,"readings":records,"nativeAtBoot":page.evaluate("mobilityPerf.nativeAtBoot")},inputs
    finally:
        page.close()


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8388/game")
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path="/usr/bin/chromium")
        data={"browser":browser.version,"seed":214,"observeUntilMs":5000,"arms":{}}
        inputs=None
        for arm in ["v6","v7","v8"]:
            data["arms"][arm],inputs=check(browser,args.base,arm,inputs)
            args.out.write_text(json.dumps(data,separators=(",",":"))+"\n")
            print(arm,[(r["firstStepMs"],r["arrivalMs"]) for r in data["arms"][arm]["readings"]],flush=True)
        browser.close()
