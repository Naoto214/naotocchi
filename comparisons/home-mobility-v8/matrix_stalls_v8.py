"""Replay the actual V8 terminal footprints of aged double failures in the native V8 geometry."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode, urlparse

from matrix_worker_v8 import HERE, old

def sample(browser, origin, path):
    raw = path.read_bytes()
    cell = json.loads(raw)
    data = cell['arms']['v8']
    a = data['aged']
    r = a['drag']
    resident = next(x for x in a['final']['residents'] if x['key']==r['key'])
    if resident['ambientStarts'] or not resident['ambientFailures'] or not r['issued'] or r['nativeMotion']['firstNativeFootClock'] is not None:
        return
    case = {'file':path.name, 'sha256':old.digest(raw), 'region':cell['region'],'count':cell['count'],'viewport':data['viewport'],
        'key':r['key'],'agedFeet':a['opening'],'scale':r['scale'],'goal':dict(zip(('x','y'),r['modelGoal']))}
    model = 'home-production-model-mobility-v8.js'
    script_sha = data['hashes'][model]
    w,h = data['viewport']
    ctx = browser.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True,device_scale_factor=2)
    def attach(route):
        response = route.fetch()
        source = response.body()
        old.require(old.digest(source)==script_sha,'live and recorded models differ')
        text = source.decode()
        anchor = '    return {metrics:'
        old.require(text.count(anchor)==1, 'model geometry scope unavailable')
        hook = (HERE/'dual-drag-geometry.js').read_text()
        route.fulfill(response=response,body=text.replace(anchor,hook+'\n'+anchor))
    try:
        ctx.route('**/'+model+'*',attach)
        page = ctx.new_page()
        params = dict(region=case['region'],count=case['count'],time='day',paused=1,ground='on',variant='B',policy='B',layout='optimized',curve='linear',paired=1,compareSplit=0,diagnostics=1)
        page.goto(f'{origin}/game/mobility-v8.html?'+urlencode(params),wait_until='domcontentloaded')
        page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && !!window.scanV7Crowd')
        scanned = page.evaluate('fixture => scanV7Crowd(fixture)',case)
        return {k:case[k] for k in ('file','sha256','region','count','viewport','key')} | dict(modelSha256=script_sha, **scanned)
    finally:
        ctx.close()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--raw',required=True,type=Path)
    p.add_argument('--url',required=True)
    p.add_argument('--out',required=True,type=Path)
    args=p.parse_args()
    old.require(urlparse(args.url).hostname in ('127.0.0.1','localhost'),'expected private local model')
    with old.sync_playwright() as play:
        browser=play.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        try:
            observed = [result for path in sorted(args.raw.rglob('*-*-*.json')) if (result:=sample(browser,args.url.rstrip('/'),path))]
        finally:
            browser.close()
    args.out.write_text(json.dumps(dict(radiiCss=[2,3,4,5,6,7,8,10,12,14,16,18,20,22,24],headingDegrees=3,
        maxShortStraightHelpers=2,minOwnerProgressCss=3,minFingerErrorGainCss=.75,
        exactContactCone=True,results=observed),ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
