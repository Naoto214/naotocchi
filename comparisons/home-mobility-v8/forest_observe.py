"""Observe the native forest household and later dispatch one real touch per resident."""
import argparse
import asyncio
import importlib.util
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

HERE = Path(__file__).resolve().parent
previous = importlib.util.spec_from_file_location('forest_v7_observer', HERE.parent/'home-mobility-v7/observe-forest.py')
v7 = importlib.util.module_from_spec(previous)
previous.loader.exec_module(v7)
FOCUS = ('tanuki', 'hamster', 'otter', 'panda', 'sekizou', 'many_tail_fox', 'box')
SEED = """(() => {
  const original=Date,offset=Date.UTC(2026,9,15,3)-original.now();
  window.Date=new Proxy(original,{
    construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[original.now()+offset],newTarget);},
    apply(){return new original(original.now()+offset).toString();},
    get(target,k,receiver){if(k==='now')return ()=>original.now()+offset;return Reflect.get(target,k,receiver);}
  });
  let seed=214;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  window.forestDecisions=[];
})();"""
# Read each foot at the actual request, before another walker can change it.
# No extra path search, DOM read, random draw or movement is made by this hook.
def hook(source):
    anchor='      mobility.result(report,result,actor(key),actors,clock,'
    assert source.count(anchor)==1
    extra="""      if(report.planned&&(source==='drag'||@@IDS@@.includes(key)||
          (typeof earlyKey!=='undefined'&&(earlyKey===key||relief?.ready&&relief.owner===key)))){
        const owner=actor(key);
        globalThis.forestDecisions.push({key,source,clock,accepted:result,goal:[p.x,p.y],retry:!!report.retry,
          selected,early:typeof earlyKey!=='undefined'&&earlyKey===key,
          assisted:typeof relief!=='undefined'&&!!relief?.ready&&relief.owner===key,
          escape:!!owner?.ambientEscape,peers:actors.map(b=>[b.key,b.x,b.y,b.w,b.h,
            b.target?[b.target.x,b.target.y]:null,b.source,b.manualUntil,b.yieldAfter||0,manualGoals.has(b.key),b.yieldFor||null,b.activity])});
      }
"""
    return source.replace(anchor,extra.replace('@@IDS@@',json.dumps(['companion:'+k for k in FOCUS]))+anchor)


async def sample_json(page,expression):
    # Transport one JSON string to avoid a Playwright protocol node per coordinate.
    return json.loads(await page.evaluate('JSON.stringify('+expression+')'))


