"""Operate the owner atlas on both browser engines and check published scenario coverage."""

import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main(a):
    logs = []
    with sync_playwright() as p:
        for engine in a.engines:
            browser = getattr(p, engine).launch(
                **(
                    {"executable_path": "/usr/bin/chromium"}
                    if engine == "chromium"
                    else ({"executable_path": a.webkit} if a.webkit else {})
                )
            )
            page = browser.new_page(
                viewport={"width": 390, "height": 792},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
            )
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(a.base + "/v13/map.html")
            page.wait_for_function(
                "document.querySelector('#house dd') && document.querySelector('#status').textContent === ''",
                timeout=90000,
            )

            def stable():
                page.wait_for_function(
                    "document.querySelector('#status').textContent === '' && !!document.querySelector('#house dd')",
                    timeout=30000,
                )

            tests = []

            def report(label):
                stable()
                info = page.evaluate(
                    """() => ({scene:document.getElementById('scene-note').textContent,person:document.getElementById('person-note').textContent,body:document.getElementById('body').textContent,canvas:[chart.width,chart.height],width:document.documentElement.scrollWidth,viewport:innerWidth})"""
                )
                assert info["canvas"][0] > 100 and info["width"] <= info["viewport"] + 1
                tests.append(dict(label=label, **info))

            report("default")
            for painting in ("morning", "evening", "night", "day"):
                page.select_option("#painting", painting)
                stable()
                report("painting-" + painting)
            page.select_option("#person", "companion:box")
            page.select_option("#view", "local")
            page.select_option("#distance", "16")
            page.check('[value="topo"]')
            page.check('[value="free"]')
            report("box-16")
            page.click("#original")
            assert page.locator("#original").get_attribute("aria-pressed") == "true"
            page.click("#original")
            page.select_option("#phase", "600")
            report("aged")
            page.click("#pair-probe summary")
            page.select_option("#peer", "companion:panda")
            page.select_option("#axis", "depth")
            page.wait_for_function(
                "document.getElementById('pair-note').textContent.includes('パンダ')",
                timeout=20000,
            )
            assert page.locator("#pair").evaluate(
                "node=>node.width>50 && node.height>40"
            )
            page.click("#pair-probe summary")
            if a.out_screen:
                page.select_option("#phase", "opening")
                page.uncheck('[value="free"]')
                page.screenshot(
                    path=str(a.out_screen / f"forest-box-{engine}.jpg"), quality=82
                )
            if a.all:
                for region in [
                    "home",
                    "forest",
                    "river_lake",
                    "city",
                    "countryside",
                    "mountain",
                    "snow",
                    "sea",
                    "jungle",
                    "desert",
                    "deepsea",
                    "star_stop",
                    "memory_lake",
                ]:
                    page.select_option("#region", region)
                    stable()
                    page.select_option("#study", "record")
                    stable()
                    report("record-" + region)
                page.select_option("#region", "forest")
                stable()
                page.select_option("#study", "fixed")
                stable()
                page.select_option("#width", "375")
                stable()
                for arm in "abcd":
                    page.select_option("#arm", arm)
                    stable()
                    report("forest-375-" + arm)
                page.select_option("#width", "320")
                stable()
                page.select_option("#count", "4")
                stable()
                report("small-household")
                page.select_option("#count", "28")
                stable()
                page.select_option("#study", "living-reference")
                stable()
                page.select_option("#arm", "d-curve")
                stable()
                page.select_option("#phase", "600")
                report("observed-d-curves-600")
            assert not errors, errors
            logs.append(
                dict(engine=engine, version=browser.version, tests=tests, errors=errors)
            )
            browser.close()
    a.out.write_text(json.dumps(logs, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--engines", nargs="+", default=["chromium", "webkit"])
    p.add_argument("--webkit")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--out-screen", type=Path)
    p.add_argument("--all", action="store_true")
    main(p.parse_args())
