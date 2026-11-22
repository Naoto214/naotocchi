"""Exercise strict geometry, art and route identity at the recorded mountain foot."""

import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    f = "home-production-model-v12-corridor.js"
    src = (args.dist / "game" / f).read_text()
    guard = "    const now=geometryExitAudit(next,actors);"
    assert src.count(guard) == 1
    # In a fresh isolated replica make exactly one change before native sync().
    src = src.replace(
        guard,
        """    const modeTest=globalThis.corridorControl;
    const testActor=actors.find(a=>a.key==='companion:panda');
    if(modeTest==='art')list=list.map(a=>a.key===testActor.key?{...a,reflowArt:'changed-cel'}:a);
    if(modeTest==='gear')list=list.map(a=>a.key===testActor.key?{...a,reflowGear:'changed-equipment'}:a);
    if(modeTest==='ink')list=list.map(a=>a.key===testActor.key?{...a,reflowInk:{...a.reflowInk,up:a.reflowInk.up+1}}:a);
    if(modeTest==='projection')next.navigation.reflowGeometry+='changed-camera';
    if(modeTest==='route'){
      testActor.target={x:-1e3,y:-1e3};
      testActor.source='keyboard';
    }
    if(modeTest==='route-safe'){
      const s=scene.navigation.intentScale,at=new Map();
      for(const length of [8,3])for(let i=0;i<48&&!testActor.target;i++){
        const to={x:testActor.x+length*Math.cos(i*Math.PI/24)/s.x,y:testActor.y+length*Math.sin(i*Math.PI/24)/s.y};
        if(yieldLeg(testActor,testActor,to,at)){testActor.target=to;testActor.source='keyboard';}
      }
      if(!testActor.target)throw Error('Positive route fixture did not find a legal goal');
      globalThis.originalRoute={...testActor.target};
    }
"""
        + guard,
    )
    sync = "    const after=geometryExitAudit(scene,actors);"
    assert src.count(sync) == 1
    src = src.replace(
        sync,
        "    globalThis.controlAfter={target:actor(testActor.key).target,source:actor(testActor.key).source};\n"
        + sync,
    )
    out = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/chromium")
        page = b.new_page(
            viewport={"width": 320, "height": 516},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page.set_default_timeout(120000)
        page.route(
            "**/" + f + "*",
            lambda r: r.fulfill(content_type="text/javascript", body=src),
        )
        page.goto(
            args.url
            + "/game/mobility-v12-corridor-mountain.html?region=mountain&count=10&paused=1&paired=1&time=day&ground=on&variant=B&footLog=1"
        )
        page.wait_for_function(
            "window.FootCorridorReplay && window.HomeCastTrial?.ready && HomeDragTrial.opening()"
        )
        page.evaluate(
            "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))"
        )
        record = page.evaluate(
            "async()=>await (await fetch('../v12/corridor-mountain.json')).json()"
        )
        for mode, held in [
            ("unchanged", True),
            ("art", False),
            ("gear", False),
            ("ink", False),
            ("projection", False),
            ("route", False),
            ("route-safe", True),
        ]:
            r = page.evaluate(
                """([source,mode])=>{corridorControl=mode;FootCorridorReplay.restore(source);
              const result=FootCorridorReplay.apply('guard');
              return {mode,decision:result.decision,change:result.change,after:controlAfter,expected:globalThis.originalRoute};}""",
                [record, mode],
            )
            assert r["decision"]["held"] == held, (mode, r)
            if mode == "route-safe":
                assert (
                    r["after"]["target"] == r["expected"]
                    and r["after"]["source"] == "keyboard"
                )
            out.append(r)
            args.out.write_text(
                json.dumps({"browser": b.version, "cases": out}, separators=(",", ":"))
                + "\n"
            )
            print(mode, r["decision"]["reason"], flush=True)
        b.close()


if __name__ == "__main__":
    main()
