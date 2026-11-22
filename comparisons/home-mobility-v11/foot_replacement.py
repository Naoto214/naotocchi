"""Reproduce a nonwalking change in the actual native renderer with 28 recorded model feet."""

import argparse
import functools
import http.server
import json
import subprocess
import threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
MODEL = "home-production-model-mobility-v10.js"
RENDER = "home-production-diorama-mobility-v10.js"
PARAMETERS = dict(
    region="forest",
    count=28,
    paused=1,
    paired=1,
    variant="B",
    ground="on",
    time="day",
    season="autumn",
    weather="sunny",
    clock=0,
    footLog=1,
)


class Local(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def replace_once(source, needle, replacement):
    assert source.count(needle) == 1, needle
    return source.replace(needle, replacement)


def attach_model(source):
    return replace_once(
        source,
        "    return {metrics:",
        """    globalThis.restoreMeasuredFeet = feet => {
      for(const [key,x,y,w,h] of feet){
        const a=actor(key);
        if(!a || a.w!==w || a.h!==h)throw Error('Shape mismatch '+key);
        Object.assign(a,{x,y,route:[],target:null});
      }
    };
    return {metrics:""",
    )


def attach_renderer(source):
    return replace_once(
        source,
        "    function sync(){",
        """    globalThis.footNativeProbe = {
      snapshot(){return model.snapshot().map(a=>({key:a.key,x:a.x,y:a.y,body:[a.w,a.h],asset:rows.get(a.key)?.asset}));},
      replace(key){const row=rows.get(key);row.owner.replaceWith(row.owner.cloneNode(true));sync();},
      scale(){return scene.navigation.intentScale;},
      sync
    };
    function sync(){""",
    )


def patched(source, kind):
    code = "const fs=require('node:fs'),f=require(process.argv[1]);process.stdout.write(f[process.argv[2]](fs.readFileSync(0,'utf8')));"
    return subprocess.check_output(
        ["node", "-e", code, str(HERE / "foot.cjs"), kind], input=source, text=True
    )


def run_case(browser, origin, dist, candidate):
    page = browser.new_page(
        viewport={"width": 320, "height": 792},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )

    def hook(route):
        name = route.request.url.split("?")[0].split("/")[-1]
        s = (dist / "game" / name).read_text()
        if name == MODEL:
            if candidate:
                s = patched(s, "patchFootDiagnostics")
            s = attach_model(s)
        if name == RENDER:
            if candidate:
                s = patched(s, "patchFoot")
            s = attach_renderer(s)
        route.fulfill(status=200, content_type="text/javascript", body=s)

    page.route("**/" + MODEL + "*", hook)
    page.route("**/" + RENDER + "*", hook)
    page.goto(
        origin + "/game/mobility-v10.html?" + urlencode(PARAMETERS),
        wait_until="domcontentloaded",
    )
    page.wait_for_function(
        "window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && window.footNativeProbe"
    )
    page.evaluate(
        "Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))"
    )
    fixture = json.loads((HERE / "evidence/foot-recorded-panda.json").read_bytes())
    result = page.evaluate(
        """feet=>{
      restoreMeasuredFeet(feet);let before=footNativeProbe.snapshot(),scale=footNativeProbe.scale();
      footNativeProbe.replace('companion:panda');let after=footNativeProbe.snapshot(),changed=[];
      for(let i=0;i<after.length;i++){const b=before[i],a=after[i];
        const d=Math.hypot((a.x-b.x)*scale.x,(a.y-b.y)*scale.y);
        if(d>1e-7)changed.push({key:a.key,from:[b.x,b.y],to:[a.x,a.y],distanceCSS:d});}
      return {count:after.length,changed,diagnostics:window.HomeFootDiagnostics?.read()};
    }""",
        fixture["peers"],
    )
    page.close()
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("--expect-stable", action="store_true")
    p.add_argument("--candidate", action="store_true")
    p.add_argument("--out", type=Path)
    opts = p.parse_args()
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=opts.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            data = run_case(
                browser,
                "http://127.0.0.1:" + str(server.server_port),
                opts.dist,
                opts.candidate,
            )
            browser.close()
    finally:
        server.shutdown()
    if opts.out:
        opts.out.write_text(json.dumps(data, indent=2) + "\n")
    print(data["count"], data["changed"])
    if opts.expect_stable:
        assert data["changed"] == [], data["changed"]
    else:
        assert (
            len(data["changed"]) == 1
            and abs(data["changed"][0]["distanceCSS"] - 22.74165) < 0.01
        )


if __name__ == "__main__":
    main()
