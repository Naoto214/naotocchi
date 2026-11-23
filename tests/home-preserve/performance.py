"""Compare two separately served builds in one foreground browser process.

Supply complete production and candidate checkouts, the common resident-save.cjs
fixture and an output path. Example from the repo root:
python tests/home-preserve/performance.py /tmp/main . tests/home-preserve/resident-save.cjs /tmp/pairs.json
"""
import argparse
from collections import Counter
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import re
import subprocess
from threading import Thread

from playwright.sync_api import sync_playwright


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(root):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(root)))
    Thread(target=server.serve_forever, daemon=True).start()
    return server


def once(src, before, after):
    if src.count(before) != 1:
        raise ValueError('Unrecognized source: ' + before)
    return src.replace(before, after)


def instrument(page, root):
    def patch(route):
        name = route.request.url.split('/')[-1].split('?')[0]
        src = (root / name).read_text()
        if name == 'home-production-model.js':
            # Include every plan, also plans initiated inside step. Nesting is
            # intentional: plan time is a subset of step time during walking.
            for operation, signature in [('move', "key,p,source='tap'"), ('step', 'dt,flags={}')]:
                anchor = f'function {operation}({signature}){{'
                wrapper = (f'function {operation}(...args){{if(!window.sampleOps)return original{operation}(...args);'
                           f'const start=performance.now();try{{return original{operation}(...args);}}'
                           f'finally{{sampleOps("{operation}",start,performance.now());}}}}'
                           f'function original{operation}({signature}){{')
                src = once(src, anchor, wrapper)
        else:
            anchor = 'return {model,update,sync,interrupt,'
            src = once(src, anchor, 'window.residentStats=()=>model.metrics();'+anchor)
            anchor = 'if(gap>=interval){'
            src = once(src, anchor, anchor+'const sampledAt=performance.now();')
            anchor = 'if(frames%15===0)'
            src = once(src, anchor, 'window.sampleOps?.("update",sampledAt,performance.now());'+anchor)
        route.fulfill(body=src, content_type='text/javascript')
    page.route(re.compile(r'/home-production-(model|diorama)\.js(?:\?|$)'), patch)


RECORD = """ms=>new Promise(resolve=>{
 const times={frame:[],step:[],move:[],update:[]}, stalls=[], states={}; let prev, start, before;
 const peaks={}; window.sampleOps=(name,a,b)=>{
   times[name].push(b-a);peaks[name]=Math.max(peaks[name]||0,b-a);
 };
 function frame(t){
   if(start===undefined){start=t;before=residentStats();}
   else{
     const gap=t-prev; times.frame.push(gap);
     if(gap>=100)stalls.push({ms:t-start,gap,...peaks});
   }
   for(const name of Object.keys(peaks))delete peaks[name];
   const stage=document.getElementById('castStage');
   const key=[stage.dataset.diorama,stage.dataset.dioramaTime,stage.dataset.dioramaPaused].join('/');
   states[key]=(states[key]||0)+1;prev=t;
   if(t-start>=ms){
     window.sampleOps=null;
     resolve({times,stalls,states,before,after:residentStats(),elapsed:t-start,
       actors:[...stage.querySelectorAll('[data-diorama-actor]')].map(n=>n.dataset.dioramaActor).sort()});
   }else requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})"""


def summarize(values):
    if not values:
        return {'n': 0}
    values = sorted(values)
    return {'n': len(values), 'total': round(sum(values), 1), 'max': round(values[-1], 1),
            **{f'p{p}': round(values[math.ceil(len(values)*p/100)-1], 1) for p in (50, 95, 99)}}


def trial(browser, server, root, save, region, count, seconds):
    context = browser.new_context(viewport={'width': 375, 'height': 615}, device_scale_factor=2,
                                  has_touch=True, is_mobile=True, timezone_id='Asia/Tokyo', locale='ja-JP')
    errors = []
    try:
        context.add_init_script('let seed=214;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);'
                                'const save='+save+';save.savedAt=Date.now();localStorage.setItem("naotocchi-save-v1",JSON.stringify(save));'
                                'localStorage.setItem("naotocchi-save-v1:home-guide-v1","done");')
        page = context.new_page()
        page.clock.set_fixed_time("2026-11-23T03:00:00Z")
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda r: errors.append(str(r.status)+' '+r.url.split('/')[-1]) if r.status >= 400 else None)
        instrument(page, root)
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='load', timeout=90000)
        page.wait_for_function("""([r,n])=>document.getElementById('castStage')?.dataset.diorama===r &&
            document.querySelectorAll('[data-diorama-actor]').length===n && window.residentStats?.().clock>0""",
                               arg=[region, count], timeout=60000)
        page.wait_for_timeout(3000)
        row = page.evaluate(RECORD, seconds*1000)
        times = row.pop('times')
        before, after = row.pop('before'), row.pop('after')
        row['metrics'] = {key: summarize(value) for key, value in times.items()}
        row['hitches'] = {str(t): sum(v>t for v in times['frame']) for t in [100, 250, 500, 1000]}
        row['stalls'] = sorted(row['stalls'], key=lambda r: r['gap'], reverse=True)[:5]
        row['activity'] = {k: round(after[k]-before[k], 2) for k in ['clock', 'distance', 'moves', 'turns']}
        row['errors'] = list(Counter(errors))
        assert len(row['actors']) == count and all(k.startswith(region+'/day/') for k in row['states']), row
        return row
    finally:
        context.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ['production', 'candidate', 'seed_file', 'output']:
        p.add_argument(name, type=Path)
    p.add_argument('--seconds', type=int, default=60)
    p.add_argument('--cases', nargs='+', default=['forest/28','mountain/10','jungle/10','forest/1'])
    p.add_argument('--orders', nargs='+', choices=['forward','reverse'], default=['forward','reverse'])
    p.add_argument('--engine', choices=['chromium','webkit'], default='webkit')
    p.add_argument('--executable')
    args = p.parse_args()
    roots = {s: getattr(args,s) for s in ('production','candidate')}
    servers = {s: serve(r) for s,r in roots.items()}
    data = {'durationSeconds': args.seconds, 'rows': [], 'sha256': {
        s: {f: hashlib.sha256((r/f).read_bytes()).hexdigest() for f in
            ('home-production-model.js','home-production-diorama.js','index.html')} for s,r in roots.items()}}
    try:
        with sync_playwright() as pw:
            browser = getattr(pw, args.engine).launch(executable_path=args.executable)
            data['browser'] = [args.engine, browser.version]
            for case in args.cases:
                region, n = case.split('/')
                save = subprocess.check_output(['node',str(args.seed_file),region,n], text=True)
                for order in args.orders:
                    for arm in list(roots) if order=='forward' else list(reversed(roots)):
                        print(case,order,arm,flush=True)
                        row = trial(browser, servers[arm], roots[arm], save, region, int(n), args.seconds)
                        data['rows'].append(dict(case=case,order=order,arm=arm,**row))
                        args.output.write_text(json.dumps(data, separators=(',',':'))+'\n')
            browser.close()
    finally:
        for server in servers.values():
            server.shutdown()


if __name__ == '__main__':
    main()
