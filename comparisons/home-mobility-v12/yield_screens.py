"""Save the unmodified owner view and real painted cast before and after the nearby statue request."""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

from yield_verify import Quiet


def run(args):
    Quiet.fallback = args.fallback
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    args.out.mkdir(exist_ok=True, parents=True)
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for arm in args.arms:
                p = browser.new_page(
                    viewport={"width": 390, "height": 844},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                )
                p.goto(
                    f"http://127.0.0.1:{server.server_port}/v12/yield.html?scene={args.scene}&arm={arm}",
                    wait_until="domcontentloaded",
                    timeout=120000,
                )
                p.wait_for_function(
                    "!document.getElementById('live').disabled && !document.getElementById('scene').disabled",
                    timeout=150000,
                )
                cast = p.locator(".view")
                cast.screenshot(
                    path=args.out / f"{arm}-start.jpg", type="jpeg", quality=92
                )
                p.locator("#live").tap()
                p.wait_for_function(
                    "document.getElementById('outcome-exits').textContent.includes('ほかの27体')",
                    timeout=95000,
                )
                cast.screenshot(
                    path=args.out / f"{arm}-end.jpg", type="jpeg", quality=92
                )
                p.screenshot(
                    path=args.out / f"{arm}-owner.jpg",
                    type="jpeg",
                    quality=88,
                    full_page=True,
                )
                receipt = p.evaluate(
                    """()=>({result:document.querySelector('iframe').contentWindow.HomeYieldReplay.status(),exits:document.getElementById('outcome-exits').textContent,cssWidth:innerWidth,screenDPR:devicePixelRatio})"""
                )
                results.append(dict(arm=arm, chromium=browser.version, **receipt))
                print(arm, receipt["result"]["message"], flush=True)
                p.close()
            browser.close()
    finally:
        server.shutdown()
    (args.out / "results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--arms",
        choices=("v11", "v12", "short"),
        nargs="+",
        default=["v11", "v12", "short"],
    )
    p.add_argument("--scene", choices=("stone-near", "watcher"), default="stone-near")
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--fallback", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    run(p.parse_args())
