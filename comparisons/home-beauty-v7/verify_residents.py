"""Check the real disposable game iframe against #568 at the same frozen clock."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


ACTORS = "#castStage [data-diorama-actor]"
POSE = """nodes => nodes.map(n => {
  const r=n.getBoundingClientRect();
  return {id:n.dataset.dioramaActor, box:[r.x,r.y,r.width,r.height], z:getComputedStyle(n).zIndex,
    images:[...n.querySelectorAll('img')].map(im=>[im.getAttribute('src'),getComputedStyle(im).maskImage]),
    foregroundMask:getComputedStyle(n).maskImage, lighting:getComputedStyle(n).filter};
})"""
CANVAS = """async canvas=>{
  const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
}"""
DEFAULTS = dict(count=1, size=1, speed=1, wind=1)
EXTREME = dict(count=1.5, size=2, speed=.25, wind=2)
SAVES = ["naotocchi-save-v1", "naotocchi-beauty-v6-fixture", "naotocchi-beauty-v7-fixture"]


def open_home(page, url):
    page.clock.install(time="2026-11-01T12:00:00Z")
    page.clock.pause_at("2026-11-01T12:00:05Z")
    page.route("**/resident-proof", lambda r: r.fulfill(content_type="text/html", body=
        '<meta name="viewport" content="width=device-width"><style>*{margin:0}iframe{display:block;border:0;width:390px;height:844px}</style><iframe></iframe>'))
    page.goto(url.rstrip("/") + "/resident-proof")
    page.evaluate("keys=>keys.forEach(k=>localStorage.setItem(k,'owner sentinel '+k))", SAVES)
    params = dict(region="forest", time="day", season="autumn", weather="sunny",
                  variant="E3plus", count=28, clock=39, compareSplit=0)
    page.eval_on_selector("iframe", "(f,q)=>f.src='./game/index.html?'+q", urlencode(params))
    frame = page.locator("iframe").element_handle().content_frame()
    frame.wait_for_url("**/game/index.html?**", wait_until="networkidle")
    # Resolve the async world import and sprite decode before advancing game ticks.
    # Otherwise a slow network can initialize the navigable stage a different frame.
    for _ in range(3):
        page.clock.run_for(16)
        frame.wait_for_load_state("networkidle")
    assert frame.locator(".home-art-canvas").count() == 1
    frame.evaluate("async()=>{await document.fonts.ready; await Promise.all([...document.querySelectorAll('#castStage img')].map(im=>im.decode().catch(()=>{})))}")
    # Step at a fixed pace so autonomous status displays and CSS start from the
    # same game time on both builds, irrespective of network or host CPU speed.
    for _ in range(24):
        page.clock.run_for(100)
    assert frame.evaluate("""sel=>window.HomeBeauty?.paintRect &&
      document.querySelector('#castStage')?.dataset.dioramaReduced==='true' &&
      Number(JSON.parse(document.querySelector('#castStage').dataset.livingMetrics || '{}').frames)>=15 &&
      document.querySelectorAll(sel).length===28""", ACTORS)
    frame.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
    return frame


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("v6")
    parser.add_argument("v7")
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH", "/usr/bin/chromium"))
        def new_page():
            return browser.new_page(viewport=dict(width=390, height=844), reduced_motion="reduce")
        prior = new_page()
        old = open_home(prior, args.v6)
        poses = old.locator(ACTORS).evaluate_all(POSE)
        raw = old.locator(".home-art-canvas").evaluate(CANVAS)
        ref_screen = prior.screenshot()
        prior.close()
        page = new_page()
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        frame = open_home(page, args.v7)
        frame.locator(ACTORS).evaluate_all("nodes=>window.firstActors=nodes")
        actual=frame.locator(ACTORS).evaluate_all(POSE)
        assert actual == poses, [(p['id'],[k for k in p if p[k]!=q[k]]) for p,q in zip(poses,actual) if p!=q]
        assert page.screenshot() == ref_screen, 'frozen screen differs from #568'
        assert frame.locator(".home-art-canvas").evaluate(CANVAS) == raw
        trials = [("A", True, 1, "red", EXTREME), ("B", True, .49, "orange", EXTREME),
                  ("C", True, 0, "gold", EXTREME), ("E3plus", False, .5, "mixed", DEFAULTS)]
        for variant, split, boundary, color, fall in trials:
            requested = dict(variant=variant, compareSplit=split, split=boundary, leafColor=color, fall=fall)
            page.evaluate("""s=>document.querySelector('iframe').contentWindow.postMessage(
                {type:'home-beauty-settings', settings:s},location.origin)""", requested)
            page.clock.run_for(150)
            assert frame.evaluate("""s=>Object.entries(s).every(([key,v])=>
                JSON.stringify(HomeBeauty.settings[key])===JSON.stringify(v))""", requested)
            assert frame.locator(ACTORS).evaluate_all("ns=>ns.length===28 && ns.every((n,i)=>n===firstActors[i])")
            assert frame.locator(ACTORS).evaluate_all(POSE) == poses, variant
            assert frame.locator(".home-art-canvas").count() == 1
            assert frame.locator(".home-art-canvas").evaluate(CANVAS) == raw, variant
            assert frame.evaluate("HomeBeauty.clockSeconds") == 39
        assert frame.evaluate("ks=>ks.map(k=>localStorage.getItem(k)!==null)", SAVES) == [False, False, True]
        frame.evaluate("keys=>keys.forEach(k=>localStorage.setItem(k,'disposable'))", SAVES)
        assert page.evaluate("ks=>ks.every(k=>localStorage.getItem(k)==='owner sentinel '+k)", SAVES)
        assert not errors, errors
        result = dict(referencePR=568, chromium=browser.version, iframeCSSPixels=[390, 844],
                      residents=len(poses), sameNodesAndOrderAcross=[r[0] for r in trials],
                      exactResidentBoxesLayersImagesOcclusionAndLighting=True, reducedMotion=True, clockSeconds=39,
                      sceneCanvasSHA256=raw, frozenScreenPNGSHA256=hashlib.sha256(ref_screen).hexdigest(),
                      poseSHA256=hashlib.sha256(json.dumps(poses, sort_keys=True).encode()).hexdigest(),
                      sceneCanvasUnchangedAcrossSwitches=True, ownerAndTrialSavesIsolated=True, errors=errors)
        args.out.write_text(json.dumps(result, indent=2) + "\n")
        print("28 nodes, boxes, layers, images, frozen Canvas and three save namespaces passed.")
        browser.close()


if __name__ == "__main__":
    main()
