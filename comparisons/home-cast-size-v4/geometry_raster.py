"""Calibrate source-alpha area/height and pair counts with real, masked browser screenshots."""
import argparse
from datetime import datetime,timezone
import importlib.util
import hashlib
import json
from pathlib import Path
import os
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

from geometry_collect import BASE,V3,HEIGHTS
from geometry_pixels import measure

legacy=V3.parent/'home-cast-size-v2'/'verify_geometry.py'
spec=importlib.util.spec_from_file_location('v2_raster',legacy)
v2=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)

def run(a):
    out=json.loads(a.out.read_text()) if a.out.exists() else {'cases':{},'cssAlphaThreshold':96}
    with sync_playwright() as pw:
        kw={'executable_path':os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),'args':['--no-sandbox']} if a.engine=='chromium' else {}
        if a.engine=='webkit' and os.getenv('WEBKIT_PATH'):kw={'executable_path':os.environ['WEBKIT_PATH']}
        b=getattr(pw,a.engine).launch(**kw)
        controller=(a.controller or a.game/'home-production-diorama-population.js').read_bytes()
        source=hashlib.sha256(controller).hexdigest()
        delivery='pinned-response' if a.controller else 'served-response'
        if out['cases'] and (out['engine']!=a.engine or out['browser']!=b.version or out.get('controllerSha256')!=source
                or out.get('controllerDelivery',delivery)!=delivery):
            raise ValueError('Use a separate file per browser and runtime version')
        out.update(browser=b.version,engine=a.engine,controllerSha256=source,controllerDelivery=delivery)
        for recipe in a.fixture:
            if all(recipe+'/'+p in out['cases'] for p in a.policies):continue
            w,reg,n,layout=recipe.split('/');w=int(w);n=int(n)
            ctx=b.new_context(viewport={'width':w,'height':HEIGHTS[w]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
            if a.controller:
                ctx.route('**/home-production-diorama-population.js*',lambda route:route.fulfill(body=controller,content_type='application/javascript'))
            ctx.add_init_script(path=V3/'geometry_capture.js')
            # Cancel the already scheduled game paints after its own ready gate.
            # Playwright screenshot can still schedule its own fresh RAF callbacks.
            ctx.add_init_script('''(() => {
              const original=requestAnimationFrame, pending=new Set();
              window.requestAnimationFrame=fn=>{
                const id=original.call(window,t=>{pending.delete(id);fn(t);});
                pending.add(id);return id;
              };
              window.qaHoldPaint=()=>{for(const id of pending)cancelAnimationFrame(id);pending.clear();};
            })()''')
            page=ctx.new_page()
            page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
            query={'count':n,'region':reg,'clock':0,'paused':1,'time':'day','variant':'B','policy':'B','curve':'linear','layout':layout,'compareSplit':0}
            page.goto(a.url+'?'+urlencode(query),wait_until='domcontentloaded',timeout=120000)
            page.wait_for_function('window.HomeCastTrial?.ready && HomeBeauty.paintRect?.width',timeout=180000)
            page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(img=>img.decode().catch(()=>{})))")
            page.evaluate('''qaHoldPaint();
                const animate=Element.prototype.animate;
                Element.prototype.animate=function(...args) {
                  const a=animate.apply(this,args);a.pause();a.currentTime=0;return a;
                };
                document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});true''')
            page.evaluate((V3/'geometry_snapshot.js').read_text())
            page.evaluate(v2.v1.PROBE)
            for policy in a.policies:
                if recipe+'/'+policy in out['cases']:continue
                page.evaluate('p=>{HomeCastTrial.apply({policy:p,curve:"linear",paused:true});qaHoldPaint();document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})}',policy)
                pose=lambda:page.evaluate('HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth])')
                initial=pose()
                frame=page.evaluate('qaGeometryDump()')
                actors=page.evaluate('qaGeometryActors()');anchors=page.evaluate('qaGeometryAnchors()')
                actual=v2.raster(page,page,actors,anchors)
                if initial!=pose():raise ValueError('Native pose changed during calibration')
                same=page.evaluate('qaGeometryActors()')
                delta=max(abs(x-y) for a,b in zip(actors,same,strict=True) for x,y in zip(a['frame'],b['frame'],strict=True))
                if delta>.01:raise ValueError(f'Image moved {delta} CSS px while isolating raster')
                # These are actual CSS boxes at the selected gain; measure as a
                # no-op rescale to compare with their actual browser raster.
                frame.update(baselineGear=[],gains={'0':{'frames':[a['frame'] for a in frame['actors']],
                    'hits':[[a['key'],None,None,None] for a in frame['actors']],'gear':[]}})
                measure(frame,a.game)
                pix=frame['gains']['0'];res=pix['residents'];sc=pix['scene']
                ordered={a['kind']:v for a,v in zip(frame['actors'],res)}
                nonzero=lambda v:100*v[3]/max(v[1],1)
                from statistics import median
                proj=[ordered['pet'][0],ordered['partner'][0],median(v[0] for a,v in zip(frame['actors'],res) if a['kind']=='companion'),sc[0],
                      100*sc[1]/sc[3],nonzero(ordered['pet']),nonzero(ordered['partner'])]
                result=[actual['hero'],actual['partner'],actual['companions'][1],actual['pairs'],actual['sharedPct'],actual['heroExposedPct'],actual['partnerExposedPct']]
                k=recipe+'/'+policy;out['cases'][k]={'raster':result,'projected':[round(x,4) for x in proj],'frameDrift':delta,
                      'settings':page.evaluate('HomeCastTrial.settings'),'fitRecoveries':page.evaluate("Number(document.querySelector('#castStage').dataset.populationFitRecoveries||0)"),'nativeFeet':[p[1:3] for p in initial]}
                print(a.engine,k,result,flush=True)
                out['columns']=['heroInkHeight','partnerInkHeight','compMedianInkHeight','pairs','overlapPct','heroVisiblePct','partnerVisiblePct']
                a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(out,separators=(',',':'))+'\n')
            ctx.close()
        b.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    p.add_argument('--controller',type=Path);p.add_argument('--engine',choices=['chromium','webkit'],default='chromium');p.add_argument('--fixture',nargs='+',default=['348/forest/19/fixed','375/home/28/optimized'])
    p.add_argument('--policies',nargs='+',choices=['current','A','B','C'],default=['B','C']);run(p.parse_args())
