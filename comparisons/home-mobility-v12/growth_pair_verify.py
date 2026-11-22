"""Test two sequential real-geometry corrections in an isolated copy of the actual post-care cast."""

import argparse, json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--widths", nargs="+", type=int, default=[430, 375])
    a = p.parse_args()
    f = "home-production-model-v12-growth.js"
    src = (a.dist / "game" / f).read_text()
    needle = "    if(record.lost)record.witness=growthWitness(record);"
    assert src.count(needle) == 1
    lab = (Path(__file__).parent / "growth-pair-lab.js").read_text()
    src = src.replace(
        needle,
        lab
        + "\n"
        + needle
        + "\n    if(record.lost&&steps.length===2)globalThis.studyGrowthHandoff=makePairStudy(actors,scene,before.people,record.directions,old);",
    )
    rows = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/chromium")
        for w in a.widths:
            pg = b.new_page(
                viewport={"width": w, "height": 792},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )
            pg.set_default_timeout(150000)
            pg.route(
                "**/" + f + "*",
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
                    growthPolicy="keep",
                    waitForPainting=1,
                )
            )
            pg.goto(
                a.url + "/game/mobility-v12-growth.html?" + q,
                wait_until="domcontentloaded",
            )
            pg.wait_for_function(
                "window.HomeCareGrowthTrial && window.HomeCastTrial?.ready && HomeDragTrial.opening()"
            )
            assert pg.evaluate("HomeCareGrowthTrial.grow()")
            pg.wait_for_function("typeof studyGrowthHandoff==='function'")
            final = pg.evaluate("studyGrowthHandoff()")
            rows.append(final)
            a.out.write_text(
                json.dumps(dict(browser=b.version, rows=rows), separators=(",", ":"))
                + "\n"
            )
            print(w, final, flush=True)
            pg.close()
        b.close()


if __name__ == "__main__":
    main()
