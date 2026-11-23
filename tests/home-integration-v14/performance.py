"""Measure the real home from three immutable commits, using one Linux WPE process.

Run from the repository root with Python Playwright installed and its WebKit
browser installed. Supply --assets for a sparse checkout. Local asset bytes
are accepted only if their Git blob IDs match the selected revision.
"""
import argparse
import functools
import hashlib
import json
import math
import mimetypes
import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
BASE = "9539e462"
FOOT = "3eaea1e7"
SEED = Path(__file__).with_name("resident-save.cjs")
ARMS = ("production", "v11", "candidate")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def start_server(revision, assets):
    tree = {}
    for line in git("ls-tree", "-r", "-z", revision).split(b"\0"):
        if line:
            meta, name = line.split(b"\t", 1)
            tree[name.decode()] = meta.split()[2].decode()

    @functools.lru_cache(maxsize=350)
    def content(name):
        oid = tree[name]
        for base in (ROOT, *assets):
            p = base / name
            if p.is_file():
                data = p.read_bytes()
                prefix = f"blob {len(data)}\0".encode()
                if hashlib.sha1(prefix + data).hexdigest() == oid:
                    return data
        return git("cat-file", "blob", oid)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            name = unquote(urlsplit(self.path).path.lstrip("/")) or "index.html"
            if name not in tree:
                self.send_error(404)
                return
            data = content(name)
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


SETUP = """
let seed=214;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const save=SAVE_TEMPLATE;
save.savedAt=Date.now();
localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));
localStorage.setItem('naotocchi-save-v1:home-guide-v1','done');
"""
ACTORS = "[data-diorama-actor]"
TARGET = """i=>{
 const actors=[...document.querySelectorAll('[data-diorama-actor]')];
 for(let k=0;k<actors.length;k++){
   const node=actors[(i*7+i%3+k)%actors.length], r=node.getBoundingClientRect();
   if(node.dataset.dioramaSelected==='true')continue;
   for(const dy of [.5,.35,.75,.85]) for(const dx of [.5,.35,.65]){
     const x=Math.round(r.left+r.width*dx),y=Math.round(r.top+r.height*dy);
     if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===node)
       return {x,y,key:node.dataset.dioramaActor};
   }
 }
 throw Error('No exposed resident for tap');
}"""


def measure(browser, url, width, seconds, save, active_input=False):
    ctx = browser.new_context(viewport={"width": width, "height": 792}, device_scale_factor=2,
                              has_touch=True, is_mobile=True, reduced_motion="no-preference")
    ctx.add_init_script(SETUP.replace("SAVE_TEMPLATE", save))
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda r: errors.append(f"{r.status} {urlsplit(r.url).path}") if r.status >= 400 else None)
    try:
        page.goto(url, wait_until="load", timeout=90000)
        page.wait_for_function("""()=>document.querySelectorAll('[data-diorama-actor]').length===28 &&
          document.querySelector('.home-art-canvas')?.width>0""", timeout=60000)
        page.evaluate("document.fonts.ready")
        page.touchscreen.tap(1, 1)  # Give the default game audio a user gesture.
        page.wait_for_timeout(8000)
        frames = page.evaluate("""duration=>new Promise(resolve=>{
          const dt=[],activity=[];let first,prev,nextSample=0;
          function tick(t){
            if(first===undefined)first=t; else dt.push(+(t-prev).toFixed(2));
            prev=t;
            if(t-first>=nextSample){
              const stage=document.getElementById('castStage');
              activity.push({ms:Math.round(t-first),region:stage.dataset.diorama,time:stage.dataset.dioramaTime,
                paused:stage.dataset.dioramaPaused,walking:stage.querySelectorAll('[data-diorama-walking="true"]').length});
              nextSample+=1000;
            }
            if(t-first>=duration)resolve({dt,activity}); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        })""", seconds * 1000)
        page.evaluate("""()=>{
          window.touchRows=[];
          document.addEventListener('pointerup',e=>{
            if(!e.isTrusted||e.pointerType!=='touch')return;
            const at=performance.now(), row={queueMs:at-e.timeStamp,
              paused:document.getElementById('castStage').dataset.dioramaPaused==='true',
              eventTarget:e.target.closest('[data-diorama-actor]')?.dataset.dioramaActor||null};
            touchRows.push(row);
            requestAnimationFrame(()=>{row.nextFrameMs=performance.now()-e.timeStamp;
              row.selected=document.querySelector('[data-diorama-selected="true"]')?.dataset.dioramaActor||null;});
          },true);
        }""")
        taps = []
        for i in range(36 if active_input else 12):
            if active_input:
                page.wait_for_function("document.getElementById('castStage').dataset.dioramaPaused === 'false'",
                                       timeout=30000)
            target = page.evaluate(TARGET, i)
            page.touchscreen.tap(target["x"], target["y"])
            page.wait_for_function("i=>window.touchRows[i]?.nextFrameMs!=null", arg=i, timeout=5000)
            row = page.evaluate("i=>touchRows[i]", i)
            taps.append({"target": target["key"], **row})
            if active_input and sum(not t["paused"] for t in taps) == 12:
                break
            page.wait_for_timeout(150)
        if active_input and sum(not t["paused"] for t in taps) != 12:
            raise RuntimeError("Did not receive twelve trusted inputs while the home was active")
        count = page.locator(ACTORS).count()
        if count != 28 or errors:
            raise ValueError((count, errors))
        if any(s["region"] != "forest" or s["time"] != "day" for s in frames["activity"]):
            raise ValueError(frames["activity"])
        return {"framesMs": frames["dt"], "activity": frames["activity"], "taps": taps, "count": count, "errors": errors}
    finally:
        ctx.close()


