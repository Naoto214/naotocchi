"""On a disposable native growth, verify every retained old ray even when the dependency cache could skip it."""

import argparse, json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    a = p.parse_args()
    name = "home-production-model-v12-life.js"
    src = (a.dist / "game" / name).read_text()
    mark = "const currentMask=reuse?previousMask:legalDirections(a,previousMask);"
    assert src.count(mark) == 1 and src.count("budget=performance.now()+48;") == 1
    src = src.replace(
        "deadline=performance.now()+4000;",
        "deadline=Infinity; /* offline oracle only */",
    )
    src = src.replace(
        "budget=performance.now()+48;", "budget=Infinity; /* offline oracle only */"
    )
    src = src.replace(
        mark,
        mark
        + """
      if(reuse){
        const checked=legalDirections(a,previousMask);
        (globalThis.careCacheOracle??=[]).push({key:a.key,stage:steps.length,old:previousMask.filter(Boolean).length,
          mismatch:previousMask.flatMap((item,i)=>item&&!checked[i]?[i]:[])});
      }""",
    )
    rows = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/chromium")
        for w in [390, 320, 375, 430]:
            pg = b.new_page(
                viewport=dict(width=w, height=792),
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )
            pg.set_default_timeout(120000)
            pg.route(
                "**/" + name + "*",
                lambda r: r.fulfill(content_type="text/javascript", body=src),
            )
            q = urlencode(
                dict(
                    count=28,
                    region="forest",
                    time="day",
                    paused=1,
                    paired=1,
                    ground="on",
                    variant="B",
                    clock=0,
                    growthLive=1,
                    waitForPainting=1,
                )
            )
            pg.goto(
                a.url + "/game/mobility-v12-life.html?" + q,
                wait_until="domcontentloaded",
            )
            pg.wait_for_function(
                "window.HomeCareGrowthTrial && window.HomeV12LifeGrowth && window.HomeCastTrial?.ready && HomeDragTrial.opening()"
            )
            assert pg.evaluate("HomeV12LifeGrowth.preflight()") and pg.evaluate(
                "HomeCareGrowthTrial.grow()"
            )
            pg.wait_for_function("HomeV12LifeGrowth.read().steps.length>=2")
            pg.wait_for_timeout(500)
            hits = pg.evaluate("globalThis.careCacheOracle||[]")
            info = pg.evaluate("HomeCareGrowthTrial.read()")
            assert all(not hit["mismatch"] for hit in hits)
            rows.append(
                dict(
                    width=w,
                    cache=hits,
                    phases=[
                        {
                            "reason": s["reason"],
                            "lost": s["lost"],
                            "reused": s.get("reused", 0),
                        }
                        for s in info["steps"]
                    ],
                    maxCSS=info["maxScreenCss"],
                )
            )
            a.out.write_text(
                json.dumps(dict(engine=b.version, rows=rows), separators=(",", ":"))
                + "\n"
            )
            print(
                w,
                len(hits),
                sum(x["old"] for x in hits),
                info["maxScreenCss"],
                flush=True,
            )
            pg.close()
        b.close()


if __name__ == "__main__":
    main()
