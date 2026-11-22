"""Compare both exact growth guard kernels at the same openings, including every final native foot."""

import argparse, functools, http.server, json, threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from foot_replacement import Local, MODEL, RENDER, PARAMETERS, patched
from foot_transitions import GAME
from foot_care_trial import care_source


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    game = args.dist / "game"
    model = patched((game / MODEL).read_text(), "patchFootDiagnostics")
    models = {
        name: care_source(model, method, file)
        for name, method, file in [
            ("full", "patchCareModel", "foot-care.cjs"),
            ("bounded", "patchFastCareModel", "foot-care-fast.cjs"),
        ]
    }
    common = {
        GAME: care_source((game / GAME).read_text(), "patchCareGame"),
        RENDER: patched((game / RENDER).read_text(), "patchFoot"),
    }
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=args.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            rows = []
            if args.out.exists():
                rows = json.loads(args.out.read_bytes())["cases"]
            for index, width in enumerate([390, 320, 375, 430, 390]):
                order = (
                    ["full", "bounded"]
                    if index % 2 == 0 and index != 4
                    else ["bounded", "full"]
                )
                for arm in order:
                    if any(r["index"] == index and r["arm"] == arm for r in rows):
                        continue
                    page = browser.new_page(
                        viewport={"width": width, "height": 792},
                        device_scale_factor=2,
                        is_mobile=True,
                        has_touch=True,
                    )
                    page.set_default_timeout(120000)

                    def handler(s):
                        return lambda route: route.fulfill(
                            content_type="text/javascript", body=s
                        )

                    for name, source in {**common, MODEL: models[arm]}.items():
                        page.route("**/" + name + "*", handler(source))
                    page.goto(
                        "http://127.0.0.1:"
                        + str(server.server_port)
                        + "/game/mobility-v10.html?"
                        + urlencode({**PARAMETERS, "careGuard": 1}),
                        wait_until="domcontentloaded",
                    )
                    page.wait_for_function(
                        "window.HomeCastTrial?.ready && !!window.HomeCareGrowthTrial && !!HomeDragTrial.opening()"
                    )
                    opening = page.evaluate("HomeDragTrial.opening().actors")
                    action = page.evaluate(
                        """()=>{const t=performance.now(),ok=HomeCareGrowthTrial.grow();return {ok,elapsed:performance.now()-t}}"""
                    )
                    assert action["ok"]
                    page.wait_for_function(
                        "HomeCareGrowthTrial.read().steps.length===2"
                    )
                    page.wait_for_timeout(500)
                    data = page.evaluate(
                        """()=>({result:HomeCareGrowthTrial.read(),final:HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.foot.x,a.foot.y])})"""
                    )
                    assert len(data["final"]) == 28
                    page.close()
                    rows.append(
                        dict(
                            index=index,
                            width=width,
                            arm=arm,
                            opening=opening,
                            action=action,
                            **data,
                        )
                    )
                    print(
                        index,
                        width,
                        arm,
                        [
                            round(s.get("validateMs", 0))
                            for s in data["result"]["steps"]
                        ],
                        round(data["result"]["maxScreenCss"], 2),
                        flush=True,
                    )
                    args.out.write_text(
                        json.dumps(
                            dict(browser=browser.version, cases=rows),
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                pair = [r for r in rows if r["index"] == index]
                assert len(pair) == 2
                assert (
                    pair[0]["opening"] == pair[1]["opening"]
                    and pair[0]["final"] == pair[1]["final"]
                ), width
                compare = lambda r: [
                    [
                        s.get(k)
                        for k in (
                            "eligible",
                            "accepted",
                            "previousExits",
                            "lost",
                            "reason",
                        )
                    ]
                    for s in r["result"]["steps"]
                ]
                assert compare(pair[0]) == compare(pair[1]), (
                    width,
                    compare(pair[0]),
                    compare(pair[1]),
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
