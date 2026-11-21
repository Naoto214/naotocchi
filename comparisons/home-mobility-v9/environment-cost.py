"""Measure native forest Canvas/E3 and its alternate E3+ leaf treatment independently."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import PARAMS,WPE,clock,native_page,save


def instrument(name,src):
    return clock.native(name,src,True) if "production-world" in name else src


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    with sync_playwright() as pw:
        browser=pw.webkit.launch(executable_path=WPE)
        result=dict(browser=browser.version,rows=[])
        for variant in ["B","E3plus"]:
            PARAMS["variant"]=variant
            page,errors,src=native_page(browser,a.base,"v9",transform=instrument)
            # The shipped comparison always boots with approved leaf B. Use the
            # existing origin-checked settings bridge for the E3+ control only.
            page.evaluate("variant=>window.postMessage({type:'home-beauty-settings',settings:{variant}},location.origin)",variant)
            page.wait_for_function("v=>HomeBeauty.settings.variant===v",arg=variant)
            page.evaluate("HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);0")
            page.wait_for_timeout(2000)
            page.evaluate("mobilityPerf.parts={};mobilityPerf.active=true;window.envStart=performance.now()")
            page.wait_for_timeout(15000)
            r=page.evaluate("""()=>{mobilityPerf.active=false;return {elapsedMs:performance.now()-envStart,
              parts:mobilityPerf.parts,settings:HomeBeauty.settings,actorCount:mobilityPerf.live.snapshot().length,
              environmentClock:HomeBeauty.clockSeconds,ground:document.body.dataset.finishGround}}""")
            assert not errors and r["environmentClock"]>0 and r["parts"]["nature"]["calls"]>0
            assert r["settings"]["variant"]==variant and r["actorCount"]==28
            result["rows"].append(dict(assets=src,variant=variant,**r))
            save(a.out,result)
            print(variant,r["parts"],flush=True)
            page.close()
        browser.close()
