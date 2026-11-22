"""Use actual touch input to play both native owl models on the recorded forest."""
import argparse
import functools
import hashlib
import http.server
import json
import math
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

def run(dist,output,engine,executable,screenshot=None):
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=dist))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=getattr(pw,engine).launch(executable_path=executable)
            page=browser.new_page(viewport={"width":320,"height":792},device_scale_factor=2,is_mobile=True,has_touch=True,locale="ja-JP")
            page.set_default_timeout(100_000)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{server.server_port}/v11/owl.html",wait_until="domcontentloaded")
            page.wait_for_function("document.body.dataset.ready==='true'||document.querySelector('#status').textContent.includes('再生できません')")
            assert page.evaluate("document.body.dataset.ready")== "true",(page.locator("#status").text_content(),errors)
            page.locator("#both").tap()
            page.wait_for_function("document.body.dataset.finished==='after'||document.querySelector('#status').textContent.includes('中断')")
            assert page.evaluate("document.body.dataset.finished")=="after",(page.locator("#status").text_content(),errors)
            data=page.evaluate("Object.fromEntries(['original','after'].map(key=>[key,OwlComparison.receipt(key)]))")
            before,after=data["original"],data["after"]
            assert before["origin"]["feet"]==after["origin"]["feet"] and len(after["origin"]["feet"])==28
            assert not before["accepted"] and not before["arrived"] and not any(x["distance"] for x in before["steps"])
            assert after["accepted"] and after["arrived"] and abs(after["steps"][-1]["distance"]-16)<.02
            assert len(set(tuple(s["foot"]) for s in after["steps"]))>=6
            assert abs(math.dist(after["origin"]["owl"],after["steps"][-1]["painted"])-16)<.02
            images=page.evaluate("""Object.fromEntries([...document.querySelectorAll('iframe')].map(frame=>{
              const doc=frame.contentDocument;const a=doc.querySelector('[data-diorama-actor="companion:owl"]'),image=a.querySelector('img');
              return [frame.dataset.arm,{image:image?.currentSrc?.split('/').pop(),width:image?.naturalWidth,
                actors:doc.querySelectorAll('[data-diorama-actor]').length,background:frame.contentWindow.HomeBeauty?.paintRect?.width}];}))""")
            assert all(x["actors"]==28 and x["width"] for x in images.values()),images
            assert not errors,errors
            assert all(s["body"]==before["origin"]["bodyTranslation"] for s in before["steps"])
            bodyStart=after["origin"]["bodyTranslation"]
            bodyEnd=after["steps"][-1]["body"]
            assert abs(math.hypot(*[(bodyEnd[i]-bodyStart[i])*after["origin"]["scale"][i] for i in range(2)])-16)<.03
            assert len(set(tuple(s["body"]) for s in after["steps"]))>=6
            ring=page.locator(".ring").bounding_box()
            view=page.locator(".window").bounding_box()
            assert view["x"]<=ring["x"]<=view["x"]+view["width"]-ring["width"]
            assert view["y"]<=ring["y"]<=view["y"]+view["height"]-ring["height"]
            out={"browser":browser.version,"engine":engine,"mobileWidth":320,"touch":True,"images":images,"arms":data,"errors":errors}
            fixture=dist/"v11/owl-request.json"
            saved=json.loads(fixture.read_bytes())
            for arm in data.values():
                by_key={k:(x,y) for k,x,y in arm["origin"]["feet"]}
                assert max(math.dist(by_key[k],(x,y)) for k,x,y,w,h in saved["before"]["cast"])<.001
            if screenshot:
                page.locator("main").screenshot(path=str(screenshot))
            out["witnessSHA256"]=hashlib.sha256(fixture.read_bytes()).hexdigest()
            output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
            print(engine,browser.version,page.locator("#status").text_content(),"28 matching feet")
            browser.close()
    finally:server.shutdown()

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("dist",type=Path);parser.add_argument("output",type=Path)
    parser.add_argument("--engine",default="chromium",choices=["chromium","webkit"]);parser.add_argument("--executable");parser.add_argument("--screenshot",type=Path)
    args=parser.parse_args();run(args.dist,args.output,args.engine,args.executable or ("/usr/bin/chromium" if args.engine=="chromium" else None),args.screenshot)
