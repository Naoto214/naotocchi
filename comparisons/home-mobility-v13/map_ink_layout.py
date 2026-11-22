"""Check object-fit and the pre-transform image box before projecting original PNG alpha."""

import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

READ = """() => [...document.querySelectorAll('[data-diorama-actor] img.character-asset')].map(el=>{
 const style=getComputedStyle(el),rect=el.getBoundingClientRect();
 return {key:el.closest('[data-diorama-actor]').dataset.dioramaActor,layout:[parseFloat(style.width),parseFloat(style.height)],
 projected:[rect.width,rect.height],fit:style.objectFit,position:style.objectPosition,original:[el.naturalWidth,el.naturalHeight]};})"""


def collect(base, output):
    cases = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
        page = browser.new_page(
            viewport={"width": 320, "height": 792},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        for w, h, count in (
            (320, 792, 28),
            (320, 516, 28),
            (375, 760, 4),
            (390, 792, 28),
            (430, 880, 28),
        ):
            page.set_viewport_size({"width": w, "height": h})
            page.goto(
                f"{base}/game/mobility-v13-a.html?region=forest&time=day&count={count}&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny",
                wait_until="domcontentloaded",
            )
            page.wait_for_function(
                'window.HomeCastTrial?.ready && HomeDragTrial.opening() && [...document.querySelectorAll("[data-diorama-actor] img.character-asset")].every(el=>el.naturalWidth>0)',
                timeout=100000,
            )
            actors = page.evaluate(READ)
            assert len(actors) == count
            for a in actors:
                assert (
                    a["layout"][0] == a["layout"][1] > 0
                    and a["original"][0] == a["original"][1] > 0
                )
                assert a["fit"] == "contain" and a["position"] == "50% 50%"
            cases.append(dict(width=w, height=h, count=count, actors=actors))
        version = browser.version
        browser.close()
    output.write_text(
        json.dumps(dict(engine=version, cases=cases), ensure_ascii=False, indent=2)
        + "\n"
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    collect(a.base, a.out)
