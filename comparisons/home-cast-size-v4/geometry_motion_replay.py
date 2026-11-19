"""Compare cached fixed-timestep sampling with unmodified native movement in a fresh game."""
import argparse
import hashlib
from datetime import datetime,timezone
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from geometry_collect import V3,read

def run(a):
    captured=read(a.fixture);info=captured['fixture'];tr,=captured['trajectories']
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        if b.version!=tr['browser']:raise ValueError('Use the same browser build as the captured trajectory')
        ctx=b.new_context(viewport={'width':info['width'],'height':info['height']},has_touch=True,is_mobile=True,device_scale_factor=2)
        # This hook exposes the native model; qaStepGeometry is never installed.
        ctx.add_init_script(path=V3/'geometry_capture.js')
        if a.controller:
            source=a.controller.read_bytes()
            if hashlib.sha256(source).hexdigest()!=captured['source']['home-production-diorama-population.js']:
                raise ValueError('The supplied controller must match the recorded native geometry exactly')
            ctx.route('**/home-production-diorama-population.js*',lambda route:route.fulfill(body=source,content_type='application/javascript'))
        page=ctx.new_page()
        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
        l,c,p=tr['conditions'][0].split('/')
        page.goto(a.url+'?'+urlencode({'clock':0,'paused':1,'time':'day','variant':'B','compareSplit':0,'region':info['region'],
            'count':info['count'],'layout':l,'curve':c,'policy':p}),wait_until='domcontentloaded',timeout=120000)
        page.wait_for_function('window.qaLastScene && window.HomeCastTrial?.ready',timeout=150000)
        result={'browser':b.version,'fixture':info,'source':captured['source'],'phases':[]}
        for steps,t,reference in zip((0,80,220),(0,8,30),tr['phases'],strict=True):
            actual=page.evaluate('''steps=>{
              HomeCastTrial.apply({policy:'current',curve:'linear',paused:true});
              if(steps){HomeCastTrial.apply({paused:false});
                for(let i=0;i<steps;i++)qaNative.step(.1,{blocked:false,reducedMotion:false});
                HomeCastTrial.apply({paused:true});}
              return {native:HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth]),metrics:qaNative.metrics()};
            }''',steps)
            expected=[[actor['key'],*actor['native'],actor['depth']] for actor in reference['actors']]
            assert [r[0] for r in expected]==[r[0] for r in actual['native']]
            max_delta=max(abs(x-y) for row1,row2 in zip(actual['native'],expected) for x,y in zip(row1[1:],row2[1:]))
            result['phases'].append(dict(seconds=t,maxNativeOrDepthDelta=max_delta,metricsEqual=actual['metrics']==reference['modelStats'],
                cachedDistance=reference['modelStats']['distance'],uncachedDistance=actual['metrics']['distance']))
            print(t,max_delta,result['phases'][-1]['metricsEqual'],flush=True)
        a.out.write_text(json.dumps(result,separators=(',',':'))+'\n');b.close()
        if any(p['maxNativeOrDepthDelta']>1e-6 or not p['metricsEqual'] for p in result['phases']):
            raise ValueError('Cached and uncached native trajectories differed')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('fixture',type=Path);p.add_argument('out',type=Path);p.add_argument('--controller',type=Path);run(p.parse_args())
