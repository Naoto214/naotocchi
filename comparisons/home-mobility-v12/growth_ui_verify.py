"""Operate the real comparison controls with trusted phone touches, then read the rendered result."""

import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("out", type=Path)
    a = p.parse_args()
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/chromium")
        pg = b.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        pg.set_default_timeout(120000)
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(a.url + "/v12/growth.html", wait_until="domcontentloaded")
        rows = []
        for mode, width in [("auto", 390), ("helpers", 320), ("live", 390)]:
            pg.locator("#width").select_option(str(width))
            pg.locator('[data-guard="' + mode + '"]').tap()
            pg.wait_for_function('!document.querySelector("#grow").disabled')
            frame = pg.locator("iframe").element_handle().content_frame()
            assert ("life.html" in frame.url) == (mode == "live")
            before = frame.evaluate(
                "HomeCastTrial.inspect().map(a=>[a.key,a.foot.x,a.foot.y])"
            )
            pg.locator("#grow").tap()
            pg.wait_for_function(
                'document.querySelector("#status").textContent.includes("測定結果")'
            )
            after = frame.evaluate("HomeCareGrowthTrial.read()")
            if mode == "live":
                extra = frame.evaluate("HomeV12LifeGrowth.read()")
            else:
                extra = frame.evaluate("HomeV12Growth.read()")
                assert pg.locator("#result li").count() == 28
                pg.locator("#result summary").tap()
            assert (
                after["ageAfter"] > after["ageBefore"]
                and len(before) == 28
                and not errors
            )
            if mode == "auto":
                assert after["maxScreenCss"] < 1
            if mode == "helpers":
                assert extra["travel"]["arrived"] and extra["travel"]["frames"] >= 2
            print(mode, width, after["maxScreenCss"], flush=True)
            rows.append(
                {
                    "mode": mode,
                    "width": width,
                    "screen": pg.locator("#result").inner_text(),
                    "ageAfter": after["ageAfter"],
                    "shift": after["maxScreenCss"],
                    "travel": extra.get("travel"),
                    "errors": errors[:],
                }
            )
            a.out.write_text(
                json.dumps(
                    {"browser": b.version, "cases": rows}, ensure_ascii=False, indent=2
                )
                + "\n"
            )
        b.close()


if __name__ == "__main__":
    main()
