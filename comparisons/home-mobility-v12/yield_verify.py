"""Check all recorded headings in the native game plus real playback, pausing and mobile frame containment."""

import argparse
import functools
import http.server
import json
import os
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def translate_path(self, path):
        name = super().translate_path(path)
        root = Path(self.directory)
        rel = Path(name).relative_to(root)
        if self.fallback and not os.path.isfile(name) and not os.path.isdir(name):
            return str(self.fallback / rel)
        return name


def check(args):
    Quiet.fallback = args.fallback
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    rows = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for w in args.widths:
                page = browser.new_page(
                    viewport={"width": w, "height": 850},
                    is_mobile=True,
                    has_touch=True,
                    device_scale_factor=2,
                )
                errors = []
                page.on("pageerror", lambda e, issues=errors: issues.append(str(e)))
                page.goto(
                    f"http://127.0.0.1:{server.server_port}/v12/yield.html?scene=opening",
                    wait_until="domcontentloaded",
                    timeout=120000,
                )
                page.wait_for_function(
                    "!document.getElementById('play').disabled || document.getElementById('status').textContent.includes('ません')",
                    timeout=110000,
                )
                assert page.locator("#play").is_enabled(), page.locator(
                    "#status"
                ).inner_text()
                page.locator("#rate").select_option(".25")
                page.locator("#play").tap()
                page.wait_for_function(
                    "document.getElementById('status').textContent.includes('歩いて')",
                    timeout=10000,
                )
                page.locator("#pause").tap()
                page.wait_for_function(
                    "document.getElementById('pause').textContent==='再開'"
                )
                page.locator("#rate").select_option("1")
                page.locator("#pause").tap()
                page.wait_for_function(
                    "document.getElementById('status').textContent.includes('到着') || document.getElementById('status').textContent.includes('ません')",
                    timeout=90000,
                )
                text = page.locator("#status").inner_text()
                assert "8.00 CSS px" in text
                assert page.evaluate(
                    "document.documentElement.scrollWidth === innerWidth"
                )
                info = page.evaluate("""async()=>{const d=await(await fetch('yield-recording.json')).json(),win=document.querySelector('iframe').contentWindow,api=win.HomeYieldReplay;
                  return d.routes.map(r=>{api.reset(d);api.start(r.steps);let result;for(let i=0;i<1000;i++){result=api.advance();if(result.state==='arrived')break;}
                    if(result.state!=='arrived'||Math.abs(result.distanceCSS-8)>1e-4)throw Error('Incomplete '+r.degrees);return {bearing:r.degrees,steps:result.advanced,checks:result.checked,css:result.distanceCSS};});}""")
                liveRow = []
                if page.locator("#live").is_enabled():
                    if w == 375:
                        liveRow = page.evaluate("""async()=>{const data=await(await fetch('yield-recording.json')).json();
                          const api=document.querySelector('iframe').contentWindow.HomeYieldReplay;
                          return data.routes.map(r=>{api.reset(data);api.startNative(r.degrees);let report;
                            for(let tick=0;tick<1600;tick++){report=api.advance();if(report.state!=='playing')break;}
                            if(report.state==='playing')throw Error('Unfinished V12 comparison');
                            return {degrees:r.degrees,...report};});
                        }""")
                    page.locator("#rate").select_option("1")
                    page.locator("#live").tap()
                    page.wait_for_function(
                        "!document.getElementById('live').disabled", timeout=30000
                    )
                    assert "助け手" in page.locator("#status").inner_text()
                page.locator("#bearing").select_option(label="288.75°")
                assert page.locator("#status").inner_text().startswith("開始位置")
                assert not errors, errors
                rows.append(
                    {
                        "viewport": w,
                        "browser": browser.version,
                        "initialVisibleHeading": 101.25,
                        "actualResume": text,
                        "horizontalOverflow": False,
                        "individualReplays": info,
                        "newNativePlanner": liveRow,
                    }
                )
                args.out.write_text(
                    json.dumps(rows, separators=(",", ":"), ensure_ascii=False) + "\n"
                )
                print(w, len(info), text, flush=True)
                page.close()
            browser.close()
    finally:
        server.shutdown()
    args.out.write_text(
        json.dumps(rows, separators=(",", ":"), ensure_ascii=False) + "\n"
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--fallback", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--widths", type=int, nargs="+", default=[320, 375, 390, 430])
    p.add_argument("--chromium", default="/usr/bin/chromium")
    check(p.parse_args())
