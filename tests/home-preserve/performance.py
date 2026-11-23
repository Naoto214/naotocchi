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


def instrument(page, root, bracket=False, frame_grid=False):
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
                if bracket and operation == 'step':
                    wrapper = wrapper.replace('if(!window.sampleOps)', 'if(!window.bracketActive&&args[0]>0)return;if(!window.sampleOps)')
                if bracket and operation == 'move':
                    # Capture full peer footprints outside the timed section.
                    wrapper = wrapper.replace('try{return originalmove(...args);}', 'let result;try{return result=originalmove(...args);}')
                    wrapper = wrapper.replace('sampleOps("move",start,performance.now());',
                            'sampleOps("move",start,performance.now());const a=actor(args[0]);'
                            'window.bracketRoutes.push([result,a?.target,a?.route?.slice()]);')
                    wrapper = wrapper.replace('const start=performance.now();', """
                      window.bracketInputs.push([clock,args,actors.map(a=>[a.key,a.x,a.y,a.w,a.h])]);
                      const start=performance.now();""")
                src = once(src, anchor, wrapper)
        else:
            src = once(src, 'modelAPI.createModel({onEvent:emit})',
                       'modelAPI.createModel({onEvent:emit,random:window.bracketRandom})')
            if frame_grid:
                anchor = 'return {model,update,sync,interrupt,'
                src = once(src, anchor, """window.perfReady=(r,n)=>enabled && scene?.region===r &&
                    world?.stats().loaded && scene.navigation && rows.size===n && !pendingResidentPresentation &&
                    [...stage.querySelectorAll('img.character-asset')].every(i=>i.complete&&i.naturalWidth);
                  window.perfCamera=()=>JSON.stringify([env.NaotocchiHomeViewport.residentPresentation(),
                    world.stats().projectionRevision,stage.clientWidth,stage.clientHeight]);
                  window.perfMoving=()=>!blocked() && model.snapshot().some(a=>a.target);
                """+anchor)
                anchor='world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();'
                src = once(src,anchor,'const drawingAt=performance.now();'+anchor+
                           'window.sampleOps?.("render",drawingAt,performance.now());')
            if bracket:
                anchor = 'return {model,update,sync,interrupt,'
                src = once(src, anchor, """window.bracketReady=(region,count)=>enabled && scene?.region===region &&
                  world?.stats().loaded && scene.navigation && model.snapshot().length===count &&
                  !pendingResidentPresentation && [...stage.querySelectorAll('img.character-asset')].every(i=>i.complete&&i.naturalWidth);
                window.bracketGeometry=()=>JSON.stringify([env.NaotocchiHomeViewport.residentPresentation(),
                  model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]),world.stats().projectionRevision]);
                window.bracketRun=n=>{
                  const pack=()=>model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h,a.nextAt,a.manualUntil,a.lastWalk,a.target,a.route]);
                  const opening=pack(),before=model.metrics(),cost={move:[],step:[]};
                  window.bracketInputs=[];window.bracketRoutes=[];window.bracketActive=true;
                  window.sampleOps=(name,a,b)=>cost[name].push(b-a);
                  try{for(let i=0;i<n*10;i++)model.step(.1,{blocked:false,reducedMotion:false});}
                  finally{window.sampleOps=null;window.bracketActive=false;}
                  return {opening,inputs:window.bracketInputs,routes:window.bracketRoutes,final:pack(),before,after:model.metrics(),cost};
                };
                """+anchor)
            anchor = 'return {model,update,sync,interrupt,'
            src = once(src, anchor, 'window.residentStats=()=>model.metrics();'+anchor)
            anchor = 'if(gap>=interval){'
            src = once(src, anchor, anchor+'const sampledAt=performance.now();')
            anchor = 'if(frames%15===0)'
            src = once(src, anchor, 'window.sampleOps?.("update",sampledAt,performance.now());'+anchor)
        route.fulfill(body=src, content_type='text/javascript')
    page.route(re.compile(r'/home-production-(model|diorama)\.js(?:\?|$)'), patch)


