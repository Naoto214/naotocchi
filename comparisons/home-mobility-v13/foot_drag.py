"""Replay archived trusted touch inputs with the complete candidate opening shared by both models."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
from unittest.mock import patch
import threading
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'home-mobility-v11'))
import matrix_worker_v11 as native
from foot_replacement import Local


def repeat_natural(browser,url,out):
    coord=('forest',28,320)
    tape=native.v9.history()
    result=dict(engine="Chromium",version=browser.version,conditions="Independent natural opening; archived six gestures; observe each real navigation guard and input gate.",arms={})
    instrument=native.instrument
    def observe(name,source):
        source=instrument(name,source)
        if name=="home-production-model-mobility-v13-foot.js":
            anchor="      const previousScene=scene,previousActors=actors;"
            hook="""      if(reflowChoice)(window.footComparisons||=[]).push({clock,held:reflowChoice.held,reason:reflowChoice.reason});"""
            source=native.old.legacy.once(source,anchor,hook+"\n"+anchor)
        return source
    # Reverse the arm order from the first independent-boot pass.
    for arm in ["v13-foot","v11-foot"]:
        with patch.object(native,"instrument",observe),native.native_page(browser,url,coord,arm,False) as (page,touch,meta):
            cold=native.current_opening(page,meta)
            rows=native.baseline.opening_gestures(page,touch,coord,meta,tape)
            steps={}
            for key,r in rows.items():
                steps[key]={k:r.get(k) for k in ("key","start","goal","selectedKey","issued","accepted","arrived","near4","terminalArrived","terminalNear4","initialGate","releaseGate","blockedClass","releaseJumpCss","unsafeSteps","sweptViolations","peerUnsafe","peerSwept","trusted")}
                if not r.get("skip"):
                    assert r["trusted"] and not any(r.get(k,0) for k in ("unsafeSteps","sweptViolations","peerUnsafe","peerSwept")),r
            result["arms"][arm]=dict(seed=cold["seed"],opening=meta["opening"],activity=cold["background"],rows=steps,
                projections=page.evaluate("window.footComparisons||[]"))
            out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
            print("repeat",arm,flush=True)


def run(browser,url,out):
    tape=native.v9.history()
    result=dict(engine="Chromium",version=browser.version,conditions="Same opening state, RNG and feet; wait for the normal input gate.",cases=[])
    for region,count,width in [('forest',28,320),('mountain',10,320),('forest',10,375),('river_lake',10,390),('home',4,430)]:
        coord=(region,count,width)
        case=dict(region=region,count=count,width=width,arms={})
        result["cases"].append(case)
        reference=None
        initial=None
        for arm in ['v13-foot','v11-foot']:
            with native.native_page(browser,url,coord,arm,False) as (page,touch,meta):
                cold=native.current_opening(page,meta)
                if reference is None:
                    reference=cold
                    initial=meta["opening"]
                case["arms"][arm]={}
                page.evaluate(native.baseline.INK)
                scale=page.evaluate('(()=>{const p=NaotocchiHomeViewport.residentPresentation();return [p.scaleX,p.scaleY]})()')
                selected=[('historical',0),('obstacle',0),('tap',4)] if count==28 else [('historical',0)]
                for kind,index in selected:
                    key=f'{kind}/{index}'
                    ref=native.old.archived_input(tape[*coord,key,'v6'],initial,scale,index)
                    page.evaluate("HomeCastTrial.apply({paused:false});touchQA.manual=false")
                    page.wait_for_function("""()=>{const g=touchQA.gates();if(g.blocked||g.trialPaused||g.pending||touchQA.matrixState().paused)return false;touchQA.manual=true;return true;}""",timeout=120000)
                    page.evaluate("""s=>{
                      touchQA.restore=()=>{touchQA.matrixLoad(s);touchQA.paint();};
                      touchQA.restore();mobilitySelectionQA.recordNext=true;touchQA.matrixRelease=null;
                    }""",reference)
                    assert page.evaluate("touchQA.opening()")==initial
                    row=native.old.legacy.trial(page,touch,index,kind,ref)
                    assert row['trusted'] and not any(row.get(k,0) for k in ("unsafeSteps","sweptViolations","peerUnsafe","peerSwept")),row
                    reduced={k:row.get(k) for k in ("key","selectedKey","start","goal","foot","issued","accepted","arrived","near4","terminalArrived","terminalNear4","releaseJumpCss","initialGate","releaseGate","blockedClass")}
                    reduced["nativeRelease"]=page.evaluate("touchQA.matrixRelease")
                    case["arms"][arm][key]=reduced
                    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
                    print(region,width,arm,key,reduced["selectedKey"],reduced["arrived"],reduced["blockedClass"],flush=True)
        fields=("selectedKey","start","goal","foot","issued","accepted","arrived","near4","terminalArrived","terminalNear4","releaseJumpCss")
        case["differences"]={k:[f for f in fields if row[f]!=case["arms"]["v11-foot"][k][f]] for k,row in case["arms"]["v13-foot"].items()}
        out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('dist',type=Path)
    p.add_argument('out',type=Path)
    p.add_argument('--natural',action='store_true',help='Repeat the original forest/28/320 cold-boot tape with release gates and observed geometry decisions')
    a=p.parse_args()
    srv=ThreadingHTTPServer(("127.0.0.1",0),partial(Local,directory=a.dist))
    threading.Thread(target=srv.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
            exercise=repeat_natural if a.natural else run
            exercise(browser,"http://127.0.0.1:"+str(srv.server_port),a.out)
            browser.close()
    finally:
        srv.shutdown()
