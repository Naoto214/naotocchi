"""Exercise the disposable native home and record actual syncs through UI/life transitions."""

import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from foot_replacement import (
    HERE,
    MODEL,
    RENDER,
    PARAMETERS,
    Local,
    attach_model,
    replace_once,
    patched,
)

GAME = "script-v2-mobility-v7.js"
ROOT_EVENT = "  globalThis.__naotocchiBooted = true;"
COMMANDS = """
  let removedCompanion;
  globalThis.exerciseNativeHome={
    notice(){setSpeechBubble('おさんぽの時間だね',petSpeaker(),{important:true,holdMs:800});},
    social(){const c=state.companions.find(c=>c.id==='panda');startRelationshipPositive('companion',c);render();},
    expression(){state.hunger=0;startPetExpression('hungry',10000);renderPetVisual();renderHomeCast();},
    growth(){const prev=currentAge(),stage=currentFormStageIndex();
      let next=prev+1;while(next<GOAL_AGE&&stageForAge(next,state.speciesLine)===stage)next++;
      state.ageTicks=next*AGE_TICKS_PER_YEAR;onAgeChanged(prev);render();},
    evolution(){state.transformOptions=['cat'];chooseTransform('cat');},
    gear(){buyOrEquipShopItem('ribbon');},
    remove(){removedCompanion=state.companions.pop();render();},
    add(){state.companions.push(removedCompanion);render();},
    region(){window.postMessage({type:'home-beauty-settings',settings:{region:'river_lake'}},location.origin);},
    time(){HomeCastTrial.apply({time:'night'});},
    save(){saveState();return localStorage.getItem(SAVE_KEY);},
    life(){return {form:state.speciesLine,base:currentVisualStage().asset,stage:currentFormStageIndex(),
      gear:state.lifetime.equippedItemId??null,age:currentAge(),roster:state.companions.map(c=>c.id),
      expression:el.petSprite.dataset.expression,image:el.petSprite.querySelector('img')?.getAttribute('src'),
      message:el.speechText?.textContent,notice:!el.speechBubble?.classList.contains('hidden'),
      time:HomeBeauty.settings.time,region:HomeBeauty.settings.region};}
  };
"""
PROBE = """
    const nodeNumbers=new WeakMap();let serial=0;
    const nodeId=node=>{if(!nodeNumbers.has(node))nodeNumbers.set(node,++serial);return nodeNumbers.get(node)};
    globalThis.footChanges=[];
    globalThis.footDetails=()=>({
      people:model.snapshot().map(a=>{const r=rows.get(a.key),b=model.bounds(a);
        return {key:a.key,x:a.x,y:a.y,w:a.w,h:a.h,body:r.asset,owner:nodeId(r.owner),ink:r.paintExtent||null,
          terrain:scene.navigation?.valid(a),inside:a.x>=b.left-1e-5&&a.x<=b.right+1e-5&&a.y>=b.top-1e-5&&a.y<=b.bottom+1e-5};}),
      width:innerWidth,height:innerHeight,region:scene.region,projection:world?.stats().projectionRevision,
      scale:scene.navigation?.intentScale,presentation:env.NaotocchiHomeViewport?.residentPresentation?.(),
      ready:!pendingResidentPresentation
    });
    function sync(){"""


