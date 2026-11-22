"""Exercise the exact opt-in growth-page exports and compare native screen feet in Chromium."""

import argparse, functools, http.server, json, subprocess, threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from foot_replacement import HERE, MODEL, RENDER, PARAMETERS, Local, patched
from foot_transitions import GAME


def care_source(source, method, file="foot-care.cjs"):
    code = "const fs=require('node:fs');process.stdout.write(require(process.argv[1])[process.argv[2]](fs.readFileSync(0,'utf8')))"
    return subprocess.check_output(
        ["node", "-e", code, str(HERE / file), method],
        input=source,
        text=True,
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--widths", nargs="+", type=int, default=[390, 320, 375, 430])
    p.add_argument("--optimized", action="store_true")
    a = p.parse_args()
    js = {
        RENDER: patched((a.dist / "game" / RENDER).read_text(), "patchFoot"),
        MODEL: care_source(
            patched((a.dist / "game" / MODEL).read_text(), "patchFootDiagnostics"),
            "patchFastCareModel" if a.optimized else "patchCareModel",
            "foot-care-fast.cjs" if a.optimized else "foot-care.cjs",
        ),
        GAME: care_source((a.dist / "game" / GAME).read_text(), "patchCareGame"),
    }
    origin = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=a.dist)
    )
    threading.Thread(target=origin.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            rows = json.loads(a.out.read_text())["cases"] if a.out.exists() else []
            for width in a.widths:
                for guard in (0, 1):
                    if any(c["width"] == width and c["guard"] == guard for c in rows):
                        continue
                    page = browser.new_page(
                        viewport={"width": width, "height": 792},
                        device_scale_factor=2,
                        is_mobile=True,
                        has_touch=True,
                    )
                    page.set_default_timeout(120000)
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))

                    def make_handler(source):
                        return lambda route: route.fulfill(
                            content_type="text/javascript", body=source
                        )

                    for name, source in js.items():
                        page.route("**/" + name + "*", make_handler(source))
                    page.goto(
                        "http://127.0.0.1:"
                        + str(origin.server_port)
                        + "/game/mobility-v10.html?"
                        + urlencode({**PARAMETERS, "careGuard": guard}),
                        wait_until="domcontentloaded",
                    )
                    page.wait_for_function(
                        "window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && !!window.HomeCareGrowthTrial"
                    )
                    opening = page.evaluate("HomeDragTrial.opening().actors")
                    before = page.evaluate("HomeCareGrowthTrial.read()")
                    assert before["started"] is False and len(opening) == 28
                    ok = page.evaluate("HomeCareGrowthTrial.grow()")
                    assert ok
                    page.wait_for_function(
                        "HomeCareGrowthTrial.read().steps.length===2"
                    )
                    page.wait_for_timeout(600)
                    result = page.evaluate("HomeCareGrowthTrial.read()")
                    # Replay must recreate the entire original fixture, including age.
                    assert page.evaluate("HomeCareGrowthTrial.grow()") is False
                    assert (
                        result["stageAfter"] > result["stageBefore"]
                        and result["ageAfter"] > result["ageBefore"]
                    )
                    assert result["freshReloadRequired"] and not errors
                    print(
                        width,
                        guard,
                        result["maxScreenCss"],
                        [s["accepted"] for s in result["steps"]],
                        flush=True,
                    )
                    rows.append(
                        dict(
                            width=width,
                            guard=guard,
                            opening=opening,
                            result=result,
                            errors=errors,
                        )
                    )
                    a.out.write_text(
                        json.dumps(
                            dict(browser=browser.version, cases=rows),
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                    page.close()
            for width in a.widths:
                pair = [c for c in rows if c["width"] == width]
                assert pair[0]["opening"] == pair[1]["opening"]
                if width == 390:
                    assert (
                        pair[0]["result"]["maxScreenCss"] > 100
                        and pair[1]["result"]["maxScreenCss"] < 2
                    )
                    assert all(
                        s["accepted"] and not s["lost"]
                        for s in pair[1]["result"]["steps"]
                    )
            browser.close()
    finally:
        origin.shutdown()


if __name__ == "__main__":
    main()
