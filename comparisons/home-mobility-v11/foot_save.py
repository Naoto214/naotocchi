"""Save opening, active-walk and parked states with the native care serializer and replay the exact bytes."""

import argparse, functools, hashlib, http.server, json, threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from foot_replacement import RENDER, PARAMETERS, Local, replace_once, patched
from foot_transitions import GAME, ROOT_EVENT

BRIDGE = """
    globalThis.footSaveScene={
      read(){return {region:scene.region,scale:scene.navigation.intentScale,
        people:model.snapshot().map(a=>({key:a.key,x:a.x,y:a.y,target:a.target||null,route:a.route||[],activity:a.activity}))};},
      begin(){const residents=model.snapshot();
        for(const who of residents){
          for(const length of [32,16])for(let i=0;i<8;i++){
            const a=model.snapshot().find(r=>r.key===who.key),angle=i*Math.PI/4,s=scene.navigation.intentScale;
            const p={x:a.x+Math.cos(angle)*length/s.x,y:a.y+Math.sin(angle)*length/s.y};
            if(!scene.navigation.valid(p)||!visibleAt(p,a))continue;
            model.select(a.key);
            if(!model.move(a.key,p,'keyboard'))continue;
            model.step(.08,{blocked:false,reducedMotion:false,heldActor:null});
            const b=model.snapshot().find(r=>r.key===a.key);
            if(b.target&&Math.hypot(b.x-a.x,b.y-a.y)>.1)return a.key;
          }
        }
        throw Error('No active native walk found');
      },
      park(key){
        for(let i=0;i<100;i++){
          if(!model.snapshot().find(a=>a.key===key).target)return;
          model.step(.06,{blocked:false,reducedMotion:false,heldActor:null});
        }
        throw Error('Native walk had not finished');
      }
    };
    function sync(){"""
SAVE = (
    "globalThis.captureNativeFootSave=()=>{saveState();return localStorage.getItem(SAVE_KEY);};\n"
    + ROOT_EVENT
)


def open_room(browser, dist, origin, arm, raw=None, natural=False):
    pg = browser.new_page(
        viewport={"width": 390, "height": 792},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        timezone_id="Asia/Tokyo",
        locale="ja-JP",
    )
    pg.set_default_timeout(100000)
    pg.add_init_script("Date.now=()=>1780000000000;")
    renderer = (dist / "game" / RENDER).read_text()
    if arm == "v11-foot":
        renderer = patched(renderer, "patchFoot")
    files = {
        RENDER: replace_once(renderer, "    function sync(){", BRIDGE),
        GAME: replace_once((dist / "game" / GAME).read_text(), ROOT_EVENT, SAVE),
    }
    # Native care tick normally fires every three seconds. Hold just that
    # interval while comparing identical bytes, so local browser load cannot
    # decay one fixture's bonds by an extra tick. Model steps are explicit.
    files[GAME] = replace_once(
        files[GAME],
        "setInterval(loop, TICK_MS);",
        "globalThis.footSaveAdvanceCareTick = loop;",
    )
    if raw:
        fixture = (dist / "game/beauty/fixture.js").read_text()
        files["beauty/fixture.js"] = replace_once(
            fixture, "JSON.stringify(state));", json.dumps(raw) + ");"
        )

    def handle(s):
        return lambda r: r.fulfill(content_type="text/javascript", body=s)

    for f, s in files.items():
        pg.route("**/" + f + "*", handle(s))
    pg.goto(
        origin
        + "/game/mobility-v10.html?"
        + urlencode({**PARAMETERS, "paired": 0 if raw or natural else 1}),
        wait_until="domcontentloaded",
    )
    pg.wait_for_function(
        "window.HomeCastTrial?.ready && HomeDragTrial.opening() && !!window.footSaveScene"
    )
    return pg


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument(
        "--native-opening",
        action="store_true",
        help="Use the natural unpaired opening instead of the comparison reseat",
    )
    a = p.parse_args()
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=a.dist)
    )
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    origin = "http://127.0.0.1:" + str(srv.server_port)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            pg = open_room(browser, a.dist, origin, "v10", natural=a.native_opening)
            states = {}
            key = None
            for when in ("opening", "active", "parked"):
                if when == "active":
                    key = pg.evaluate("footSaveScene.begin()")
                if when == "parked":
                    pg.evaluate("key=>footSaveScene.park(key)", key)
                states[when] = {
                    "before": pg.evaluate("footSaveScene.read()"),
                    "save": pg.evaluate("captureNativeFootSave()"),
                }
            pg.close()
            rows = []
            for when, obj in states.items():
                raw = obj["save"]
                before = obj["before"]
                life = json.loads(raw)
                old = {a["key"]: a for a in before["people"]}
                if when == "active":
                    assert old[key]["target"]
                if when == "parked":
                    assert old[key]["target"] is None
                trials = {}
                for arm in ("v10", "v11-foot"):
                    page = open_room(browser, a.dist, origin, arm, raw)
                    after = page.evaluate("footSaveScene.read()")
                    rebuilt = json.loads(page.evaluate("captureNativeFootSave()"))
                    beforeIds = [c["id"] for c in life["companions"]]
                    afterIds = [c["id"] for c in rebuilt["companions"]]
                    assert beforeIds == afterIds, (beforeIds, afterIds)
                    assert life["speciesLine"] == rebuilt["speciesLine"]
                    assert (
                        life["lifetime"]["equippedItemId"]
                        == rebuilt["lifetime"]["equippedItemId"]
                    )
                    careDiff = [
                        {"key": x["id"], "before": x, "after": y}
                        for x, y in zip(life["companions"], rebuilt["companions"])
                        if x != y
                    ]
                    assert (
                        len(after["people"]) == 28
                        and before["region"] == after["region"] == "forest"
                    )
                    assert not any(a["target"] or a["route"] for a in after["people"])
                    distances = []
                    for a2 in after["people"]:
                        a1 = old[a2["key"]]
                        s = after["scale"]
                        d = (
                            ((a2["x"] - a1["x"]) * s["x"]) ** 2
                            + ((a2["y"] - a1["y"]) * s["y"]) ** 2
                        ) ** 0.5
                        distances.append(
                            dict(
                                key=a2["key"],
                                before=[a1["x"], a1["y"]],
                                restored=[a2["x"], a2["y"]],
                                distanceCSS=d,
                            )
                        )
                    trials[arm] = dict(
                        distances=distances, reconstructed=after, careDiff=careDiff
                    )
                    page.close()
                assert (
                    trials["v10"]["reconstructed"]["people"]
                    == trials["v11-foot"]["reconstructed"]["people"]
                )
                assert trials["v10"]["careDiff"] == trials["v11-foot"]["careDiff"], [
                    v["careDiff"][:1] for v in trials.values()
                ]
                rows.append(
                    dict(
                        case=when,
                        sourceSaveSHA256=hashlib.sha256(raw.encode()).hexdigest(),
                        nativeCareSave=raw,
                        sourceModel=before,
                        watched=key,
                        trials=trials,
                    )
                )
                print(
                    when,
                    key,
                    sum(i["distanceCSS"] > 1e-4 for i in trials["v10"]["distances"]),
                    flush=True,
                )
                a.out.write_text(
                    json.dumps(
                        dict(
                            browser=browser.version,
                            opening="native" if a.native_opening else "paired",
                            cases=rows,
                        ),
                        separators=(",", ":"),
                    )
                    + "\n"
                )
            browser.close()
    finally:
        srv.shutdown()


if __name__ == "__main__":
    main()
