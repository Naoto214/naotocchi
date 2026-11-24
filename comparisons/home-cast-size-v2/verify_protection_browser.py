"""Check actual V1 archive, isolated saves, locked V2 role scales, and shared background pixels."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HOLD = "?region=forest&time=day&count=28&paused=1"
SAVES = ["naotocchi-save-v1", "naotocchi-save-v1-backup", "naotocchi-beauty-v7-fixture",
         "naotocchi-cast-size-v1-fixture"]
CANVAS = """async () => {
  const c=document.querySelector('.home-art-canvas');
  const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}"""
POSE = """() => {
  const rows=HomeCastTrial.inspect(), stage=document.getElementById('castStage');
  const viewport=NaotocchiHomeViewport.residentPresentation();
  return rows.map(a=>{
    const n=stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
    const scales=n.style.scale.split(' ').map(Number);
    const img=n.querySelector('.character-asset');
    return {id:a.key,role:a.kind,w:a.w,h:a.h,img:img.getAttribute('src'),
      multiplierX:scales[0]*viewport.scaleX/viewport.bodyScale/a.depth,
      multiplierY:(scales[1]||scales[0])*viewport.scaleY/viewport.bodyScale/a.depth};
  });
}"""


def exercise(browser, origin, archived=False):
    page = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=2,
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    errors = []
    page.on("pageerror",lambda error: errors.append(str(error)))
    try:
        page.route("**/guard-origin",lambda r:r.fulfill(content_type="text/html",body="<title>QA</title>"))
        page.goto(origin + "/guard-origin")
        page.evaluate("""keys=>{for(const k of keys)localStorage.setItem(k,'parent:'+k);
                     sessionStorage.setItem('proof','parent')}""", SAVES)
        suffix = "/v1/" + HOLD + "&castPreset=current" if archived else "/" + HOLD + "&mode=final"
        page.goto(origin + suffix,wait_until="domcontentloaded")
        frame = page.locator("#home").element_handle().content_frame()
        frame.wait_for_function("window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===28",
                                timeout=135000,polling=200)
        view = frame.locator(".diorama-view")
        if archived:
            assert frame.url.split("?")[0].endswith("/game/index.html")
            assert view.count() == 1 and view.evaluate("el=>!el.hidden")
            view.evaluate("el=>el.click()")
            assert view.text_content()=="いつもの表示"
            view.evaluate("el=>el.click()")
            assert view.text_content()=="みんなを見る"
        else:
            assert frame.url.split("?")[0].endswith("/game/final.html")
            assert view.count()==0
            # A stale V1-style message must never override the adopted multipliers.
            page.evaluate("""()=>document.querySelector('#home').contentWindow.postMessage(
                {type:'home-cast-settings',settings:{preset:'B',hero:135,partner:80,companions:150}},
                location.origin)""")
            page.wait_for_timeout(70)
        assert frame.evaluate("document.body.dataset.homeHeroPercent")=="110"
        assert frame.evaluate("HomeBeauty.settings.variant==='B'&&!HomeBeauty.settings.compareSplit")
        assert frame.evaluate("keys=>keys.map(k=>localStorage.getItem(k)!==null)",SAVES)==[False,False,False,True]
        assert frame.evaluate("sessionStorage.getItem('proof')===null")
        values = frame.evaluate(POSE)
        expected = {"pet":1, "partner":1, "companion":1} if archived else {"pet":1.2,"partner":1.2,"companion":1.05}
        biggest_error=max(abs(r[k]-expected[r["role"]]) for r in values for k in ("multiplierX","multiplierY"))
        assert biggest_error < .004, (biggest_error,values)
        frame.evaluate("""ks=>{for(const k of ks)localStorage.setItem(k,'disposable:'+k);
                               sessionStorage.setItem('proof','disposable')}""",SAVES)
        assert page.evaluate("keys=>keys.every(k=>localStorage.getItem(k)==='parent:'+k)",SAVES)
        assert page.evaluate("sessionStorage.getItem('proof')==='parent'")
        assert not errors, errors
        ids=[(r["id"],r["w"],r["h"],r["img"]) for r in values]
        return {"overviewNodes":view.count(),"status":"original two-way toggle" if archived else "absent",
                "heroPercentAttribute":110,"achievedRoleScales":expected,"measuredActors":len(values),
                "maxScaleDifference":round(biggest_error,6),
                "residentAssetAndModelDimensions":hashlib.sha256(json.dumps(ids).encode()).hexdigest(),
                "canvas":frame.evaluate(CANVAS),"isolatedSaveKeys":len(SAVES),"separateSession":True,"pageErrors":errors}
    finally:
        page.close()


if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"))
        archived=exercise(browser,args.url.rstrip("/"),archived=True)
        final=exercise(browser,args.url.rstrip("/"))
        assert archived["canvas"]==final["canvas"],"fixed environment changed"
        assert archived["residentAssetAndModelDimensions"]==final["residentAssetAndModelDimensions"]
        output={"chromium":browser.version,"viewport":[390,844],"dpr":2,"reducedMotion":True,
                "archive":archived,"final":final}
        args.out.write_text(json.dumps(output,indent=2)+"\n")
        print(output)
        browser.close()
