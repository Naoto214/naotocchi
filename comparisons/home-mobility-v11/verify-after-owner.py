"""Switch real local owner-page controls and verify three independently loaded native policies."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run(dist, engine, width, executable):
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=dist)
    )
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = getattr(pw, engine).launch(
                executable_path=executable
                or ("/usr/bin/chromium" if engine == "chromium" else None)
            )
            pg = browser.new_page(
                viewport={"width": width, "height": 792},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
                locale="ja-JP",
            )
            pg.set_default_timeout(150000)
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(
                "http://127.0.0.1:"
                + str(srv.server_port)
                + "/v11/?arm=v11&paused=1&diagnostics=1",
                wait_until="domcontentloaded",
            )
            modes = ["full", "foot", "after"]

            def room(arm):
                pg.wait_for_function(
                    """arm=>document.body.dataset.ready === 'true' && document.querySelector('#home').contentWindow.location.pathname.endsWith('-compare-'+arm+'.html')""",
                    arg=arm,
                )
                return pg.locator("#home").element_handle().content_frame()

            def snapshot(arm):
                frame = room(arm)
                row = frame.evaluate("""()=>({model:HomeMobilityDiagnostics.read()?.arm,
                    painting:document.querySelector('.home-art-canvas').dataset.mobilityPainting.split('/').pop(),
                    opening:HomeDragTrial.opening().actors,size:HomeCastTrial.settings.policy,
                    refusalObserver:!!globalThis.HomeRefusalDiagnostics,
                    scripts:[...document.scripts].map(s=>s.src).filter(s=>s.includes('home-production-model-mobility-v11-owner-')).map(s=>new URL(s).pathname.split('/').pop())})""")
                assert row["model"] == arm and row["scripts"] == [
                    "home-production-model-mobility-v11-owner-" + arm + ".js"
                ], row
                assert (
                    row["size"] == "B"
                    and row["painting"] == "forest-day.webp"
                    and len(row["opening"]) == 28
                )
                assert row["refusalObserver"] == arm.startswith("v11-after")
                row["openingSHA256"] = hashlib.sha256(
                    json.dumps(row.pop("opening"), separators=(",", ":")).encode()
                ).hexdigest()
                return row

            current = snapshot("v11")
            receipts = []
            pg.locator("#settings-toggle").tap()
            assert (
                pg.locator("#variant option").evaluate_all("l=>l.map(x=>x.value)")
                == modes
            )
            for seats in ["original", "reference"]:
                pg.locator("#seats").select_option(seats)
                opened = None
                for variant in modes:
                    pg.locator("#variant").select_option(variant)
                    arm = (
                        "v11"
                        + ("" if variant == "full" else "-" + variant)
                        + ("" if seats == "original" else "-reference")
                    )
                    row = snapshot(arm)
                    assert opened is None or opened == row["openingSHA256"]
                    opened = row["openingSHA256"]
                    receipts.append(dict(variant=variant, seats=seats, **row))
                    print(engine, width, arm, opened[:10], flush=True)
            assert current["openingSHA256"] == receipts[0]["openingSHA256"]
            pg.locator("#diagnostics summary").tap()
            # The page URL enables native diagnostics at load. Its first refresh hides the start button.
            pg.wait_for_function(
                "document.querySelector('#resident').options.length===28"
            )
            assert "経路不成立後の探索 0回" in pg.locator("#wander-goal").inner_text()
            pg.locator("#settings-close").tap()
            pg.locator("#freeze").tap()
            frame = room("v11-after-reference")
            frame.wait_for_function(
                "HomeCastTrial.inspect().some(a=>HomeRefusalDiagnostics.read(a.key).checks>0)",
                polling=300,
                timeout=180000,
            )
            actor = frame.evaluate(
                "HomeCastTrial.inspect().filter(a=>HomeRefusalDiagnostics.read(a.key).checks).map(a=>a.key)[0]"
            )
            pg.locator("#settings-toggle").tap()
            pg.locator("#resident").select_option(actor)
            readout = pg.locator("#wander-goal").inner_text()
            receipt = frame.evaluate("k=>HomeRefusalDiagnostics.read(k)", actor)
            assert receipt["checks"] > 0 and "経路不成立後の探索" in readout
            assert not errors, errors
            result = dict(
                engine=engine,
                browser=browser.version,
                width=width,
                arms=receipts,
                realRefusal=dict(key=actor, receipt=receipt, readout=readout),
                pageErrors=errors,
            )
            browser.close()
            return result
    finally:
        srv.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dist", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--engine", choices=["chromium", "webkit"], default="chromium")
    parser.add_argument("--width", type=int, default=390)
    parser.add_argument("--executable")
    args = parser.parse_args()
    args.out.write_text(
        json.dumps(
            run(args.dist, args.engine, args.width, args.executable),
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
