"""Observe a fully active native home at each visual multiplier and starting layout."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import os
import platform
from pathlib import Path
from urllib.parse import urlencode, urlparse

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
reference = ROOT.parent / 'home-cast-size-v2' / 'verify_performance.py'
spec = importlib.util.spec_from_file_location('cast_v2_bench', reference)
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)
v1 = v2.v1

STANDARD_WIDTHS = {320: 568, 375: 812, 390: 844, 430: 932}
REGIONS = ('forest', 'river_lake', 'home', 'city', 'countryside', 'mountain', 'snow',
           'sea', 'jungle', 'desert', 'deepsea', 'star_stop', 'memory_lake')
BASE_SCALE = (1.20, 1.20, 1.05)
PROFILE = v1.INIT + '\nwindow.v3Timing={walk:0,clock:0};'

LIVE_SAMPLE = v1.sub(v1.SAMPLE, 'p.parts={};p.slow=[];',
                     'p.parts={};p.slow=[];v3Timing.clock=v3Timing.walk=0;')
LIVE_SAMPLE = v1.sub(LIVE_SAMPLE, 'phases:p.parts,pausedSec:',
                     'steps:{...v3Timing},stepWindow:"same-callback",phases:p.parts,pausedSec:')

async def instrument(route, source_hashes):
    response = await route.fetch()
    src = await response.text()
    name = Path(urlparse(route.request.url).path).name
    source_hashes[name] = hashlib.sha256(src.encode()).hexdigest()
    if name == 'limit-seating.js':
        await route.fulfill(response=response)
        return
    if 'diorama' in name:
        src = v1.sub(src, 'const model=modelAPI.createModel(',
                     'const model=window.loadProbe.live=modelAPI.createModel(')
        src = v1.sub(src, 'for(let remaining=',
                     'const lp=window.loadProbe,mt=performance.now();for(let remaining=')
        anchor = 'world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();'
        wrapper = ("lp.add('model',mt);const wt=performance.now();" + anchor.removesuffix('paint();')
                   + "lp.add('world',wt);const at=performance.now();paint();lp.add('actors',at);")
        src = v1.sub(src, anchor, wrapper)
    elif 'world' in name:
        anchor, = (line.strip() for line in src.splitlines()
                   if line.strip().startswith('composeNature(ctx,t,host,fade,'))
        src = v1.sub(src, anchor, "const bt=performance.now();" + anchor + "loadProbe.add('nature',bt);")
    else:
        start = 'function sync(list,next){'
        src = v1.sub(src, start, start + 'loadProbe.syncs++;')
        src = v1.sub(src, 'const plan=nav=>{', 'const plan=nav=>loadProbe.plan(()=>{')
        end = 'return {point:q,path,originalReference,expandedReference};\n      };'
        src = v1.sub(src, end, end[:-2] + '});')
        # V5 clock advances only on unpaused native steps. Credit that step to
        # walking only when at least one resident actually changed coordinates.
        src = v1.sub(src, 'clock+=dt;', 'clock+=dt;const prevDistance=stats.distance;')
        last = '    }\n    return {metrics:()=>({...stats'
        src = v1.sub(src, last,
                     '      v3Timing.clock+=dt;if(stats.distance>prevDistance)v3Timing.walk+=dt;\n' + last)
    await route.fulfill(response=response, body=src)

def fingerprint(obj):
    return hashlib.sha256(json.dumps(obj, separators=(',', ':')).encode()).hexdigest()

async def measure(browser, args, scene, extra, layout, trial):
    region, width, count = scene
    # Match the game viewport below the unchanged compact 52px owner toolbar.
    height = STANDARD_WIDTHS[width] - 52
    context = await browser.new_context(viewport={'width': width, 'height': height},
                                        device_scale_factor=2, has_touch=True)
    await context.add_init_script(PROFILE)
    hashes = {}
    async def intercept(route):
        await instrument(route, hashes)
    for pattern in ('**/home-production-diorama*.js*', '**/home-production-model.js*',
                    '**/home-production-world*.mjs*','**/limit-seating.js*'):
        await context.route(pattern, intercept)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    query = urlencode(dict(region=region, count=count, time='day', season='autumn', weather='sunny',
                           variant='B', compareSplit=0, paused=0, layout=layout, extra=extra))
    url = args.url.rstrip('/') + '/game/limit.html?' + query
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=120000)
        await page.wait_for_function("""n=>window.HomeCastTrial?.ready && !!loadProbe.parts.actors
          && !!loadProbe.parts.nature && HomeCastTrial.inspect().length===n""", arg=count, timeout=120000)
        state = await page.evaluate("""()=>({
          size:[innerWidth,innerHeight], roster:HomeCastTrial.inspect().map(a=>[a.key,a.w,a.h]),
          pose:HomeCastTrial.inspect().map(a=>[a.x,a.y]), scales:['pet','partner','companion'].map(k=>HomeCastTrial.scale(k)),
          paused:HomeCastTrial.settings.paused, settings:{...HomeCastTrial.settings},
          readyMs:performance.now()
        })""")
        expected = [k*(1+extra/100) for k in BASE_SCALE]
        assert len(state['roster']) == count and not state['paused'], state
        assert state['size'] == [width, height], state
        assert all(abs(got-want)<1e-8 for got,want in zip(state['scales'],expected)), (state, expected)
        sample = await page.evaluate(LIVE_SAMPLE, args.seconds)
        inputs = await v2.attempt_inputs(page, context, args.engine, args.inputs) if args.inputs else []
        assert sample['sameNodes'] and sample['rows'] == count and not errors, errors
        sweeps = []
        if args.sweep:
            assert layout == 'fixed' and extra == 0
            for gain in [5,10,15,20]:
                await page.evaluate('gain=>HomeCastTrial.apply({extra:gain})', gain)
                await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                timed = await page.evaluate(LIVE_SAMPLE, args.seconds)
                assert timed['rows'] == count and timed['sameNodes'] and timed['pausedSec'] == 0
                sweeps.append({'extra':gain,'sample':timed})
        return {'region':region, 'width':width, 'height':height, 'count':count, 'extra':extra,
                'layout':layout, 'trial':trial, 'scales':state['scales'], 'modelSizeAndRoster':fingerprint(state['roster']),
                'pose':fingerprint(state['pose']), 'readyMs':state['readyMs'], 'settings':state['settings'],
                'sources':hashes, 'sample':sample, 'inputs':inputs, 'pageErrors':errors, 'inPlaceGainSweep':sweeps}
    finally:
        await context.close()

async def run(args):
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.resume and args.out.is_file():
        data = json.loads(args.out.read_text())
        for key,value in [('engine',args.engine),('seconds',args.seconds),('inputAttempts',args.inputs)]:
            assert data[key] == value
    else:
        data = dict(engine=args.engine, host=platform.system(), cpu=sorted(os.sched_getaffinity(0)),
                    seconds=args.seconds, inputAttempts=args.inputs, rows=[])
    complete = {(r['region'],r['width'],r['count'],r['extra'],r['layout'],r['trial']) for r in data['rows']}
    async with async_playwright() as pw:
        exe = os.getenv('CHROMIUM_PATH','/usr/bin/chromium') if args.engine=='chromium' else os.getenv('WEBKIT_PATH')
        browser = await getattr(pw,args.engine).launch(executable_path=exe)
        data['version'] = browser.version
        for trial in range(args.repeat):
            for region,width,count in args.scene:
                # Interleave layouts at each level. Reverse on even/odd passes.
                levels = list(args.extra)
                if trial % 2:
                    levels.reverse()
                for index,extra in enumerate(levels):
                    layouts = list(args.layout)
                    if (index+trial) % 2:
                        layouts.reverse()
                    for layout in layouts:
                        key = (region,width,count,extra,layout,trial)
                        if key in complete:
                            continue
                        row = await measure(browser,args,(region,width,count),extra,layout,trial)
                        data['rows'].append(row)
                        temp = args.out.with_suffix('.part')
                        temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
                        temp.replace(args.out)
                        s = row['sample']
                        print(region,width,count,extra,layout,round(s['rafHz'],1),round(s['max']),flush=True)
        await browser.close()

def scene_arg(arg):
    region, width, count = arg.split(',')
    if region not in REGIONS or int(width) not in STANDARD_WIDTHS or int(count) not in (1,4,10,20,28):
        raise argparse.ArgumentTypeError('Unknown region, viewport or population')
    return region, int(width), int(count)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://127.0.0.1:8303')
    p.add_argument('--engine',choices=('chromium','webkit'),default='chromium')
    p.add_argument('--scene',type=scene_arg,nargs='+',required=True,help='REGION,WIDTH,RESIDENTS')
    p.add_argument('--extra',type=int,choices=(0,5,10,15,20),nargs='+',default=[0,10,20,5,15])
    p.add_argument('--layout',choices=('fixed','optimized'),nargs='+',default=['fixed','optimized'])
    p.add_argument('--seconds',type=int,default=15)
    p.add_argument('--inputs',type=int,default=4)
    p.add_argument('--repeat',type=int,default=1)
    p.add_argument('--resume',action='store_true')
    p.add_argument('--sweep',action='store_true',help='After the +0 fixed sample, change gains on the same running household')
    p.add_argument('--out',type=Path,required=True)
    asyncio.run(run(p.parse_args()))
