"""Observe the first genuine presentation and verify a held cast after native camera fit."""
import argparse
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


def run(browser, origin, reduced, initially_paused=True):
    page = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, reduced_motion="reduce" if reduced else "no-preference")
    try:
        start = time.monotonic()
        page.goto(origin.rstrip("/") + "/?region=forest&time=day&count=28&paused=" + str(int(initially_paused)),
                  wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function("document.body.dataset.ready==='true'", polling=200, timeout=120000)
        frame = page.locator("#home").element_handle().content_frame()
        assert frame.evaluate("HomeCastTrial.ready")
        assert frame.evaluate("HomeCastTrial.settings.paused") is initially_paused
        if not initially_paused:
            frame.wait_for_function("HomeBeauty.clockSeconds > .05", polling=200)
            frame.evaluate("HomeCastTrial.apply({paused:true})")
        projection = frame.evaluate("""() => {
          const stage = document.querySelector('#castStage'), p = NaotocchiHomeViewport.residentPresentation();
          const m=JSON.parse(stage.dataset.livingMetrics || '{}');
          return {mode:stage.dataset.worldRenderer, canvasWidth:HomeBeauty.paintRect.width,
            cast:HomeCastTrial.inspect().length, nativeWorld:m.world?.loaded ?? null,
            revision:m.world?.projectionRevision ?? null, scaleX:p.scaleX, scaleY:p.scaleY,
            reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
        }""")
        assert projection["mode"]=="art-25d" and projection["cast"]==28 and projection["canvasWidth"]>0
        capture = """() => HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h])"""
        pose = frame.evaluate(capture)
        checked = []
        for preset in ["current","A","B"]:
            frame.evaluate("preset=>HomeCastTrial.apply({preset})", preset)
            page.wait_for_timeout(750)
            latest = frame.evaluate(capture)
            assert len(latest)==len(pose)
            for row, ref in zip(latest,pose):
                assert row[0] == ref[0] and max(abs(a-b) for a,b in zip(row[1:],ref[1:])) < .01, (row,ref)
            checked.append(preset)
        frame.evaluate("HomeCastTrial.apply({paused:false})")
        frame.wait_for_function("!HomeCastTrial.settings.paused && !HomeBeauty.frozen", polling=200)
        # Reduced motion intentionally holds the environment's time and autonomous activity.
        if not reduced:
            frame.wait_for_function("HomeBeauty.clockSeconds > .05", polling=200, timeout=30000)
            frame.evaluate("HomeCastTrial.apply({paused:true})")
            held = frame.evaluate(capture)
            page.wait_for_timeout(1500)
            actual = frame.evaluate(capture)
            assert all(a[0]==b[0] and max(abs(x-y) for x,y in zip(a[1:],b[1:]))<.01
                       for a,b in zip(held,actual))
        return {"ready":True,"initiallyPaused":initially_paused,"projection":projection,"checkedPresets":checked,
                "resumeAndRetain":not reduced,"totalSeconds":round(time.monotonic()-start,1)}
    finally:
        page.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url"); p.add_argument("out",type=Path); p.add_argument("--engine",choices=["webkit","chromium"],default="chromium")
    p.add_argument("--live-only", action="store_true", help="append default running startup to existing report")
    args=p.parse_args()
    launch = {"executable_path":os.getenv("CHROMIUM_PATH","/usr/bin/chromium"),"args":["--no-sandbox"]} if args.engine=="chromium" else {}
    with sync_playwright() as pw:
        browser=getattr(pw,args.engine).launch(**launch)
        data=json.loads(args.out.read_text()) if args.live_only and args.out.exists() else {"engine":args.engine,"version":browser.version}
        data["conditions"]={"region":"forest","width":390,"height":844,"deviceScaleFactor":2,"count":28,
            "notes":"nativeWorld/revision are values from the official once-per-15-frames metrics. null means the first metrics window was not yet published. The ready signal itself checks current world.stats().loaded, region, paint, navigation and viewport fit."}
        cases=[("live",False,False)] if args.live_only else [("standard",False,True),("reduced",True,True),("live",False,False)]
        for name,reduced,paused in cases:
            data[name]=run(browser,args.url,reduced,paused)
            args.out.write_text(json.dumps(data,indent=2)+"\n")
            print(args.engine,name,data[name],flush=True)
        browser.close()


if __name__ == "__main__":
    main()
