"""Shared-host WPE control for the optional layout, using the owner's actual fresh-seat bridge."""
import argparse
import gzip
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import HERE,PARAMS,WPE,clock,distribution,native_page,save


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--raw",type=Path,required=True)
    args=p.parse_args()
    PARAMS["paired"]=1
    measurements=(HERE.parent/"home-mobility-v7/performance-window.js").read_text()
    result=dict(seconds=60,seed=214,view=[390,792,2],order=["v9","v9-seats"],warmupPausedSeconds=5,rows=[])
    raw=[]
    with sync_playwright() as pw:
        browser=pw.webkit.launch(executable_path=WPE)
        result["webkit"]=browser.version
        for arm in result["order"]:
            page,errors,fingerprints=native_page(browser,args.base,arm)
            # Leave the exact owner bridge's reseated model and RNG installed.
            # A convenience reset here would discard the optional placement.
            page.wait_for_function("window.HomeDragTrial?.opening()?.actors.length===28")
            page.wait_for_timeout(5000)
            initial=page.evaluate("HomeDragTrial.opening().actors.map(([k,,x,y,w,h])=>[k,x,y,w,h])")
            page.evaluate("mobilityPerf.reset=()=>mobilityPerf.live;0")
            probe=clock.Scheduler(.12)
            page.expose_function("markSampling",probe.begin)
            try:
                s=page.evaluate(measurements,dict(seconds=60,trace=False,osClock=True,seed=214))
            finally:
                probe.end()
            assert s["opening"]==initial and s["retained"] and s["visibleAtEnd"]==s["visibleAtOpen"]==28
            assert not errors and s["clock"]>0 and len(probe.rows)>1
            first,last=probe.rows[0],probe.rows[-1]
            result["rows"].append(dict(arm=arm,sources=fingerprints,distribution=distribution(s["intervals"]),
                moves=s["moves"],distance=s["distance"],modelClock=s["clock"],social=s["events"].get("social",0),
                hostCores=(last[1]-first[1])/((last[0]-first[0])*1000),hostThrottleEvents=last[2]-first[2],
                opening=initial,threadCPUms={k:round(last[5][k]-first[5][k],1) for k in ["raster","compositor","main"]}))
            raw.append(dict(arm=arm,sample=s,os=probe.rows))
            save(args.out,result)
            print(arm,result["rows"][-1]["distribution"],s["moves"],flush=True)
            page.close()
        browser.close()
    old,new=[r["opening"] for r in result["rows"]]
    assert [a[0] for a in old]==[a[0] for a in new]
    result["changedFeet"]=[a[0] for a,b in zip(old,new) if a[1:3]!=b[1:3]]
    assert result["changedFeet"],"optional opening not exercised"
    save(args.out,result)
    args.raw.parent.mkdir(parents=True,exist_ok=True)
    with gzip.GzipFile(str(args.raw),"wb",mtime=0) as stream:
        stream.write(json.dumps(raw,separators=(",",":")).encode())
