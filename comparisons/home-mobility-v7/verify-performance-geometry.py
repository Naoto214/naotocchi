"""Read V5/V6 and optimized V7 viewport geometry at the same instant on live WebKit DOM."""

import argparse
import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent


def run(browser, url, viewport):
    page = browser.new_page(
        viewport={"width": viewport[0], "height": viewport[1]},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    fingerprints = {}
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    def instrument(route):
        res = route.fetch()
        src = res.text()
        name = route.request.url.split("/")[-1].split("?")[0]
        fingerprints[name] = hashlib.sha256(src.encode()).hexdigest()
        begin = src.index(" function presentationRect(e){")
        end = src.index("\n root.NaotocchiHomeViewport=", begin)
        actual = src[begin:end]
        early = "  if(presentation?.world&&e.matches?.('.home-living-world'))return presentation.world;"
        read = "  const r=e.getBoundingClientRect();"
        assert early + "\n" + read in actual
        reference = actual.replace(
            "function presentationRect(e){", "function originalPresentationRect(e){"
        ).replace(early + "\n" + read, read + "\n" + early)
        candidate = actual.replace(
            "function presentationRect(e){", "function candidatePresentationRect(e){"
        )
        audit = """function presentationRect(e){const old=originalPresentationRect(e),next=candidatePresentationRect(e);const isWorld=!!(presentation?.world&&e.matches?.('.home-living-world'));
        const k=[isWorld?'cached-world':e.id||e.tagName,presentation?.landscape?'landscape':'portrait'].join(':');const check=window.geometryAudit??={counts:{},mismatches:[]};check.counts[k]=(check.counts[k]||0)+1;
        if((isWorld&&old!==next)||!['x','y','left','right','top','bottom','width','height'].every(k=>Object.is(old[k],next[k])))check.mismatches.push(k);return next;}"""
        route.fulfill(
            response=res,
            body=src[:begin] + reference + "\n" + candidate + "\n" + audit + src[end:],
        )

    page.route("**/home-production-touch-mobility-v7.js*", instrument)
    try:

        def enter(region):
            page.goto(
                url
                + f"?region={region}&count=28&paused=1&clock=0&variant=B&policy=B&curve=linear&compareSplit=0&time=day&season=autumn&weather=sunny&layout=optimized&ground=on",
                wait_until="domcontentloaded",
                timeout=100000,
            )
            print("entered", region, page.url, flush=True)
            try:
                page.wait_for_function(
                    "window.NaotocchiHomeViewport?.residentPresentation()?.world?.width>0&&window.HomeBeauty?.paintRect?.width&&window.HomeCastTrial?.inspect().length===28",
                    polling=200,
                    timeout=120000,
                )
                page.evaluate("NaotocchiHomeViewport.presentationRect(document.body)")
                assert page.evaluate("!!window.geometryAudit"), (
                    region,
                    fingerprints,
                    errors,
                )
            except Exception:
                print(
                    "state",
                    region,
                    page.evaluate(
                        "()=>[!!window.HomeCastTrial?.ready,window.HomeCastTrial?.inspect?.().length,!!window.NaotocchiHomeViewport,!!window.geometryAudit]"
                    ),
                    fingerprints,
                    errors,
                    flush=True,
                )
                raise

        last_region = None
        last_landscape = False
        audits = []
        actions = []
        for w, h, region in [
            (390, 792, "forest"),
            (792, 390, "forest"),
            (375, 760, "river_lake"),
            (430, 880, "desert"),
            (390, 792, "forest"),
        ]:
            page.set_viewport_size({"width": w, "height": h})
            if last_region != region or last_landscape != (w > h):
                if last_region:
                    audits.append(page.evaluate("window.geometryAudit"))
                enter(region)
                last_region = region
                last_landscape = w > h
            page.evaluate("HomeCastTrial.apply({paused:false})")
            page.wait_for_timeout(400)
            actions.append(
                page.evaluate(
                    """()=>{const nodes=[...document.querySelectorAll('#castStage [data-diorama-actor]')],a=nodes[0],r=a.getBoundingClientRect(),api=window.NaotocchiHomeViewport;for(const e of [document.body,document.querySelector('.home-living-world'),document.querySelector('#castStage'),...nodes].filter(Boolean))api.presentationRect(e);return {size:[innerWidth,innerHeight],actors:nodes.length,region:HomeBeauty.settings.region||null,marked:nodes.filter(n=>n.querySelector('.character-asset')?.style.maskImage).length,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-diorama-actor]')?.dataset.dioramaActor??null};}"""
                )
            )
        audits.append(page.evaluate("window.geometryAudit"))
        audit = {"counts": {}, "mismatches": []}
        for chunk in audits:
            audit["mismatches"].extend(chunk["mismatches"])
            for k, v in chunk["counts"].items():
                audit["counts"][k] = audit["counts"].get(k, 0) + v
        print("geometry", actions, audit, flush=True)
        assert fingerprints and not audit["mismatches"]
        assert all(x["actors"] == 28 for x in actions)
        assert all(
            any(
                k.startswith("cached-world:") and k.endswith(t) and n > 0
                for k, n in audit["counts"].items()
            )
            for t in ("portrait", "landscape")
        )
        return {
            "version": browser.version,
            "fingerprints": fingerprints,
            "actions": actions,
            "audit": audit,
        }
    finally:
        page.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:8377/game/mobility-v7.html")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    with sync_playwright() as pw:
        b = pw.webkit.launch(executable_path=os.getenv("WEBKIT_PATH"))
        r = run(b, args.base, [390, 792])
        b.close()
        args.out.write_text(
            json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n"
        )
        print(r["audit"])
