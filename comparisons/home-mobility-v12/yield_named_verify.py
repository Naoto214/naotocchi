"""Exercise real touch controls for native V11/V12 paths from the same recorded forest feet."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

from yield_verify import Quiet

CASES = [
    ("watcher", "ordinary", "companion:watcher"),
    ("stone", "ordinary", "companion:sekizou"),
    ("stone-near", "ordinary", "companion:sekizou"),
    ("stone375", "ordinary", "companion:sekizou"),
    ("cat", "waiting", "companion:cat_friend"),
    ("dog", "waiting", "pet:dog"),
    ("cat", "ordinary", "companion:cat_friend"),
    ("dog", "ordinary", "pet:dog"),
]


def run(args):
    Quiet.fallback = args.fallback
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    rows = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for variant in args.arms:
                for scene, entry, key in CASES:
                    if args.scenes and scene not in args.scenes:
                        continue
                    errors = []
                    width = 390 if scene in ("watcher", "stone", "stone-near") else 375
                    p = browser.new_page(
                        viewport={"width": width, "height": 850},
                        is_mobile=True,
                        has_touch=True,
                        device_scale_factor=2,
                    )
                    p.on("pageerror", lambda e, issues=errors: issues.append(str(e)))
                    url = f"http://127.0.0.1:{server.server_port}/v12/yield.html?scene={scene}&arm={variant}&entry={entry}"
                    p.goto(url, wait_until="domcontentloaded", timeout=120000)
                    try:
                        p.wait_for_function(
                            "!document.getElementById('live').disabled && !document.getElementById('scene').disabled",
                            timeout=150000,
                        )
                        assert p.locator("#entry").input_value() == entry
                        assert p.locator("#version").input_value() == variant
                        assert p.locator("#scene").input_value() == scene
                        initial = p.evaluate(
                            """async(scene)=>{
                          const d=await(await fetch('yield-recording.json')).json(),win=document.querySelector('iframe').contentWindow,api=win.HomeYieldReplay;
                          const feet=scene==='watcher'?d.watcher.feet:scene==='stone375'?d.stone375.feet:scene.startsWith('stone')?d.stone.feet:d.minuteFeet;
                          const measured=win.HomeCastTrial.inspect(),byKey=new Map(feet.map(f=>[f[0],f]));
                          if(measured.length!==28||measured.some(({key,x,y})=>byKey.get(key)[1]!==x||byKey.get(key)[2]!==y))throw Error('Different starting feet');
                          return Object.fromEntries(feet.map(([id])=>[id,api.exitCount(id)]));
                        }""",
                            scene,
                        )
                        p.locator("#live").tap()
                        p.wait_for_function(
                            "document.getElementById('outcome-exits').textContent.includes('ほかの27体')",
                            timeout=95000,
                        )
                    except Exception as error:
                        details = p.evaluate(
                            """({text:document.getElementById('status').textContent,outcome:document.getElementById('outcome-exits').textContent,model:document.querySelector('iframe').contentWindow.HomeYieldReplay?.status()})"""
                        )
                        raise RuntimeError(
                            (variant, scene, entry, details, errors)
                        ) from error
                    evidence = p.evaluate("""()=>{
                      const win=document.querySelector('iframe').contentWindow,ctl=win.HomeYieldReplay;
                      const actual=ctl.status(),end=win.HomeCastTrial.inspect().map(p=>[p.key,p.x,p.y]),after=Object.fromEntries(end.map(([id])=>[id,ctl.exitCount(id)]));
                      const path=win.performance.getEntriesByType('resource').find(u=>u.name.includes('home-production-model-mobility-v12-yield')).name;
                      return {actual,hashName:new URL(path).pathname.split('/').pop(),after,end,
                        screenText:document.getElementById('status').textContent,exitsText:document.getElementById('outcome-exits').textContent};
                    }""")
                    if scene in ("stone", "stone-near"):
                        for key3, before in (
                            ("companion:hamster", 12),
                            ("companion:otter", 3),
                        ):
                            after3 = p.evaluate(
                                "(key)=>document.querySelector('iframe').contentWindow.HomeYieldReplay.exitCount(key,3)",
                                key3,
                            )
                            assert f"{before}→{after3}方向" in evidence["exitsText"]
                            evidence.setdefault("shortExits", {})[key3] = {
                                "from": before,
                                "to": after3,
                            }
                            if scene == "stone-near":
                                assert after3 == (0 if variant == "v12" else before)
                    native = args.dist / "game" / evidence.pop("hashName")
                    result = evidence["actual"]
                    assert len(initial) == 28 and len(evidence["after"]) == 28
                    assert not errors, errors
                    if scene == "watcher":
                        assert result["initialAcceptance"] is False
                        if variant == "short":
                            assert (
                                result["state"] == "arrived"
                                and result["errorCSS"] < 1e-8
                                and abs(result["distanceCSS"] - 8) < 1e-8
                            )
                            assert (
                                "3px 該当なし、8px 該当なし、16px 該当なし"
                                in evidence["exitsText"]
                            )
                        if variant == "v11":
                            assert result["state"] == "closed"
                    elif scene == "stone375":
                        assert result["initialAcceptance"] is False
                        assert result["state"] == (
                            "closed" if variant == "v11" else "arrived"
                        )
                        assert (
                            result["errorCSS"] == (8.01 if variant == "v11" else 0)
                            or abs(result["errorCSS"] - 8.01) < 1e-8
                        )
                        assert (
                            "1→1方向" if variant == "v11" else "1→0方向"
                        ) in evidence["exitsText"]
                    elif scene.startswith("stone"):
                        assert result["initialAcceptance"] is False
                        expected = (
                            ("arrived" if scene == "stone-near" else "partial")
                            if variant == "v12"
                            else "closed"
                        )
                        assert result["state"] == expected
                        if variant == "v12":
                            assert (
                                result["routeKind"] == "curved"
                                and len(result["movedHelpers"]) == 1
                            )
                            assert (
                                abs(
                                    result["errorCSS"]
                                    - (0 if scene == "stone-near" else 310.309)
                                )
                                < 0.01
                            )
                    elif entry == "waiting" and variant == "v12":
                        assert (
                            result["routeKind"] == "curved"
                            and result["adoptedErrorCSS"] < 0.01
                        )
                    elif entry == "ordinary":
                        assert result["routeKind"] != "curved"
                    after = evidence["after"]
                    lost = [
                        k
                        for k in initial
                        if k != key and initial[k] > 0 and after[k] == 0
                    ]
                    gained = [
                        k
                        for k in initial
                        if k != key and initial[k] == 0 and after[k] > 0
                    ]
                    rows.append(
                        dict(
                            variant=variant,
                            scene=scene,
                            entry=entry,
                            key=key,
                            width=width,
                            browser=browser.version,
                            nativeSHA256=hashlib.sha256(
                                native.read_bytes()
                            ).hexdigest(),
                            initial=initial,
                            lost=lost,
                            gained=gained,
                            **evidence,
                        )
                    )
                    args.out.write_text(
                        json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
                        + "\n"
                    )
                    print(variant, scene, entry, result["message"], lost, flush=True)
                    p.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--arms",
        choices=("v12", "v11", "short"),
        nargs="+",
        default=["short", "v12", "v11"],
    )
    p.add_argument(
        "--scenes", nargs="+", choices=sorted({scene for scene, _, _ in CASES})
    )
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--fallback", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    run(p.parse_args())
