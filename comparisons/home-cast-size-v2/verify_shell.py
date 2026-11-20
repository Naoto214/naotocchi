"""Exercise the final settings, actual size readout and preserved #570 page."""
import argparse
import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


def active(page):
    page.wait_for_function("document.body.dataset.ready==='true'", timeout=120000)
    return page.locator('#home').element_handle().content_frame()


def modal(page):
    page.locator('#settings-toggle').click()


def capture(page):
    return page.locator('#measurements tr').evaluate_all(
        "rows=>rows.map(r=>[...r.cells].map(c=>c.textContent))")


def run(args):
    result = {
        "scene": "forest / day / 28, paused at 320×568, then resized in place",
        "unit": "CSS px, projected body alpha bounds, width × height; companion medians by dimension",
        "widths": {},
        "pageErrors": [],
    }
    with sync_playwright() as pw:
        launch = {"executable_path": os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
                  "args": ["--no-sandbox"]} if args.engine == "chromium" else {}
        browser = getattr(pw,args.engine).launch(**launch)
        result["version"] = browser.version
        page = browser.new_page(viewport={"width":320,"height":568}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        page.on("pageerror", lambda err: result["pageErrors"].append(str(err)))
        page.goto(args.url.rstrip('/')+'/?region=forest&count=28&paused=1&mode=final',wait_until='domcontentloaded')
        actor = active(page)
        seating_source = actor.page.request.get(args.url.rstrip('/') + '/game/seating.js')
        assert seating_source.ok
        result["openingSeatsSha256"] = hashlib.sha256(seating_source.body()).hexdigest()
        assert actor.evaluate("[HomeCastTrial.settings.hero, HomeCastTrial.settings.partner, HomeCastTrial.settings.companions]") == [120,120,105]
        for width, height in [(320,568),(375,812),(390,844),(430,932)]:
            page.set_viewport_size({"width":width,"height":height})
            buttons = page.locator(".tools button").evaluate_all(
                "ns=>ns.map(n=>{const r=n.getBoundingClientRect();return [r.left,r.right,r.height]})")
            assert all(0 <= l < r <= width+.1 and h >= 44 for l,r,h in buttons), buttons
            assert all(a[1] <= b[0]+.1 for a,b in zip(buttons,buttons[1:])), buttons
            assert page.locator(".bar").bounding_box()["height"]==52
            modal(page)
            assert page.locator("#region option").count()==13 and page.locator("#time option").count()==4
            assert page.locator("#counts input").count()==5
            assert page.locator("#panel").evaluate("p=>p.clientWidth===p.scrollWidth")
            page.locator("#measure").click()
            companions = page.locator('#individual-sizes tr').evaluate_all(
                "rows=>rows.map(r=>[...r.cells].map(c=>c.textContent))")
            assert len(companions) == len({r[0] for r in companions}) == 26
            assert all('×' in row[1] for row in companions)
            sizes = capture(page)
            assert all('×' in r[2] and 'NaN' not in r[2] for r in sizes), sizes
            result["widths"][str(width)] = {"bodyWidthByHeightCssPx": sizes, "companionsMeasured": len(companions), "toolbarHeight":52,
                                           "toolbarMinTarget": min(r[2] for r in buttons)}
            if width == 390:
                result["companionsAt390"] = companions
            print(args.engine,width, sizes, flush=True)
            page.locator("#settings-close").click()
        modal(page)
        page.locator("#time").select_option('night')
        actor.wait_for_function("HomeBeauty.settings.time==='night'")
        page.locator("#settings-close").click()
        page.locator("[data-mode=adopted]").click()
        actor = active(page)
        assert actor.url.split('?')[0].endswith('/game/index.html')
        assert actor.evaluate("[HomeCastTrial.settings.hero,HomeCastTrial.settings.partner,HomeCastTrial.settings.companions]")==[120,120,105]
        actor.evaluate("window.previousFirst=HomeCastTrial.inspect()[0].key")
        page.locator("[data-mode=current]").click()
        actor.wait_for_function("HomeCastTrial.settings.hero===100")
        assert actor.evaluate("previousFirst===HomeCastTrial.inspect()[0].key")
        page.locator("[data-mode=final]").click()
        actor=active(page)
        assert actor.url.split('?')[0].endswith('/game/final.html')
        assert not actor.locator(".diorama-view").count()
        modal(page)
        page.locator("input[name=count][value='1'] + span").click()
        actor=active(page)
        assert actor.evaluate("HomeCastTrial.inspect().length")==1
        page.locator("#measure").click()
        assert page.locator('#companion-detail').is_hidden()
        one=capture(page)
        assert '×' in one[0][2] and one[1][2]=='—' and one[2][2]=='—'
        page.locator("#settings-close").click()
        page.goto(args.url.rstrip('/')+'/?castPreset=B&region=city&count=4&paused=1',wait_until='domcontentloaded')
        page.wait_for_url('**/v1/?**')
        actor=active(page)
        assert actor.evaluate("HomeCastTrial.settings.hero===125 && HomeBeauty.settings.region==='city'")
        result["modes"]=["final","adopted","current","final"]
        result["archive"]="legacy B / city / 4"
        result["absentRoles"]=one
        assert not result["pageErrors"],result["pageErrors"]
        browser.close()
    args.out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--engine',choices=['chromium','webkit'],required=True)
    parser.add_argument('--out',type=Path,required=True)
    run(parser.parse_args())
