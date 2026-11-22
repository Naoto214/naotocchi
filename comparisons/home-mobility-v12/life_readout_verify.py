"""Force only the observation deadline in a disposable trial to verify honest visible outcomes."""

import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    a = p.parse_args()
    rows = []
    f = "home-production-model-v12-life.js"
    source = (a.dist / "game" / f).read_text()
    assert (
        source.count("budget=performance.now()+48;") == 1
        and source.count("  function finish(record) {") == 1
    )
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/chromium")
        for case, label in [
            ("success", "2回の照合を完了"),
            ("expired", "4秒の事前測定の有効期間"),
            ("budget", "照合の時間枠を超え"),
        ]:
            pg = b.new_page(
                viewport=dict(width=390, height=844),
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
            )
            pg.set_default_timeout(160000)
            model = source.replace(
                "budget=performance.now()+48;",
                "budget=Infinity;"
                if case != "budget"
                else "budget=performance.now()-1;",
            )
            model = model.replace(
                "deadline=performance.now()+4000;", "deadline=Infinity;"
            )
            if case == "expired":
                model = model.replace(
                    "  function finish(record) {",
                    "  function finish(record) {\n    if(record?.sequence===1&&record.accepted) deadline=performance.now()-1;",
                )
            pg.route(
                "**/" + f + "*",
                lambda route: route.fulfill(content_type="text/javascript", body=model),
            )
            pg.goto(a.url + "/v12/growth.html", wait_until="domcontentloaded")
            pg.locator('[data-guard="live"]').tap()
            pg.wait_for_function('!document.querySelector("#grow").disabled')
            pg.locator("#grow").tap()
            pg.wait_for_function(
                'document.querySelector("#status").textContent.includes("測定結果")'
            )
            text = pg.locator("#result").inner_text()
            assert label in text, text
            frame = pg.locator("iframe").element_handle().content_frame()
            r = frame.evaluate("HomeCareGrowthTrial.read()")
            assert (
                r["applied"] == (case == "success")
                and r["expired"] == (case == "expired")
                and (r["maxScreenCss"] < 1) == (case == "success")
            ), r
            rows.append(
                dict(
                    case=case,
                    applied=r["applied"],
                    partial=r["partial"],
                    expired=r["expired"],
                    reason=r["lastReason"],
                    maxCSS=r["maxScreenCss"],
                    ui=text,
                )
            )
            a.out.write_text(
                json.dumps(
                    dict(
                        browser=b.version,
                        controls="Deadlines deliberately induced; game age, render, geometry, fallback are real.",
                        cases=rows,
                    ),
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            )
            print(case, r["lastReason"], r["maxScreenCss"], flush=True)
            if case == "success":
                repeat = frame.evaluate("""()=>{const before=HomeV12LifeGrowth.read();
                  const accepted=HomeV12LifeGrowth.prepare();
                  return {before:before.applied,accepted,after:HomeV12LifeGrowth.read()};}""")
                assert (
                    repeat["before"]
                    and not repeat["accepted"]
                    and not repeat["after"]["applied"]
                    and repeat["after"]["steps"] == []
                )
            pg.close()
        b.close()


if __name__ == "__main__":
    main()
