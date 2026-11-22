"""Verify transfer refusal and native remeasurement under controlled changes to the real browser DOM."""

import argparse
import functools
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

PROBE = """
    globalThis.footGuard=({mode,feet})=>{
      const key='companion:panda',original=rows.get(key);
      residentEnvelopeKey='';publishResidentEnvelope();
      const input=structuredClone(feet);
      if(mode==='invalid-foot'){const f=input.find(p=>p[0]===key);f[1]=-100;f[2]=-100;}
      restoreMeasuredFeet(input);
      if(mode==='unmeasured')delete original.paintExtent;
      if(mode==='corrupt')original.paintExtent={...original.paintExtent,down:48};
      const selected=mode==='all'? [...rows.values()].filter(r=>r.kind==='companion'):[original];
      const events=[];
      for(const row of selected){
        const clone=row.owner.cloneNode(true),img=clone.querySelector('img.character-asset');
        if(mode==='image')img.src='assets/characters/companions/shiba.png';
        if(mode==='owner-width')clone.style.width=(parseFloat(clone.style.width)+1)+'px';
        if(mode==='image-width')img.style.width='50%';
        if(mode==='equipment-dom'){const extra=doc.createElement('img');extra.className='accessory-asset';clone.appendChild(extra);}
        row.owner.replaceWith(clone);
      }
      if(mode==='frame')stage.closest('.screen-frame').style.width=(stage.closest('.screen-frame').getBoundingClientRect().width-1)+'px';
      if(mode==='region')scene={...scene,region:'city'};
      if(mode==='scene-width')scene={...scene,width:scene.width+1};
      if(mode==='navigation')scene={...scene,navigation:{...scene.navigation}};
      if(mode==='revision'){const lastWorld=world;world={...lastWorld,stats:()=>({...lastWorld.stats(),projectionRevision:lastWorld.stats().projectionRevision+1})};}
      const before=model.snapshot();
      window.observeFootGuard={mode,events};sync();delete window.observeFootGuard;
      const after=model.snapshot(),p=after.find(a=>a.key===key),b=model.bounds(p),s=scene.navigation.intentScale;
      const moved=after.map((a,i)=>({key:a.key,from:[before[i].x,before[i].y],to:[a.x,a.y],
        d:Math.hypot((a.x-before[i].x)*s.x,(a.y-before[i].y)*s.y)})).filter(a=>a.d>1e-4);
      const legible=scene.navigation.valid(p)&&p.x>=b.left-1e-5&&p.x<=b.right+1e-5&&p.y>=b.top-1e-5&&p.y<=b.bottom+1e-5;
      return {events,moved,legible,count:after.length};
    };
    function sync(){"""
MODIFY = """
        if(window.observeFootGuard && a.key==='companion:panda'){
          const mode=observeFootGuard.mode;
          if(mode==='owner-id')a.owner.dataset.companionId='shiba';
          if(mode==='actor-id')a.id='other';
          if(mode==='body-asset')a.asset='assets/characters/companions/shiba.png';
          if(mode==='growth'){a.w+=2;a.h+=2;a.extent={left:a.w/2,right:a.w/2,top:a.h,bottom:0};}
          if(mode==='equipment-bounds')a.extent={...a.extent,right:a.extent.right+1};
          if(mode==='attachments')a.attachments=[a.owner.firstElementChild];
          if(mode==='origin')a.originX+=1;
          if(mode==='foot-space')a.x+=1;
        }
        let row=rows.get(a.key);"""
CASES = [
    "same",
    "all",
    "invalid-foot",
    "unmeasured",
    "corrupt",
    "image",
    "owner-id",
    "owner-width",
    "image-width",
    "equipment-dom",
    "frame",
    "region",
    "scene-width",
    "navigation",
    "revision",
    "actor-id",
    "body-asset",
    "growth",
    "equipment-bounds",
    "attachments",
    "origin",
    "foot-space",
]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=args.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    feet = json.loads((HERE / "evidence/foot-recorded-panda.json").read_bytes())[
        "peers"
    ]
    source = patched((args.dist / "game" / RENDER).read_text(), "patchFoot")
    source = replace_once(source, "    function sync(){", PROBE)
    source = replace_once(source, "        let row=rows.get(a.key);", MODIFY)
    source = replace_once(
        source,
        "        if (cached) Object.assign(row,cached);",
        "        if(window.observeFootGuard && replacing)observeFootGuard.events.push([a.key,cached?'reused':'remeasured']);\n        if (cached) Object.assign(row,cached);",
    )
    model = attach_model((args.dist / "game" / MODEL).read_text())
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            rows = []
            if args.out.exists():
                rows = json.loads(args.out.read_text())["cases"]
            for case in CASES:
                if any(item["case"] == case for item in rows):
                    continue
                page = browser.new_page(
                    viewport={"width": 320, "height": 792},
                    device_scale_factor=2,
                    is_mobile=True,
                    has_touch=True,
                )
                page.set_default_timeout(100000)
                page.route(
                    "**/" + MODEL + "*",
                    lambda r: r.fulfill(content_type="text/javascript", body=model),
                )
                page.route(
                    "**/" + RENDER + "*",
                    lambda r: r.fulfill(content_type="text/javascript", body=source),
                )
                page.goto(
                    "http://127.0.0.1:"
                    + str(server.server_port)
                    + "/game/mobility-v10.html?"
                    + urlencode(PARAMETERS),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    'window.HomeCastTrial?.ready && HomeDragTrial?.opening() && (typeof window.footGuard!=="undefined")',
                    timeout=100000,
                )
                page.evaluate(
                    "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode().catch(()=>{})))"
                )
                data = page.evaluate(
                    "args=>footGuard(args)", dict(mode=case, feet=feet)
                )
                page.close()
                used = [e for e in data["events"] if e[1] == "reused"]
                print(
                    case, len(data["events"]), len(used), len(data["moved"]), flush=True
                )
                assert len(data["events"]) == (26 if case == "all" else 1), (case, data)
                assert len(used) == (
                    len(data["events"])
                    if case in ["same", "all", "invalid-foot"]
                    else 0
                ), (case, data)
                if case in ["same", "all"]:
                    assert not data["moved"]
                if case == "invalid-foot":
                    assert data["legible"] and any(
                        r["key"] == "companion:panda" and r["from"] == [-100, -100]
                        for r in data["moved"]
                    )
                rows.append(dict(case=case, **data))
                args.out.write_text(
                    json.dumps(dict(browser=browser.version, cases=rows), indent=2)
                    + "\n"
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