async def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    filename=args.out/(args.arm+'-forest28.json.gz')
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=args.chromium,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        try:
            ctx=await browser.new_context(viewport={'width':390,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
            await ctx.add_init_script(SEED)
            pg=await ctx.new_page()
            hashes={};errors=[]
            async def inject(route):
                resp=await route.fetch()
                native=await resp.text()
                hashes['model']=v7.digest(native.encode());observed=hook(native);hashes['observed']=v7.digest(observed.encode())
                await route.fulfill(response=resp,body=observed)
            await pg.route(re.compile(r'/home-production-model-mobility-v[678]\.js(?:\?|$)'),inject)
            pg.on('pageerror',lambda err:(errors.append(str(err)),print(args.arm,'pageerror',str(err),flush=True)))
            query=urlencode(dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny'))
            url=args.url.rstrip('/')+'/game/mobility-'+args.arm+'.html?'+query
            await pg.goto(url,wait_until='domcontentloaded',timeout=120000)
            print(args.arm,'loaded',url,hashes,flush=True)
            await pg.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&window.HomeMobilityDiagnostics',timeout=120000)
            opening=await pg.evaluate('HomeDragTrial.opening()')
            assert opening['clock']==0 and len(opening['actors'])==28
            arm=await pg.evaluate('()=>{HomeMobilityDiagnostics.enable();const arm=HomeMobilityDiagnostics.read().arm;HomeCastTrial.apply({paused:false});return arm}')
            assert arm==args.arm,(arm,args.arm)
            assert hashes, 'research hook did not find its native model'
            if args.expected_model:assert hashes['model']==args.expected_model,(hashes,args.expected_model)
            data={'arm':arm,'region':'forest','count':28,'viewport':[390,792],'dpr':2,'browser':browser.version,'url':url,
                  'seed':214,'dateAtNavigation':'2026-10-15T03:00:00Z','timezone':'Asia/Tokyo',
                  'sources':hashes,'opening':opening,'openingSHA256':v7.digest(v7.encode(opening['actors'])),
                  'trajectory':[],'interventions':[],'drags':[],'errors':errors,'startedUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
            start=time.monotonic();ill_since=None;last_care=-1000
            async def care(snapshot,phase):
                nonlocal last_care,ill_since
                wall=time.monotonic()-start
                if 'illness' not in snapshot['currentGateReasons']:
                    ill_since=None
                    return
                if ill_since is None:ill_since=wall
                if wall-ill_since<12 or wall-last_care<35:return
                b=pg.locator('#medicineBtn')
                if await b.is_visible() and await b.is_enabled():
                    try:
                        await b.tap(timeout=4500)
                    except PlaywrightTimeout:
                        # Do not dismiss an overlapping native modal or change game state.
                        data['interventions'].append(dict(phase=phase,wall=wall,clock=snapshot['modelSeconds'],gate=snapshot['currentGateReasons'],action='medicine tap acknowledgement timed out'))
                        last_care=wall
                        return
                    data['interventions'].append(dict(phase=phase,wall=wall,clock=snapshot['modelSeconds'],gate=snapshot['currentGateReasons'],action='actual medicine tap'))
                    last_care=wall
            while True:
                await pg.wait_for_timeout(5000)
                d=await sample_json(pg,'HomeMobilityDiagnostics.read()')
                wall=time.monotonic()-start
                sample=dict(wall=wall,nativeSeconds=d['modelSeconds'],gate=d['currentGateReasons'],
                            visible=await pg.evaluate('document.visibilityState==="visible"&&!HomeCastTrial.settings.paused'),
                            actors=[[a['key'],a['x'],a['y'],a['activity'],a['ambientRequests'],a['ambientPlans'],a['ambientStarts'],a['ambientArrivals'],a['actualDistance'],a['lastMovedAgo']] for a in d['residents']])
                data['trajectory'].append(sample)
                v7.save(args.out/(arm+'-progress.json'),dict(wall=wall,model=d['modelSeconds'],roster=len(d['residents']),gate=sample['gate'],movers=sum(a['ambientStarts']>0 for a in d['residents'])))
                data.update(wallSeconds=wall,baseline=d,events=await sample_json(pg,'HomeMobilityDiagnostics.events()'),decisions=await sample_json(pg,'forestDecisions'))
                v7.save(filename,data)
                assert sample['visible'] and len(d['residents'])==28
                if wall>=args.seconds and d['modelSeconds']>=args.seconds:break
                if wall>=600:break
                await care(d,'autonomy')
            data['baselineDecisions']=len(data['decisions']);data['baselineNative']=d['modelSeconds']
            await pg.evaluate("""()=>{window.forestGestures=[];for(const t of ['pointerdown','pointerup','pointercancel'])
                document.addEventListener(t,e=>forestGestures.push([e.type,e.isTrusted,e.pointerType,e.clientX,e.clientY]),true);}""")
            cdp=await ctx.new_cdp_session(pg)
            for row in opening['actors']:
                key=row[0]
                before=await sample_json(pg,'HomeMobilityDiagnostics.read()')
                try:
                    plan=await asyncio.wait_for(pg.evaluate(v7.POINT_JS,{'key':key}),timeout=12)
                except (TimeoutError, PlaywrightTimeout):
                    # An expression image can be replaced while decode() is pending.
                    # Send a real touch at the recipient's currently displayed body.
                    plan=await pg.evaluate("""key=>{
                        const actor=HomeCastTrial.inspect().find(a=>a.key===key);
                        const box=document.querySelector('[data-diorama-actor="'+CSS.escape(key)+'"] img.character-asset')?.getBoundingClientRect();
                        if(!actor||!box)return null;
                        return {key,down:[box.x+box.width/2,box.y+box.height/2],foot:[actor.foot.x,actor.foot.y],
                          goal:[actor.foot.x+(actor.foot.x<=innerWidth/2?12:-12),actor.foot.y],
                          fallback:'image decode exceeded 12 seconds'};
                    }""",key)
                if not plan:
                    data['drags'].append({'key':key,'skipped':'no visible opaque pixel'})
                    continue
                await pg.evaluate('forestGestures.length=0')
                a,b=plan['down'],plan['goal']
                await v7.gesture(cdp,'touchStart',a)
                for f in (.35,.75,1):
                    await v7.gesture(cdp,'touchMove',[x+(y-x)*f for x,y in zip(a,b)])
                await v7.gesture(cdp,'touchEnd');await pg.wait_for_timeout(1800)
                after=await sample_json(pg,'HomeMobilityDiagnostics.read()')
                issued=[n['key'] for old,n in zip(before['residents'],after['residents']) if n['dragRequests']>old['dragRequests']]
                data['drags'].append(dict(key=key,plan=plan,at=before['modelSeconds'],until=after['modelSeconds'],gateBefore=before['currentGateReasons'],gateAfter=after['currentGateReasons'],
                    events=await pg.evaluate('forestGestures'),selected=await pg.evaluate('HomeCastTrial.inspect().find(x=>x.selected)?.key||null'),issuedKeys=issued))
                data.update(postDrag=after,postDragEvents=await sample_json(pg,'HomeMobilityDiagnostics.events()'),decisions=await sample_json(pg,'forestDecisions'))
                v7.save(filename,data)
                if len(data['drags'])%4==0:print(arm,'touch',len(data['drags']),flush=True)
                await care(after,'touch')
            await pg.wait_for_timeout(12500)
            data.update(postDrag=await sample_json(pg,'HomeMobilityDiagnostics.read()'),postDragEvents=await sample_json(pg,'HomeMobilityDiagnostics.events()'),decisions=await sample_json(pg,'forestDecisions'))
            v7.save(filename,data)
            assert len(data['drags'])==28 and not errors,errors
            print(arm,round(wall,2),round(d['modelSeconds'],2),len(data['decisions']),len(data['drags']),flush=True)
        finally:
            await browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True);p.add_argument('--arm',choices=['v6','v7','v8'],required=True)
    p.add_argument('--expected-model');p.add_argument('--out',type=Path,required=True);p.add_argument('--seconds',type=float,default=305);p.add_argument('--chromium',default='/usr/bin/chromium')
    asyncio.run(run(p.parse_args()))