RECORD = """ms=>new Promise(resolve=>{
 const times={frame:[],step:[],move:[],update:[],render:[]}, stalls=[], states={}; let prev, start, before;
 const operations=[];
 function record(name,a,b){times[name].push(b-a);if(b>a)operations.push([name,a,b]);}
 function frame(t){
   if(start===undefined){start=t;before=residentStats();window.sampleOps=record;}
   else{
     const gap=t-prev; times.frame.push(gap);
     if(gap>=100)stalls.push({ms:t-start,gap});
   }
   const stage=document.getElementById('castStage');
   const key=[stage.dataset.diorama,stage.dataset.dioramaTime,stage.dataset.dioramaPaused].join('/');
   states[key]=(states[key]||0)+1;prev=t;
   if(t-start>=ms){
     window.sampleOps=null;
     // Both timestamps are relative to performance.timeOrigin. Count only
     // the part of each operation actually inside the delayed frame interval.
     for(const stall of stalls){
       const to=start+stall.ms, from=to-stall.gap;
       for(const [name,a,b] of operations){
         const overlap=Math.min(to,b)-Math.max(from,a);
         if(overlap>0)stall[name]=(stall[name]||0)+overlap;
       }
     }
     resolve({times,stalls,states,before,after:residentStats(),elapsed:t-start,
       actors:[...stage.querySelectorAll('[data-diorama-actor]')].map(n=>n.dataset.dioramaActor).sort()});
   }else nativeFrame(frame);
 }
 nativeFrame(frame);
})"""


def summarize(values):
    if not values:
        return {'n': 0}
    values = sorted(values)
    return {'n': len(values), 'total': round(sum(values), 1), 'max': round(values[-1], 1),
            **{f'p{p}': round(values[math.ceil(len(values)*p/100)-1], 1) for p in (50, 95, 99)}}


