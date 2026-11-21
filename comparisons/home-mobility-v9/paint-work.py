"""Comparative style, layout, and composited repaint observations with identical work."""
import argparse
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import HERE, clock, distribution, load, native_page, save

fixed=load("fixed_cast",HERE/"performance-fixed.py")

def basic_stats(values):
    summary=distribution(values)
    return {k:summary[k] for k in ["n","p50","p95","max"]} if summary else None


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--frames",type=int,default=168)
    p.add_argument("--order",default="v8,v9,v9,v8")
    args=p.parse_args()
    painters,hashes=fixed.painters(args.base)
    inject=(HERE/"performance-fixed.js").read_text().replace("PAINTERS",painters)
    def instrument(name,src):
        return clock.replace(src,"    function stop(){",inject+"\n    function stop(){") if "production-diorama" in name else src
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH","/usr/bin/google-chrome"))
        pg,errors,_=native_page(browser,args.base,"v8",init=fixed.HOLD,transform=instrument)
        session=pg.context.new_cdp_session(pg)
        session.send("Performance.enable")
        session.send("LayerTree.enable")
        painted=[]
        sizes={}
        def layers(event):
            for layer in event.get("layers",[]):
                sizes[layer["layerId"]]=[layer["width"],layer["height"]]
        trace_events=[]
        session.on("Tracing.dataCollected",lambda e:trace_events.extend(e["value"]))
        session.on("LayerTree.layerTreeDidChange",layers)
        session.on("LayerTree.layerPainted",lambda e:painted.append([e["layerId"],e["clip"]]))
        def metrics():
            return {r["name"]:r["value"] for r in session.send("Performance.getMetrics")["metrics"] if
                    r["name"] in ["LayoutCount","RecalcStyleCount","LayoutDuration","RecalcStyleDuration"]}
        pg.evaluate("n=>fixedCast.capture(n,214).initial.length",args.frames)
        pg.expose_function("markSampling",lambda js:None)
        report=dict(browser=browser.version,controllers=hashes,rows=[])
        for arm in args.order.split(","):
            pg.evaluate("""()=>{window.styleWrites={};
                if(window.attributeProbe)return;
                window.attributeProbe=new MutationObserver(records=>{
                  for(const r of records){
                    const k=r.attributeName;styleWrites[k]=(styleWrites[k]||0)+1;
                  }
                });
                attributeProbe.observe(document.getElementById('castStage'),{subtree:true,attributes:true});
            }""")
            painted.clear()
            trace_events.clear()
            session.send("Tracing.start",{"categories":"devtools.timeline,disabled-by-default-devtools.timeline.layers", "transferMode":"ReportEvents"})
            before=metrics()
            frame=pg.evaluate("arm=>fixedCast.run(arm,16)",arm)
            after=metrics()
            complete=[]
            session.once("Tracing.tracingComplete",lambda event:complete.append(event))
            session.send("Tracing.end")
            deadline=time.monotonic()+60
            while not complete and time.monotonic()<deadline:
                pg.wait_for_timeout(50)
            assert complete,"Chromium trace did not finish"
            intervals={}
            clips=[]
            for event in trace_events:
                name=event.get("name")
                if name in ["Paint","PrePaint","RasterTask","Layerize","UpdateLayerTree","CompositeLayers"] and event.get("ph")=="X":
                    intervals.setdefault(name,[]).append(event["dur"]/1000)
                    data=event.get("args",{}).get("data",{})
                    if name=="Paint" and data.get("clip"):
                        xy=data["clip"]
                        if len(xy)==8:
                            area=abs(sum(xy[2*i]*xy[(2*i+3)%8]-xy[(2*i+2)%8]*xy[2*i+1] for i in range(4)))/2
                            clips.append([data.get("nodeId"),data.get("layerId"),area])
            counts={}
            total=0
            for layer,clip in painted:
                area=max(0,clip["width"])*max(0,clip["height"])
                total+=area
                info=counts.setdefault(layer,dict(n=0,area=0,largest=0,size=sizes.get(layer)))
                info["n"]+=1;info["area"]+=area;info["largest"]=max(info["largest"],area)
            finite=[c[2] for c in clips if c[2]<=390*792*4]
            row=dict(paintClipAreaLocalCSS=basic_stats(finite),largeOrUnboundedPaintClips=len(clips)-len(finite),
                     paintClipNodes=len({c[0] for c in clips}),arm=arm,frames=args.frames,walkersByFrame=basic_stats(frame["activeByFrame"]),
                     chromium={k:after[k]-before[k] for k in before},stageAttributeWrites=pg.evaluate("styleWrites"),
                     tracePhases={k:dict(n=len(v),sumMs=round(sum(v),3),maxMs=max(v)) for k,v in intervals.items()},
                     layerPaintNotifications=len(painted),layerClipAreaSum=total if painted else None,layers=counts)
            assert not errors,errors
            report["rows"].append(row)
            save(args.out,report)
            print(arm,row["chromium"],total,row["tracePhases"],flush=True)
        browser.close()
