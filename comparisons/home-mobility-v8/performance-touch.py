"""Measure native pointerup-to-next-rAF latency with trusted WPE touch drags."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright
HERE = Path(__file__).resolve().parent


def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    loaded=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


clock=module("clock",HERE.parent/"home-mobility-v7/performance-clock.py")
touch=module("finish_touch",HERE.parent/"home-finish-v5/verify_touch.py")
args_input=module("input_cost",HERE.parent/"home-mobility-v7/performance-input.py")
LISTEN="""
const q=mobilityPerf;window.inputLater={queue:[],result:[]};
document.addEventListener('pointerup',e=>{
  const row={trusted:e.isTrusted,type:e.pointerType,eventTime:e.timeStamp,
    queueMs:performance.now()-e.timeStamp,handlerMs:null,accepted:null};
  inputLater.queue.push(row);
  q.nativeRaf(()=>{
    row.nextFrameMs=performance.now()-row.eventTime;
    inputLater.result.push(row);
  });
},true);
"""
TARGETS="""()=>{
  const rows=[...document.querySelectorAll('#castStage [data-diorama-actor]')];
  const points=[];
  for(const row of rows){
    const img=row.querySelector('.character-asset');
    if(!img)continue;
    const r=img.getBoundingClientRect();
    for(const dy of [.56,.68,.42]){
      const x=Math.round(r.left+r.width*.5),y=Math.round(r.top+r.height*dy);
      if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===row){
        points.push({key:row.dataset.dioramaActor,point:[x,y]});break;
      }
    }
  }
  return points;
}"""


def observe(browser,session,base,arm,commands):
    p=browser.new_page(viewport={"width":390,"height":792},device_scale_factor=2,is_mobile=True,has_touch=True)
    try:
        p.add_init_script("(()=>{"+clock.INIT+LISTEN+"})();")
        def route(r):
            rb=r.fetch();name=r.request.url.rsplit("/",1)[-1]
            s=clock.native(name,rb.text(),False)
            if "production-diorama" in name:
                call="const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground',{pointerDrop:g.drag});"
                s=clock.replace(s,call,"const measureStart=performance.now();"+call+"""
                const row=inputLater.queue.at(-1);if(row&&g.drag){
                  row.accepted=success;row.nativeMoveMs=performance.now()-measureStart;
                  row.handlerMs=performance.now()-row.eventTime;
                  row.key=g.key||model.selected();
                }""")
            r.fulfill(response=rb,body=s)
        p.route("**/*production-model*.js*",route)
        p.route("**/*production-diorama*.js*",route)
        params={"region":"forest","count":28,"time":"day","season":"autumn","weather":"sunny","paused":1,"clock":0,"variant":"B","policy":"B","layout":"optimized","curve":"linear","compareSplit":0,"ground":"on","diagnostics":0}
        p.goto(base+"/mobility-"+arm+".html?"+urlencode(params),wait_until="domcontentloaded",timeout=120000)
        p.wait_for_function("mobilityPerf.scene && mobilityPerf.reset && HomeCastTrial.inspect().length===28",timeout=120000)
        p.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(e=>e.decode()))")
        p.evaluate("HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);0")
        if commands is None:
            places=p.evaluate(TARGETS)
            assert len(places)>=6,places
            commands=[]
            for j,(dx,dy) in enumerate([(12,0),(-24,0),(0,18),(0,-20),(30,9),(-22,-12),(12,0),(-16,20)]):
                where=places[j*3%len(places)]
                start=where["point"]
                commands.append({"expected":where["key"],"start":start,"end":[start[0]+dx,start[1]+dy]})
        readings=[]
        for cmd in commands:
            p.evaluate("mobilityPerf.reset(214);inputLater.queue.length=inputLater.result.length=0;0")
            touch.send(p,session,cmd["start"],cmd["end"],"drag")
            p.wait_for_function("inputLater.result.length>0",timeout=30000)
            row=p.evaluate("inputLater.result[0]")
            assert row["trusted"] and row["type"]=="touch",row
            readings.append({**cmd,**row})
        native=p.evaluate("mobilityPerf.nativeAtBoot")
        assert all(native.values())
        return {"readings":readings,"nativeAtBoot":native,
                "distribution":{k:args_input.distribution([r.get(k) for r in readings]) for k in ["queueMs","handlerMs","nativeMoveMs","nextFrameMs"]}},commands
    finally:
        p.close()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base",default="http://127.0.0.1:8377/game")
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    with sync_playwright() as pw:
        server=touch.WebKitTouch(os.getenv("WEBKIT_PATH",pw.webkit.executable_path))
        try:
            browser=pw.webkit.connect(server.endpoint)
            result={"webkit":browser.version,"rows":{}}
            commands=None
            for arm in ["v6","v7","v8"]:
                result["rows"][arm],commands=observe(browser,server,args.base,arm,commands)
                args.out.write_text(json.dumps(result,separators=(",",":"))+"\n")
                print(arm,result["rows"][arm]["distribution"],flush=True)
        finally:
            server.close()