def stats(values):
    v = sorted(values)
    return {"n": len(v), **{f"p{p}": v[math.ceil(len(v)*p/100)-1] for p in (50, 95, 99)}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate")
    parser.add_argument("output", type=Path)
    parser.add_argument("--assets", type=Path, action="append", default=[])
    parser.add_argument("--active-input", action="store_true",
                        help="Collect twelve unpaused pointerup events; pair with --seconds 1 for input-only runs")
    parser.add_argument("--widths", nargs="+", type=int, default=[320, 390])
    parser.add_argument("--seconds", default=90, type=int)
    parser.add_argument("--arms", nargs="+", default=ARMS, choices=ARMS)
    parser.add_argument("--orders", nargs="+", default=["forward", "reverse"], choices=["forward", "reverse"])
    opts = parser.parse_args()
    revisions = {arm: git("rev-parse", rev).decode().strip()
                 for arm, rev in zip(ARMS, (BASE, FOOT, opts.candidate))}
    servers = {arm: start_server(revisions[arm], opts.assets) for arm in opts.arms}
    save = subprocess.check_output(["node", str(SEED)], text=True, cwd=ROOT)
    result = {"revisions": revisions, "durationSeconds": opts.seconds, "requireActiveInput": opts.active_input, "rows": []}
    try:
        with sync_playwright() as pw:
            browser = pw.webkit.launch(executable_path=os.environ.get("WEBKIT_EXECUTABLE"))
            result["webkit"] = browser.version
            for width in opts.widths:
                for order in opts.orders:
                    arms = opts.arms if order == "forward" else opts.arms[::-1]
                    for arm in arms:
                        print("Starting", width, order, arm, flush=True)
                        port = servers[arm].server_address[1]
                        row = measure(browser, f"http://127.0.0.1:{port}/", width, opts.seconds, save, opts.active_input)
                        frame = row["framesMs"]
                        taps = [t for t in row["taps"] if not opts.active_input or not t["paused"]]
                        row.update(arm=arm, width=width, order=order, frame=stats(frame),
                                   over50=sum(t>50 for t in frame), over100=sum(t>100 for t in frame),
                                   hitches={n: sum(t>n for t in frame) for n in (250, 500, 1000)},
                                   input=stats([t["nextFrameMs"] for t in taps]),
                                   selected=sum(t["target"]==t["selected"] for t in taps))
                        result["rows"].append(row)
                        opts.output.write_text(json.dumps(result, separators=(",", ":"))+"\n")
                        print(arm, width, order, row["frame"], row["input"], row["selected"], flush=True)
            browser.close()
    finally:
        for server in servers.values():
            server.shutdown()


if __name__ == "__main__":
    main()
