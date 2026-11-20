"""Exercise the real owner-comparison UI on a locally served trial build."""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


def active_frame(page):
    page.wait_for_function("document.body.dataset.ready === 'true'")
    return page.locator("#home").element_handle().content_frame()


def compare_at_width(page, width):
    page.set_viewport_size({"width": width, "height": 720})
    frame = active_frame(page)
    frame.wait_for_function("HomeCastTrial.inspect().length === 28")
    frame.evaluate("window.__qaFrame = document.querySelector('[data-diorama-actor]')")
    bounds = page.locator(".tools button").evaluate_all("""buttons => buttons
      .filter(button => button.offsetHeight)
      .map(button => {
        const {left, right, height} = button.getBoundingClientRect();
        return [left, right, height];
      })""")
    assert all(0 <= left < right <= width and height >= 44 for left, right, height in bounds)
    assert all(a[1] <= b[0] + .1 for a, b in zip(bounds, bounds[1:]))
    page.locator("#freeze").click()
    for preset in ["A", "B", "current"]:
        page.locator(f'button[data-preset="{preset}"]').click()
        frame.wait_for_function("p => HomeCastTrial.settings.preset === p && HomeCastTrial.settings.paused", arg=preset)
    if width < 740:
        page.locator("#settings-toggle").click()
    assert page.locator("#panel").evaluate("p => p.scrollWidth === p.clientWidth")
    assert page.locator("#region option").count() == 13
    assert page.locator("#time option").count() == 4
    page.locator("#time").select_option("evening")
    page.locator("#hero").fill("133")
    page.locator("#partner").fill("124")
    page.locator("#companions").fill("107")
    frame.wait_for_function("""() => {const s = HomeCastTrial.settings;
      return s.time === 'evening' && s.preset === 'custom' && s.paused &&
        s.hero === 133 && s.partner === 124 && s.companions === 107;}""")
    assert frame.evaluate("window.__qaFrame && window.__qaFrame.isConnected")
    if width < 740:
        page.keyboard.press("Escape")
        assert page.locator("#settings-toggle").evaluate("e => document.activeElement === e")
        assert page.locator("#panel").is_hidden()
    page.locator("#freeze").click()
    frame.wait_for_function("!HomeCastTrial.settings.paused")
    page.locator('button[data-preset="current"]').click()
    return {"width": width, "minToolbarHeight": min(row[2] for row in bounds), "fit": True, "sameActorNode": True}


def run(args):
    with sync_playwright() as engines:
        launch = {"executable_path": os.getenv("WEBKIT_PATH")} if args.engine == "webkit" else {
            "executable_path": os.getenv("CHROMIUM_PATH", "/usr/bin/chromium"), "args": ["--no-sandbox"]}
        browser = getattr(engines, args.engine).launch(**launch)
        page = browser.new_page(viewport={"width": 320, "height": 720}, has_touch=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_default_timeout(90000)
        page.goto(args.url, wait_until="domcontentloaded")
        widths = [compare_at_width(page, width) for width in [320, 375, 390, 430, 900]]
        counts = [1, 4, 10, 20, 28]
        for count in counts:
            page.locator(f'#counts input[value="{count}"]').locator("..").click()
            active_frame(page).wait_for_function("n => HomeCastTrial.inspect().length === n", arg=count)
        regions = ["forest", "city", "home", "river_lake"]
        for region in regions:
            page.locator("#region").select_option(region)
            frame = active_frame(page)
            frame.wait_for_function("r => HomeBeauty.settings.region === r && HomeCastTrial.inspect().length === 28", arg=region)
        assert not errors, errors
        return {"engine": args.engine, "version": browser.version, "widths": widths, "counts": counts,
                "regions": regions, "verifiedManualPercent": [133, 124, 107], "pageErrors": errors}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8201/")
    parser.add_argument("--engine", choices=["chromium", "webkit"], default="chromium")
    parser.add_argument("--out", type=Path, required=True)
    options = parser.parse_args()
    options.out.write_text(json.dumps(run(options), ensure_ascii=False, indent=2) + "\n")
