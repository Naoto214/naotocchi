"""Compare native ground effects at fixed feet, at startup and after eight simulation seconds."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode, urlparse
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
WIDTHS = {320: 568, 375: 812}
SOURCES = {"population-seating.js", "population-policy.js", "home-production-diorama-population.js"}


def compare(base, tested):
    if tested['art'] != base['art'] or tested['props'] != base['props']:
        raise ValueError('Background projection or ground props changed during repaint')
    shift = center = width_error = contact_error = gear_error = 0
    clipped_shadow = clipped_gear = 0
    surfaces, materials, filters = Counter(), Counter(), Counter()
    gain = 1 + tested['gain'] / 100
    for a, b in zip(base['actors'], tested['actors'], strict=True):
        if any(a[k] != b[k] for k in ('key', 'surface', 'material', 'filter')):
            raise ValueError([(k,a[k],b[k]) for k in ('key','surface','material','filter') if a[k]!=b[k]])
        shift = max(shift, math.hypot(a['foot']['x']-b['foot']['x'], a['foot']['y']-b['foot']['y']))
        box = b['box']
        center = max(center, math.hypot(box[0]+box[2]/2-b['foot']['x'], box[1]+box[3]/2-b['foot']['y']))
        width_error = max(width_error, b['formulaError'])
        contact_error = max(contact_error, abs(b['contactWidth'] - gain*a['contactWidth']))
        clipped_shadow += b['shadowClipped']
        surfaces[b['surface'] or 'unmarked'] += 1
        materials[b['material'] or 'none'] += 1
        filters[b['filter']] += 1
    for a, b in zip(base['gear'], tested['gear'], strict=True):
        if a['key'] != b['key']:
            raise ValueError('Equipment identity changed')
        actor = next(c for c in base['actors'] if c['kind'] == a['role'])
        x,y = actor['foot']['x'],actor['foot']['y']
        l,t,w,h = a['box']
        expected = (x+(l-x)*gain, y+(t-y)*gain, w*gain, h*gain)
        gear_error = max(gear_error, *(abs(u-v) for u,v in zip(expected,b['box'])))
        clipped_gear += b['clipped']
    if shift > .001 or width_error > .01 or contact_error > .1 or gear_error > .25:
        raise ValueError(f'Unexpected geometry: foot={shift}, width={width_error}, contact={contact_error}, gear={gear_error}')
    return {'extraPct':tested['gain'], 'residents':len(tested['actors']), 'surfaces':surfaces, 'contacts':materials,
            'computedLightFilters':filters, 'shadowEdgeClips':clipped_shadow, 'gearEdgeClips':clipped_gear,
            'visibleGear':len(tested['gear']), 'groundProps':len(tested['props']),
            'maxFootShiftCssPx':shift, 'maxShadowCenterToFootCssPx':round(center,4),
            'maxInlineShadowWidthErrorPx':round(width_error,5),
            'maxContactWidthScalingErrorCssPx':round(contact_error,5), 'maxGearScalingErrorCssPx':round(gear_error,5)}


def sample(browser, url, region, width, layout, hashes):
    viewport = {'width':width, 'height':WIDTHS[width]-52}
    with browser.new_context(viewport=viewport,is_mobile=True,has_touch=True,device_scale_factor=2,
                             reduced_motion='reduce') as context:
        context.add_init_script(path=HERE.parent/'home-cast-size-v3/geometry_capture.js')
        page = context.new_page()
        scripts = {}
        def observe(response):
            name = Path(urlparse(response.url).path).name
            if name in SOURCES:
                scripts[name] = response
        page.on('response', observe)
        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
        query = urlencode(dict(region=region,count=28,time='day',policy='B',curve='linear',
                               paused=1,layout=layout,variant='B',compareSplit=0,clock=0))
        response = page.goto(url+'/game/population.html?'+query,wait_until='domcontentloaded',timeout=120000)
        if not response.ok:
            raise ValueError(f'Game request failed: {response.status}')
        page.wait_for_function("window.qaLastScene && window.HomeCastTrial?.ready && HomeCastTrial.inspect().length === 28 && window.HomeBeauty?.paintRect?.width && window.NaotocchiHomeViewport?.residentPresentation?.()",timeout=150000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(i=>i.decode().catch(()=>{})))")
        actual = {name:hashlib.sha256(response.body()).hexdigest() for name, response in scripts.items()}
        if actual != hashes:
            raise ValueError(f'Browser loaded a different game build: {actual}')
        probe = (HERE/'ground_probe.js').read_text()
        records = []
        for second in [0,8]:
            if second:
                page.evaluate("""() => {
                  HomeCastTrial.apply({policy:'current',paused:false});
                  for(let i=0;i<80;i++) qaNative.step(.1,{blocked:false,reducedMotion:false});
                  HomeCastTrial.apply({paused:true});
                }""")
            page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
            stage = page.evaluate("() => { const sample = " + probe + """ ;
              const samples={};
              for (const policy of ['current','B','C']) {
                HomeCastTrial.apply({policy,paused:true});
                samples[policy]=sample();
              }
              return samples;
            }""")
            records.extend({'region':region, 'deviceWidth':width, 'innerHeight':viewport['height'],
                            'layout':layout, 'simulationSeconds':second,'repaint':name,
                            **compare(stage['current'],trace)} for name,trace in stage.items())
        return records


def run(args):
    rows = []
    hashes = {name:hashlib.sha256((args.game/name).read_bytes()).hexdigest() for name in sorted(SOURCES)}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
                                             args=['--disable-dev-shm-usage'])
        for width in args.widths:
            for region in args.regions:
                for layout in args.layouts:
                    print(width,region,layout,flush=True)
                    rows.extend(sample(browser,args.url,region,width,layout,hashes))
        version = browser.version
        browser.close()
    report = {'browser':version,'dpr':2,'time':'2026-10-15T03:00:00Z','residentCount':28,
              'openingPolicy':'B','curve':'linear','settledAtSeconds':[0,8],
              'hashes':hashes,
              'rows':rows}
    args.out.write_text(json.dumps(report,indent=2)+'\n')


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--url',default='http://127.0.0.1:8304')
    cli.add_argument('--game',required=True,type=Path)
    cli.add_argument('--out',required=True,type=Path)
    cli.add_argument('--regions',nargs='+',default=['forest','sea','home'])
    cli.add_argument('--widths',nargs='+',type=int,choices=WIDTHS,default=list(WIDTHS))
    cli.add_argument('--layouts',nargs='+',choices=['fixed','optimized'],default=['fixed','optimized'])
    run(cli.parse_args())
