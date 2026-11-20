"""Send a trusted tap and drag after 180 seconds of ordinary, uninterrupted home play."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import time
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright
import measure_input as measure


def aged(variant,origin,out,keep_home_open=False):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        ctx=browser.new_context(viewport={'width':390,'height':792},is_mobile=True,has_touch=True,device_scale_factor=2)
        page=ctx.new_page();errors=[];hashes={}
        def route(req):
            response=req.fetch()
            name=Path(req.request.url.split('?')[0]).name
            src=response.text()
            hashes[name]=hashlib.sha256(src.encode()).hexdigest()
            body=measure.patch_source(name,src)
            if 'production-model' in name:
                needle='qa.log.steps.push('
                body=measure.once(body,needle,"qa.log.firstFootWall??=performance.now();qa.log.lastFootWall=performance.now();"+needle)
            req.fulfill(response=response,body=body)
        for pattern in ('*production-model*.js*','*production-diorama*.js*','*route-navigation*.mjs*','*population-beauty.js*','script-v2*.js*','drag-trial-hooks.js*'):
            ctx.route('**/'+pattern,route)
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        try:
            params=dict(region='forest',count=4,time='day',paused=1,ground='on',variant='B',policy='B',layout='optimized',curve='linear',compareSplit=0,paired=1)
            page.goto(origin.rstrip('/')+'/game/drag-'+variant+'.html?'+urlencode(params),wait_until='domcontentloaded',timeout=120000)
            page.wait_for_function('!!window.HomeDragTrial?.opening()',timeout=120000)
            page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
            probe=(measure.V5/'touch_probe.js').read_text()
            # The live trial plans from the current feet without restoring, repainting,
            # pausing, reseating or clearing any native/cosmetic state at input time.
            probe=measure.once(probe,'qa.manual=true;\n    qa.restore();qa.paint();qa.live=live;qa.autonomy=autonomy;',
                                     'qa.live=live;qa.autonomy=autonomy;')
            probe=measure.once(probe,'qa.log=null;qa.manual=true;','qa.log=null;')
            page.evaluate(probe)
            page.evaluate((measure.HERE/'input_probe.js').read_text())
            page.evaluate("""() => {
              const q=touchQA;
              q.agedTransitions=[];
              document.addEventListener('visibilitychange',()=>q.agedTransitions.push([performance.now(),document.visibilityState]));
              document.querySelector('#castStage').addEventListener('naotocchi:home-reaction',e=>{
                if(q.log&&e.detail.actor?.key===q.key&&e.detail.type==='arrive'&&e.detail.source==='drag')
                  (q.log.wallArrivals||=[]).push({wall:performance.now(),position:q.position()});
              });
              q.ageStart=performance.now();q.manual=false;HomeCastTrial.apply({paused:false});
            }""")
            opening=page.evaluate('HomeDragTrial.opening()')
            def sample():
                return page.evaluate("""() => ({wallMs:performance.now()-touchQA.ageStart,visible:document.visibilityState,
                  paused:HomeCastTrial.settings.paused,beautySeconds:HomeBeauty.clockSeconds,
                  model:touchQA.model.metrics(),gate:touchQA.gates(),feet:touchQA.opening()})""")
            samples=[sample()]
            start=time.monotonic()
            prompts=[]
            if keep_home_open:
                next_sample=60
                while time.monotonic()-start<360:
                    elapsed=time.monotonic()-start
                    if page.locator('#companionInviteLaterBtn').is_visible():
                        before=sample()
                        page.locator('#companionInviteLaterBtn').tap(timeout=5000)
                        prompts.append(dict(button='companionInviteLaterBtn',atMs=before['wallMs'],modelClock=before['model']['clock'],
                                            overlays=before['gate']['visibleOverlays']))
                    if elapsed>=next_sample:
                        samples.append(sample());next_sample+=60
                    if elapsed>=181:
                        current=sample()
                        if current['model']['clock']>=181 and not current['gate']['blocked']:
                            samples.append(current);break
                    page.wait_for_timeout(800)
                else:
                    samples.append(sample())
            else:
                for seconds in (60,120,181):
                    time.sleep(max(0,seconds-time.monotonic()+start));samples.append(sample())
            assert samples[-1]['wallMs']>=180000 and all(not s['paused'] and s['visible']=='visible' for s in samples)
            assert samples[-1]['model']['clock']>samples[0]['model']['clock'] and samples[-1]['beautySeconds']>samples[0]['beautySeconds']
            cdp=ctx.new_cdp_session(page)
            tap=page.evaluate("touchQA.prepare({index:0,kind:'tap',live:true,autonomy:true})")
            tap_gate=page.evaluate('touchQA.gates()')
            page.touchscreen.tap(*tap['start'])
            tap_result=page.evaluate('touchQA.result()')
            drag=page.evaluate("touchQA.prepare({index:0,kind:'clear',live:true,autonomy:true})")
            kind='clear'
            if drag.get('skip'):
                drag=page.evaluate("touchQA.prepare({index:0,kind:'historical',live:true,autonomy:true})")
                kind='historical'
            gate=page.evaluate('touchQA.gates()')
            measure.old.send(page,cdp,drag['start'],drag['goal'],kind)
            at_release=page.evaluate('touchQA.demand()')
            page.wait_for_timeout(700);early=page.evaluate('({foot:touchQA.position(),state:touchQA.demand(),wall:performance.now()})')
            # A soft gate can service a saved release after the UI unblocks.
            end=time.monotonic()+35
            while time.monotonic()<end:
                ready=page.evaluate("""() => (!!touchQA.log.wallArrivals?.length&&!touchQA.demand().target)||
                  (touchQA.model.metrics().clock-touchQA.beginClock>=12.35)||
                  (!touchQA.waiting()&&!touchQA.demand().pending&&!touchQA.log.directRequests?.length)""")
                if ready:break
                page.wait_for_timeout(150)
            final=page.evaluate('({demand:touchQA.demand(),wall:performance.now(),result:touchQA.result(),gate:touchQA.gates(),visibility:touchQA.agedTransitions})')
            r=final['result']
            up=next(e[5] for e in r['pointers'] if e[0]=='pointerup')
            assert tap_result['pointers'] and all(e[1:3]==['touch',True] for e in tap_result['pointers']+r['pointers'])
            goal=[drag['modelGoal'][k] for k in ('x','y')]
            distance=lambda a,b:round(math.hypot(*[(x-y)*s for x,y,s in zip(a,b,drag['scale'])]),3)
            arrivals=r.get('wallArrivals',[]);plans=r['plans']
            proof=bool(r['steps'] and plans and not final['demand']['target'] and distance(r['end'],plans[-1]['chosen'])<=.01)
            data=dict(schema=1,engine='chromium',browser=browser.version,region='forest',count=4,width=390,height=792,arm=variant,
                keepHomeOpen=keep_home_open,prompts=prompts,ageAtInputMs=samples[-1]['wallMs'],opening=opening,hashes=hashes,samples=samples,visibility=final['visibility'],
                tap={'plan':tap,'gate':tap_gate,'events':tap_result['pointers'],'selected':tap_result['selected'],'feedback':tap_result.get('visualDown'),'times':tap_result.get('inputTimes')},
                drag={'plan':drag,'gate':gate,'atRelease':at_release,'early':early,'finalState':final['demand'],'endGate':final['gate'],
                      'events':r['pointers'],'phaseTiming':r.get('inputTimes'),'nativeRequests':r.get('directRequests',[]),'nativePlans':r.get('modelPlans',[]),
                      'selected':r['selected'],'plans':plans,'nativeWallArrivals':arrivals,'reactions':r['reactions'],'steps':r['steps'],
                      'peerWalk':r.get('peerTrace',{}),'unsafeSteps':r['unsafeSteps'],'sweptViolations':r['sweptContactViolations'],
                      'firstStepAfterUpMs':round(r['firstFootWall']-up,2) if r.get('firstFootWall') else None,
                      'arrivalAfterUpMs':round(arrivals[0]['wall']-up,2) if arrivals else None,
                      'lastStepAfterUpMs':round(r['lastFootWall']-up,2) if r.get('lastFootWall') else None,
                      'stationaryAtLastGoal':proof,'finalOriginalErrorCss':distance(r['end'],goal),'end':r['end']},errors=errors)
            if errors:raise ValueError(errors)
            out.mkdir(parents=True,exist_ok=True);path=out/(f'aged-play-{variant}.json' if keep_home_open else f'aged-{variant}.json')
            temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,separators=(',',':'))+'\n');temp.replace(path)
            print(variant,samples[-1]['wallMs'],len(r['steps']),proof,data['drag']['firstStepAfterUpMs'],data['drag']['arrivalAfterUpMs'],flush=True)
        finally:
            ctx.close();browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--origin',default='http://127.0.0.1:8366');p.add_argument('--arm',choices=['v5','v6'],required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--keep-home-open',action='store_true',help='Tap the native Later button on spontaneous invitations and wait for 181 active model seconds.')
    a=p.parse_args();aged(a.arm,a.origin,a.out,a.keep_home_open)
