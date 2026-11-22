"""Read a bounded grid of real helper ground/contact transitions from the forest opening in a paused native browser."""
import argparse
import functools
import hashlib
import http.server
import json
import sys
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
V11=HERE.parent/"home-mobility-v11"
sys.path.insert(0,str(V11))
from space_capture import QuietHandler, forest_url


def run(args):
    raw=json.loads((args.captures / (str(args.width)+"-v10-reference.json")).read_text())
    code=(V11/"space-probe.js").read_text().replace("return {geometry,rays,passing};",(HERE/args.script).read_text())
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(QuietHandler,directory=str(args.dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=args.chromium)
            page=browser.new_page(viewport={"width":args.width,"height":792},device_scale_factor=2,is_mobile=True,has_touch=True)
            def hook(route):
                response=route.fetch()
                source=response.text()
                assert hashlib.sha256(source.encode()).hexdigest() in raw["modelSHA"]
                marker="      if(arrange){clearRelief();"
                assert source.count(marker)==1
                route.fulfill(response=response,body=source.replace(marker,"      if(scene.navigation?.intentScale){"+code+"}\n"+marker))
            page.route("**/home-production-model-mobility-*.js*",hook)
            page.goto(forest_url(f"http://127.0.0.1:{server.server_port}","v10-reference"),wait_until="domcontentloaded")
            page.wait_for_function("HomeCastTrial.ready && HomeDragTrial.opening() && window.forestSpaceSurvey",timeout=90000)
            result=[]
            for label in args.phases:
                f=next(p for p in raw["phases"] if p["label"]==label)
                for key in args.keys:
                    payload=dict(feet=f["feet"],key=key,spacing=args.spacing,extent=args.extent,stateBudget=args.budget)
                    if args.method=="witnessFairness":
                        payload["recording"]=json.loads((HERE/"evidence/yield-recording.json").read_bytes())
                    data=page.evaluate(f"q=>forestSpaceSurvey.{args.method}(q)",payload)
                    result.append(dict(label=label,width=args.width,clock=f["clock"],sourceSHA=raw["sourceSHA"],**data))
                    args.out.write_text(json.dumps(result,separators=(",",":"))+"\n")
                    print(label,key,data.get("stats"),flush=True)
            browser.close()
    finally:
        server.shutdown()


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist",type=Path,required=True)
    p.add_argument("--captures",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--width",type=int,default=320)
    p.add_argument("--spacing",type=float,default=2)
    p.add_argument("--extent",type=float,default=48)
    p.add_argument("--budget",type=int,default=80000)
    p.add_argument("--phases",nargs="+",default=["opening"])
    p.add_argument("--keys",nargs="+",default=["companion:tanuki","companion:box"])
    p.add_argument("--script",default="space-grid.js",choices=["space-grid.js","space-refuge.js","space-fairness.js"])
    p.add_argument("--method",default="ordering",choices=["ordering","refuge","witnessFairness"])
    p.add_argument("--chromium",default="/usr/bin/chromium")
    run(p.parse_args())
