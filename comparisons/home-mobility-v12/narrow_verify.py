"""Compare the native painted resident coordinates with each original frame in both recorded editions."""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

from yield_verify import Quiet


def run(args):
    orig = json.loads(args.raw.read_bytes())
    Quiet.fallback = args.fallback
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(args.dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            page = browser.new_page(
                viewport={"width": 375, "height": 812},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
                locale="ja-JP",
            )
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(
                f"http://127.0.0.1:{server.server_port}/v12/narrow.html",
                wait_until="domcontentloaded",
                timeout=150000,
            )
            page.wait_for_function(
                "!document.getElementById('play').disabled||/異な|一致しません|できません/.test(document.getElementById('stage-state').textContent)",
                timeout=170000,
            )
            assert page.locator("#play").is_enabled(), page.locator(
                "#stage-state"
            ).inner_text()
            print("Opened", flush=True)
            rows = []
            for name, exit_count in [("shipped", 1), ("margin", 4)]:
                page.locator(f"input[value={name}]").check()
                stream = orig["arms"][name]["frames"]
                poses = [
                    [frame["clock"], [r[:7] for r in frame["actors"]]]
                    for frame in stream
                ]
                receipt = page.evaluate(
                    """frames=>{
                  const win=document.querySelector('iframe').contentWindow,tick=document.getElementById('tick');
                  let checks=0,change=0;const first=frames[0][1];
                  for(const [i,[clock,actors]] of frames.entries()){
                    tick.value=i;tick.dispatchEvent(new Event('input',{bubbles:true}));
                    const actual=win.HomeCastTrial.inspect();
                    if(actual.length!==28)throw Error('Lost residents');
                    const byKey=new Map(actual.map(a=>[a.key,a]));
                    for(const [j,[key,x,y,direction,activity,source,moving]] of actors.entries()){
                      const a=byKey.get(key);
                      if(a.x!==x||a.y!==y||a.direction!==direction||a.activity!==activity||a.source!==source||!!a.target!==moving)throw Error('Wrong pose '+key+' at '+clock);
                      const node=win.document.querySelector('[data-diorama-actor="'+key+'"]');
                      if(!node||node.dataset.dioramaDirection!==String(direction)||node.dataset.dioramaActivity!==activity)throw Error('Wrong paint state '+key);
                      if(a.x!==first[j][1]||a.y!==first[j][2])change++;
                      checks++;
                    }
                  }
                  return {checks,frames:frames.length,differentFeetVersusOpening:change};
                }""",
                    poses,
                )
                page.locator("#after").tap()
                assert f"{exit_count} / 384" in page.locator("#exit").inner_text()
                assert "時計が8.00px" in page.locator("#stage-state").inner_text()
                counts = page.locator("#residents tr").all_inner_texts()
                assert counts == [
                    "時計\t2 → 2\t3 → 3",
                    "ハリネズミ\t1 → 1\t3 → 2",
                    "ハムスター\t2 → 2\t0 → 2",
                ]
                rows.append(
                    dict(
                        edition=name,
                        **receipt,
                        exits=page.locator("#exit").inner_text(),
                        halfCounts=counts,
                    )
                )
                print(name, receipt, rows[-1]["exits"], flush=True)
            # Touch pause/resume and swap at the same tick. The game itself is always passive.
            page.locator("#before").tap()
            page.locator("#play").tap()
            page.wait_for_function(
                "document.getElementById('play').textContent==='一時停止'"
            )
            page.locator("#play").tap()
            before = page.locator("#tick").input_value()
            page.locator("input[value=shipped]").check()
            assert page.locator("#tick").input_value() == before
            page.locator("#next").tap()
            assert int(page.locator("#tick").input_value()) == int(before) + 1
            page.locator("#previous").tap()
            assert page.locator("#tick").input_value() == before
            page.locator("#subject").select_option("companion:clock")
            assert page.locator("#mark").text_content() == "時計"
            widths = []
            for w in [320, 375, 390, 430]:
                page.set_viewport_size({"width": w, "height": 812})
                for crop in ["full", "near"]:
                    page.locator("#crop").select_option(crop)
                    assert page.evaluate(
                        "document.documentElement.scrollWidth===innerWidth"
                    )
                    assert page.locator("#mark").is_visible()
                    bounds = page.locator("#scene").bounding_box()
                    assert bounds["width"] > w * 0.82 and bounds["height"] > 155, bounds
                    mark = page.locator("#mark").bounding_box()
                    assert (
                        bounds["x"] <= mark["x"] < bounds["x"] + bounds["width"]
                        and bounds["y"] <= mark["y"] < bounds["y"] + bounds["height"]
                    ), (bounds, mark)

                widths.append(w)
            page.set_viewport_size({"width": 375, "height": 812})
            page.locator("#subject").select_option("companion:hamster")
            page.locator("input[value=margin]").check()
            page.locator("#after").tap()
            if args.image:
                page.screenshot(
                    path=args.image, type="jpeg", quality=85, full_page=True
                )
            assert not errors, errors
            report = {
                "browser": browser.version,
                "widths": widths,
                "DPR": 2,
                "exercised": "touch, pause and resume, switch at same time, both crops, previous/next single step",
                "arms": rows,
            }
            args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--fallback", type=Path)
    p.add_argument("--raw", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--image", type=Path)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    run(p.parse_args())
