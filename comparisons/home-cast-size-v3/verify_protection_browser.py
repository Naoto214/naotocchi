"""Compare the real frozen V2 and V3 frames, including a parent-origin save sentry."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("guard_v2", HERE.parent / "home-cast-size-v2/verify_protection_browser.py")
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)

GEOMETRY = """() => {
  const stage=document.getElementById('castStage'), r=stage.getBoundingClientRect();
  const p=NaotocchiHomeViewport.residentPresentation();
  return {actors: HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth]),
    stage:[r.left,r.top,r.width,r.height],camera:[p.scaleX,p.scaleY,p.bodyScale],viewport:[innerWidth,innerHeight],
    visualViewportScale:visualViewport.scale};
}"""


def checksum(data):
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def run(browser, origin, limits):
    page = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=2,
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    errors = []
    page.on("pageerror",lambda e:errors.append(str(e)))
    try:
        page.route("**/test-owner-origin",lambda r:r.fulfill(content_type="text/html",body="<title>Owner</title>"))
        page.goto(origin+"/test-owner-origin")
        page.evaluate("""keys=>{for(const k of keys)localStorage.setItem(k,'owner:'+k);
          sessionStorage.setItem('origin','owner')}""", v2.SAVES)
        path = "/v3/" + v2.HOLD + "&layout=fixed&extra=0" if limits else "/" + v2.HOLD + "&mode=final"
        page.goto(origin+path,wait_until="domcontentloaded")
        frame = page.locator("#home").element_handle().content_frame()
        frame.wait_for_function("window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===28",
                                polling=150,timeout=135000)
        assert frame.url.split("?")[0].endswith("/game/limit.html" if limits else "/game/final.html")
        assert frame.locator(".diorama-view").count()==0
        fixed = frame.evaluate(GEOMETRY)
        art = frame.evaluate(v2.CANVAS)
        assert frame.evaluate("keys=>keys.every(k=>localStorage.getItem(k)!=='owner:'+k)",v2.SAVES)
        samples = []
        for gain in ([0,5,10,15,20,0] if limits else [0]):
            if limits:
                # The frame owns its role ratios. A stale parent cannot overwrite
                # either one by posting an old manual role value alongside a gain.
                page.evaluate("""extra=>document.querySelector('#home').contentWindow.postMessage(
                  {type:'home-cast-settings',settings:{extra,hero:150,partner:80,companions:100}},
                  location.origin)""",gain)
                frame.wait_for_function("e=>HomeCastTrial.settings.extra===e",arg=gain)
            assert frame.evaluate(GEOMETRY) == fixed, "The frozen scene geometry moved on a size change"
            expected={"pet":1.2*(1+gain/100),"partner":1.2*(1+gain/100),"companion":1.05*(1+gain/100)}
            pose=frame.evaluate(v2.POSE)
            error=max(abs(row[axis]-expected[row["role"]]) for row in pose for axis in ("multiplierX","multiplierY"))
            assert error < .0001,(gain,error)
            samples.append({"extra":gain, "expected":{k:round(v,5) for k,v in expected.items()},
                            "maximumAbsoluteScaleError":round(error,7)})
        frame.evaluate("""keys=>{for(const k of keys)localStorage.setItem(k,'trial:'+k);
          sessionStorage.setItem('origin','trial')}""",v2.SAVES)
        assert page.evaluate("keys=>keys.every(k=>localStorage.getItem(k)==='owner:'+k)",v2.SAVES)
        assert page.evaluate("sessionStorage.getItem('origin')==='owner'") and not errors
        actors=fixed.pop("actors")
        return {"scales":samples,"sizesAndFeet":checksum(actors),"scene":fixed,"canvas":art,
                "overviewNodes":0,"isolatedSaveNamespaces":len(v2.SAVES),"isolatedSession":True,"errors":errors}
    finally:
        page.close()


if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"))
        previous=run(b,args.url.rstrip("/"),False)
        limit=run(b,args.url.rstrip("/"),True)
        for key in ["sizesAndFeet","scene","canvas"]:
            assert previous[key]==limit[key],(key, previous[key], limit[key])
        result={"browser":b.version,"region":"forest","time":"day","count":28,"viewport":[390,844],"dpr":2,
                "reducedMotion":True,"fixed":True,"V2":previous,"V3":limit}
        args.out.write_text(json.dumps(result,indent=2)+"\n")
        print(result)
        b.close()