def trial(browser, server, root, save, region, count, seconds, bracket=False, frame_grid=False, width=375):
    context = browser.new_context(viewport={'width':width, 'height':{320:516,375:615,390:630,430:695}[width]}, device_scale_factor=2,
                                  has_touch=True, is_mobile=True, timezone_id='Asia/Tokyo', locale='ja-JP')
    errors = []
    try:
        # Align game/calendar time while keeping the browser's actual vsync,
        # event queue, monotonic clock, and timers. Playwright's Clock API
        # installs a scheduler that would invalidate real-frame observations.
        date_only = """window.nativeClock=[requestAnimationFrame,performance.now,setTimeout].every(
              fn=>Function.prototype.toString.call(fn).includes('[native code]'));
          window.nativeFrame=requestAnimationFrame.bind(window);
          const RealDate=Date;
          const offset=Date.parse('2026-11-23T03:00:00Z')-Date.now();
          Date=new Proxy(RealDate,{
            apply(){return new RealDate(RealDate.now()+offset).toString();},
            construct(target,args){return args.length?new target(...args):new target(RealDate.now()+offset);},
            get(target,key){return key==='now'?()=>RealDate.now()+offset:Reflect.get(target,key);}
          });"""
        context.add_init_script(date_only+'let seed=214;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);'
                                'const save='+save+';save.savedAt=Date.now();localStorage.setItem("naotocchi-save-v1",JSON.stringify(save));'
                                'localStorage.setItem("naotocchi-save-v1:home-guide-v1","done");')
        context.add_init_script("let actorSeed=214;window.bracketRandom=()=>((actorSeed=(Math.imul(actorSeed,1664525)+1013904223)>>>0)/4294967296)")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda r: errors.append(str(r.status)+' '+r.url.split('/')[-1]) if r.status >= 400 else None)
        instrument(page, root, bracket, frame_grid)
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='load', timeout=90000)
        if bracket:
            page.wait_for_function('([r,n])=>window.bracketReady?.(r,n)',arg=[region,count],timeout=60000)
            page.evaluate("""async()=>{const limit=performance.now()+15000;let previous=null,unchanged=0;
              while(performance.now()<limit){
                await new Promise(nativeFrame);const key=bracketGeometry();
                if(key!==previous){previous=key;unchanged=performance.now();}
                else if(performance.now()-unchanged>=1500)return;
              }throw Error('Controlled model did not settle');
            }""")
            result=page.evaluate('n=>bracketRun(n)',seconds)
            before,after=result['before'],result['after']
            def digest(data):
                return hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
            return {'opening':digest(result['opening']), 'final':digest(result['final']),
                    'inputs':[digest(entry) for entry in result['inputs']],
                    'routes':[digest(entry) for entry in result['routes']],
                    'metrics':{k:summarize(values) for k,values in result['cost'].items()},
                    'moveMs':result['cost']['move'], 'errors':errors,
                    'activity':{k:round(after[k]-before[k],3) for k in ('clock','distance','moves','turns')}}
        page.wait_for_function("""([r,n])=>document.getElementById('castStage')?.dataset.diorama===r &&
            document.querySelectorAll('[data-diorama-actor]').length===n && window.residentStats?.().clock>0""",
                               arg=[region, count], timeout=60000)
        assert page.evaluate('window.nativeClock'), 'Non-native frame clock at navigation'
        grid_state=None
        if frame_grid:
            page.wait_for_function('([r,n])=>perfReady(r,n)',arg=[region,count],timeout=60000)
            grid_state=page.evaluate("""async()=>{
              let previous,stable=0,seen=false,start=performance.now();
              while(performance.now()-start<8000){
                await new Promise(nativeFrame);const camera=perfCamera();
                stable=camera===previous?stable+1:0;previous=camera;
                seen=perfMoving();
                if(stable>=3&&(seen||performance.now()-start>=4000))break;
              }
              return {camera:previous,stableFrames:stable,startedWalking:seen,waitMs:performance.now()-start};
            }""")
            if grid_state['stableFrames']<3:raise ValueError('Camera failed to settle')
        else:
            page.wait_for_timeout(3000)
        row = page.evaluate(RECORD, seconds*1000)
        if frame_grid:row['opening']=grid_state
        times = row.pop('times')
        before, after = row.pop('before'), row.pop('after')
        row['metrics'] = {key: summarize(value) for key, value in times.items()}
        row['hitches'] = {str(t): sum(v>t for v in times['frame']) for t in [100, 250, 500, 1000]}
        row['stalledMs'] = {str(t): round(sum(v for v in times['frame'] if v>t),1) for t in [100,250,500,1000]}
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
    p.add_argument('--reference',type=Path,help='An optional unchanged candidate between the production and trial builds')
    p.add_argument('--seconds', type=int, default=60)
    p.add_argument('--cases', nargs='+', default=['forest/28','mountain/10','jungle/10','forest/1'])
    p.add_argument('--orders', nargs='+', choices=['forward','reverse'], default=['forward','reverse'])
    p.add_argument('--bracket', action='store_true',help='Compare work for identical 100 ms model ticks, independently of frame timing')
    p.add_argument('--engine', choices=['chromium','webkit'], default='webkit')
    p.add_argument('--executable')
    args = p.parse_args()
    roots = {'production':args.production}
    if args.reference:
        roots['reference']=args.reference
    roots['candidate']=args.candidate
    servers = {s: serve(r) for s,r in roots.items()}
    data = {'durationSeconds': args.seconds, 'rows': [], 'controlledSteps':args.bracket,'sha256': {
        s: {f: hashlib.sha256((r/f).read_bytes()).hexdigest() for f in
            ('home-production-model.js','home-production-diorama.js','index.html','home-route-navigation.mjs',
             'home-art-navigation.mjs','home-visible-ground-navigation.mjs','home-recovered-navigation.mjs','home-production-world.mjs')} for s,r in roots.items()}}
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
                        row = trial(browser, servers[arm], roots[arm], save, region, int(n), args.seconds, args.bracket)
                        data['rows'].append(dict(case=case,order=order,arm=arm,**row))
                        args.output.write_text(json.dumps(data, separators=(',',':'))+'\n')
            browser.close()
    finally:
        for server in servers.values():
            server.shutdown()


if __name__ == '__main__':
    main()