def run(browser, origin, dist, case, width=320):
    options = {
        "viewport": {"width": width, "height": 792},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
        "timezone_id": "Asia/Tokyo",
        "locale": "ja-JP",
    }
    context = browser.new_context(**options)
    page = context.new_page()
    page.set_default_timeout(100000)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    restored = None

    def hook(route):
        name = route.request.url.split("?")[0].split("/")[-1]
        if name == MODEL:
            source = attach_model(
                patched((dist / "game" / name).read_text(), "patchFootDiagnostics")
            )
        elif name == RENDER:
            source = patched((dist / "game" / name).read_text(), "patchFoot")
            source = replace_once(source, "    function sync(){", PROBE)
            if "        if (cached) Object.assign(row,cached);" in source:
                source = replace_once(
                    source,
                    "        if (cached) Object.assign(row,cached);",
                    """        if (refresh && window.recordFootChanges)footChanges.push([a.key,replacing,cached?'reused':'remeasured']);
        if (cached) Object.assign(row,cached);""",
                )
        elif name == GAME:
            source = replace_once(
                (dist / "game" / name).read_text(), ROOT_EVENT, COMMANDS + ROOT_EVENT
            )
        else:
            source = (dist / "game/beauty/fixture.js").read_text()
            if restored is not None:
                source = replace_once(
                    source, "JSON.stringify(state));", json.dumps(restored) + ");"
                )
        route.fulfill(status=200, content_type="text/javascript", body=source)

    for name in [MODEL, RENDER, GAME, "beauty/fixture.js"]:
        page.route("**/" + name + "*", hook)

    def start(paired=1):
        page.goto(
            origin
            + "/game/mobility-v10.html?"
            + urlencode({**PARAMETERS, "paired": paired}),
            wait_until="domcontentloaded",
        )
        page.wait_for_function(
            "window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && window.exerciseNativeHome && footDetails().ready"
        )
        page.evaluate(
            "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode().catch(()=>{})))"
        )

    def capture():
        return page.evaluate(
            "({state:exerciseNativeHome.life(),scene:footDetails(),log:HomeFootDiagnostics.read(),screen:HomeCastTrial.inspect().map(r=>({key:r.key,foot:r.foot})),audit:window.reflowAudit?.list})"
        )

    try:
        start()
        if case in ["population-add", "gear-on"]:
            page.evaluate(
                "exerciseNativeHome."
                + ("remove" if case == "population-add" else "gear")
                + "()"
            )
        if case in ["notice", "social", "expression", "time"]:
            prior = json.loads(
                (HERE / "evidence/foot-recorded-panda.json").read_bytes()
            )["peers"]
            page.evaluate("f=>restoreMeasuredFeet(f)", prior)
        before = capture()
        page.evaluate(
            "window.recordFootChanges=true;footChanges.length=0;if(window.reflowAudit){reflowAudit.active=true;reflowAudit.list.length=0;window.captureBeforeCare?.()}"
        )
        native = {
            "notice": "notice",
            "social": "social",
            "expression": "expression",
            "growth": "growth",
            "evolution": "evolution",
            "gear-off": "gear",
            "gear-on": "gear",
            "population-remove": "remove",
            "population-add": "add",
            "region": "region",
            "time": "time",
        }
        immediate = None
        if case in native:
            immediate = page.evaluate(
                "()=>{exerciseNativeHome."
                + native[case]
                + "();return exerciseNativeHome.life()}"
            )
        elif case == "width":
            page.set_viewport_size({"width": 375, "height": 792})
        elif case == "camera":
            page.set_viewport_size({"width": width, "height": 690})
        elif case == "save-restore":
            restored = page.evaluate("exerciseNativeHome.save()")
            start(paired=0)
        page.wait_for_timeout(450)
        page.wait_for_function(
            "footDetails().ready && footDetails().scale && footDetails().people.length>0"
        )
        after = capture()
        changes = page.evaluate("footChanges.slice()")
        old = {a["key"]: a for a in before["scene"]["people"]}
        different = []
        for a in after["scene"]["people"]:
            b = old.get(a["key"])
            if not b:
                continue
            scale = after["scene"]["scale"]
            delta = ((a["x"] - b["x"]) * scale["x"]) ** 2 + (
                (a["y"] - b["y"]) * scale["y"]
            ) ** 2
            if delta > 1e-8:
                different.append(
                    {
                        "key": a["key"],
                        "from": [b["x"], b["y"]],
                        "to": [a["x"], a["y"]],
                        "distanceCSS": delta**0.5,
                    }
                )
        previous = len(before["log"]["events"])
        events = (
            after["log"]["events"][previous:]
            if case != "save-restore"
            else after["log"]["events"]
        )
        result = dict(
            case=case,
            lifeBefore=before["state"],
            lifeAfter=after["state"],
            sceneBefore=before["scene"],
            sceneAfter=after["scene"],
            observedChanges=changes,
            shifts=different,
            syncEvents=events,
            pageErrors=errors,
            immediate=immediate,
        )
        priorScreen = {r["key"]: r["foot"] for r in before["screen"]}
        screenChanges = []
        for r in after["screen"]:
            b = priorScreen.get(r["key"])
            s = r["foot"]
            if b:
                distance = ((s["x"] - b["x"]) ** 2 + (s["y"] - b["y"]) ** 2) ** 0.5
                if distance > 1e-4:
                    screenChanges.append(
                        dict(key=r["key"], old=b, new=s, distanceCSS=distance)
                    )
        result["screenChanges"] = screenChanges
        result["audit"] = after.get("audit", [])
        if restored:
            result["careSaveSHA256"] = hashlib.sha256(restored.encode()).hexdigest()
        return result
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dist", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("cases", nargs="*", default=[])
    args = parser.parse_args()
    cases = args.cases or [
        "notice",
        "social",
        "expression",
        "growth",
        "evolution",
        "gear-off",
        "gear-on",
        "population-remove",
        "population-add",
        "region",
        "time",
        "width",
        "camera",
        "save-restore",
    ]
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=args.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            rows = []
            for case in cases:
                row = run(
                    browser,
                    "http://127.0.0.1:" + str(server.server_port),
                    args.dist,
                    case,
                )
                rows.append(row)
                args.out.write_text(
                    json.dumps(
                        {"browser": browser.version, "cases": rows},
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                    + "\n"
                )
                print(
                    case,
                    "shifts",
                    len(row["shifts"]),
                    "events",
                    len(row["syncEvents"]),
                    "errors",
                    row["pageErrors"],
                    flush=True,
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
