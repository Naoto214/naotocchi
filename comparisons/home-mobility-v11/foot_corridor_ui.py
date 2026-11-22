"""Operate the independent replay with real mobile controls and check that feet are actually drawn moving."""

import argparse, functools, http.server, json, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from foot_replacement import Local


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--engine", default="chromium", choices=["chromium", "webkit"])
    p.add_argument("--executable", default="/usr/bin/chromium")
    args = p.parse_args()
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=args.dist)
    )
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = getattr(pw, args.engine).launch(executable_path=args.executable)
            page = browser.new_page(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
            )
            page.set_default_timeout(100000)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(
                "http://127.0.0.1:" + str(srv.server_port) + "/v11/corridor.html",
                wait_until="domcontentloaded",
            )
            rows = []
            for region in ("mountain", "forest"):
                for mode in ("guard", "native"):
                    page.locator("#region").select_option(region)
                    page.locator("[data-mode=" + mode + "]").tap()
                    page.wait_for_function(
                        """()=>document.body.dataset.ready==='true'||document.querySelector('#result').textContent.startsWith('この場面を')"""
                    )
                    assert page.locator("#apply").is_enabled(), page.locator(
                        "#result"
                    ).inner_text()
                    frame = page.locator("iframe").element_handle().content_frame()
                    record = page.evaluate(
                        "async()=>await (await fetch('./corridor-'+document.querySelector('#region').value+'.json')).json()"
                    )
                    actual = frame.evaluate("FootCorridorReplay.footprints()")
                    goal = {a["key"]: (a["x"], a["y"]) for a in record["actors"]}
                    assert all(
                        max(abs(x - e) for x, e in zip(row[1:], goal[row[0]])) < 1e-6
                        for row in actual
                    )
                    page.locator("#apply").tap()
                    page.wait_for_function(
                        "document.body.dataset.phase==='arranged'||document.querySelector('#result').textContent.startsWith('この場面を')"
                    )
                    assert page.locator("#walk").is_enabled(), page.locator(
                        "#result"
                    ).inner_text()
                    applied = page.evaluate("FootCorridorComparison.read()")
                    expectedHold = region == "mountain" and mode == "guard"
                    assert applied["held"] == expectedHold, (region, mode, applied)
                    watch = frame.evaluate("""()=>{
              const a=document.querySelector('#castStage .diorama-pet')||document.querySelector('#castStage .pet-slot')||document.querySelector('#castStage [data-diorama-key="pet:dog"]');
              const origin=FootCorridorReplay.footprints().find(a=>a[0]==='pet:dog');
              window.corridorPaintProof=[];
              function watch(){const now=FootCorridorReplay.footprints().find(a=>a[0]==='pet:dog');
                const shadows=[...document.querySelectorAll('.diorama-shadow')].map(s=>[s.style.left,s.style.top]);
                window.corridorPaintProof.push({x:now[1],y:now[2],shadows});
                if(window.corridorPaintProof.length<380)requestAnimationFrame(watch);}
              requestAnimationFrame(watch);return origin;
            }""")
                    page.locator("#walk").tap()
                    page.wait_for_function(
                        "document.body.dataset.phase==='finished'||document.querySelector('#result').textContent.startsWith('この場面を')"
                    )
                    outcome = page.evaluate("FootCorridorComparison.read()")
                    assert (
                        outcome["travel"]["arrived"] and outcome["travel"]["steps"] > 1
                    ), outcome
                    motion = frame.evaluate(
                        """()=>({modelPoses:new Set(corridorPaintProof.map(p=>JSON.stringify([p.x,p.y]))).size,shadowPoses:new Set(corridorPaintProof.map(p=>JSON.stringify(p.shadows))).size})"""
                    )
                    assert motion["modelPoses"] > 2 and motion["shadowPoses"] > 2, (
                        motion
                    )
                    rows.append(
                        dict(
                            region=region,
                            mode=mode,
                            openingCount=len(actual),
                            panda=next(
                                a["css"]
                                for a in outcome["change"]
                                if a["key"] == "companion:panda"
                            ),
                            oldRays=outcome["oldRays"],
                            newRays=outcome["rays"],
                            held=outcome["held"],
                            travel=outcome["travel"],
                            rendered=motion,
                            text=page.locator("#result").inner_text(),
                        )
                    )
                    args.out.write_text(
                        json.dumps(
                            dict(
                                engine=args.engine,
                                version=browser.version,
                                cases=rows,
                                errors=errors,
                            ),
                            ensure_ascii=False,
                            indent=2,
                        )
                        + "\n"
                    )
                    print(
                        region,
                        mode,
                        rows[-1]["panda"],
                        outcome["travel"]["walked"],
                        motion,
                        flush=True,
                    )
            assert not errors, errors
            browser.close()
    finally:
        srv.shutdown()


if __name__ == "__main__":
    main()
