"""Time a visible native household; observe accepted commands and committed steps without changing either."""
import argparse
import asyncio
import gzip
import hashlib
import importlib.util
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

HERE = Path(__file__).resolve().parent
prior_spec = importlib.util.spec_from_file_location('forest_v8', HERE.parent/'home-mobility-v8/forest_observe.py')
prior = importlib.util.module_from_spec(prior_spec)
prior_spec.loader.exec_module(prior)
MODEL = """
    const forestRecords = {requests:[], motions:[], choices:[]};
    const walkingLeg = new Map();
    function observeRequest(key,p,report,result,source) {
      const a=actor(key), scale=scene.navigation.intentScale;
      const record={clock,key,source,goal:[p.x,p.y],from:[a.x,a.y],accepted:result,
        planned:report.planned,retry:report.retry,escape:!!a.ambientEscape,
        intentRoute:!!a.intentRoute,early:typeof earlyKey!=='undefined'&&earlyKey===key,
        assisted:typeof relief!=='undefined'&&!!relief?.ready&&relief.owner===key,selected,
        scale:[scale.x,scale.y],target:a.target&&[a.target.x,a.target.y],
        route:(a.route||[]).map(p=>[p.x,p.y]),
        peers:actors.map(b=>[b.key,b.x,b.y,b.w,b.h,b.target&&[b.target.x,b.target.y],
          b.source,b.manualUntil,b.yieldAfter||0,manualGoals.has(b.key),b.yieldFor||null,b.activity])};
      forestRecords.requests.push(record);
      if(result && report.planned)walkingLeg.delete(key);
    }
    function observeHop(a,p) {
      let leg=walkingLeg.get(a.key);
      if(!leg||leg.source!==a.source || leg.endClock!==undefined || leg.helperFor!==(a.yieldFor||null)){
        const s=scene.navigation.intentScale;
        leg={key:a.key,source:a.source,escape:a.source==='ambient'&&!!a.ambientEscape,helperFor:a.yieldFor||null,
          startClock:clock,from:[a.x,a.y],last:[a.x,a.y],modelDistance:0,cssDistance:0,
          scale:[s.x,s.y],steps:0};
        if(a.source!=='yield'){
          for(let i=forestRecords.requests.length-1;i>=0;i--){
            const r=forestRecords.requests[i];
            if(r.key===a.key&&r.source===a.source&&r.accepted&&r.planned){leg.request=i;break;}
          }
        }
        walkingLeg.set(a.key,leg);forestRecords.motions.push(leg);
      }
      const dx=p.x-a.x,dy=p.y-a.y;
      leg.modelDistance+=Math.hypot(dx,dy);leg.cssDistance+=Math.hypot(dx*leg.scale[0],dy*leg.scale[1]);
      leg.steps++;leg.lastClock=clock;leg.last=[p.x,p.y];
    }
    function observeEnd(a,status){
      const leg=walkingLeg.get(a.key);if(!leg||leg.source!==a.source)return;
      leg.endClock=clock;leg.status=status;walkingLeg.delete(a.key);
    }
    globalThis.forestLog=()=>forestRecords;
    globalThis.forestCheckpoint=()=>({actors:structuredClone(actors),selected,clock,idleAt,paused,
        stats:structuredClone(stats),cooldown:[...cooldown],seed:globalThis.forestSeed(),
        manualGoals:[...manualGoals],waiting:[...waiting],helpedAt:[...helpedAt],relief:JSON.parse(JSON.stringify(relief,(k,v)=>k==='search'&&v?{inFlight:true}:v)),nextRecovery,earlyKey});
"""
def replace_once(source, anchor, edited):
    if source.count(anchor)!=1: raise ValueError(f'Unexpected number of matches ({source.count(anchor)}): {anchor}')
    return source.replace(anchor,edited)

def observe_model(source):
    source=replace_once(source,'    return {metrics:',MODEL+'    return {metrics:')
    source=replace_once(source,'      mobility.result(report,result,actor(key),actors,clock,','      observeRequest(key,p,report,result,source);\n      mobility.result(report,result,actor(key),actors,clock,')
    source=replace_once(source,'        if(mobility?.enabled)mobility.hop(a,p,clock);','        observeHop(a,p);if(mobility?.enabled)mobility.hop(a,p,clock);')
    source=replace_once(source,"if(a.source==='yield'){if(mobility?.enabled)mobility.arrival(a,clock);","if(a.source==='yield'){observeEnd(a,'arrival');if(mobility?.enabled)mobility.arrival(a,clock);")
    source=replace_once(source,"          if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'","          observeEnd(a,'arrival');if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'")
    source=replace_once(source,'if(mobility?.enabled)mobility.choice(a,name);',"if(mobility?.enabled){mobility.choice(a,name);forestRecords.choices.push([clock,a.key,name]);}")
    return replace_once(source,'        if(!safe){if(mobility?.enabled)mobility.veto(', "        if(!safe){observeEnd(a,'veto');if(mobility?.enabled)mobility.veto(")

def save(path,data):
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
    temp=path.with_suffix('.part')
    temp.write_bytes(gzip.compress(raw,compresslevel=2,mtime=0) if path.suffix=='.gz' else raw)
    temp.replace(path)

async def attend_choice(page, data, wall, clock, reasons):
    # Only explicit deferrals on user-choice panels are eligible. Never drive the
    # actor, end ordinary conversation, skip a tick, choose a personality or wake
    # a sleeping resident. A changed or dismissed panel is rechecked by Playwright.
    options=[]
    if 'dialog' in reasons: options.append(('dialog','#individualityLater','あとで'))
    if 'growth-choice' in reasons: options.append(('growth-choice','#transformSkipBtn','このままでいい'))
    if 'menu' in reasons: options.append(('menu','#companionInviteLaterBtn','またこんど'))
    for reason,selector,label in options:
        button=page.locator(selector)
        if not await button.is_visible() or not await button.is_enabled():continue
        if (await button.inner_text()).strip()!=label:continue
        before=await page.evaluate('HomeMobilityDiagnostics.read().currentGateReasons')
        if reason not in before:continue
        try: await button.tap(timeout=3500); result='trusted native choice deferral'
        except PlaywrightTimeout: result='choice deferral acknowledgement timeout'
        data['care'].append(dict(wall=wall,clock=clock,control=selector,label=label,gate=before,action=result))
        return

async def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    arm=args.arm
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=args.chromium,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        try:
            ctx=await browser.new_context(viewport={'width':390,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
            await ctx.add_init_script(prior.SEED.replace('let seed=214;',f'let seed={args.seed};'))
            pg=await ctx.new_page()
            hashes={}; errors=[]
            async def inject(route):
                resp=await route.fetch()
                code=await resp.text()
                name=route.request.url.split('/')[-1].split('?')[0]
                if 'production-model' in name: changed=observe_model(code)
                elif name.startswith('drag-trial-hooks'):
                    changed=replace_once(code,'let seed = 214;',f'let seed = {args.seed};globalThis.forestSeed=()=>seed;')
                elif name=='fixture.js':
                    changed=replace_once(code,'let seed=214;',f'let seed={args.seed};')
                else:
                    changed=replace_once(code,'let actorSeed=214;',f'let actorSeed={args.seed};')
                hashes[name]={'source':hashlib.sha256(code.encode()).hexdigest(),'observed':hashlib.sha256(changed.encode()).hexdigest()}
                await route.fulfill(response=resp,body=changed)
            await pg.route(re.compile(r'/(?:home-production-model-mobility-v(?:8|9)(?:-seats)?\.js|drag-trial-hooks(?:-mobility-v9-seats)?\.js|beauty/fixture\.js|population-beauty\.js)(?:\?|$)'),inject)
            pg.on('pageerror',lambda err:errors.append(str(err)))
            q=urlencode(dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny'))
            url=args.url.rstrip('/')+'/game/mobility-'+arm+'.html?'+q
            await pg.goto(url,wait_until='domcontentloaded',timeout=120000)
            await pg.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&window.HomeMobilityDiagnostics&&typeof window.forestCheckpoint==="function"',timeout=120000)
            opening=await pg.evaluate('HomeDragTrial.opening()'); initial=await pg.evaluate('forestCheckpoint()')
            assert len(opening['actors'])==28 and opening['clock']==0 and len(hashes)==4,(opening,hashes)
            version=await pg.evaluate('()=>{HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});return HomeMobilityDiagnostics.read().arm}')
            assert version==arm or (arm=='v9-seats' and version=='v9')
            data=dict(arm=arm,seed=args.seed,choice_deferrals=args.attended,url=url,opening=opening,initial=initial,sources=hashes,browser=browser.version,
                      startedUTC=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),trajectory=[],care=[],errors=errors)
            start=time.monotonic();ill_since=None; last_care=-100; last_routine=-100; sample_no=0
            last_clock=0; last_advance=0; last_attended=-100
            print(arm,args.seed,'opening',hashlib.sha256(prior.v7.encode(opening['actors'])).hexdigest(),hashes,flush=True)
            while True:
                await asyncio.sleep(5)
                live=await prior.sample_json(pg,'({d:HomeMobilityDiagnostics.read(),v:document.visibilityState,paused:HomeCastTrial.settings.paused})')
                d=live['d']; wall=time.monotonic()-start
                assert live['v']=='visible' and not live['paused'] and len(d['residents'])==28, (wall,d['currentGateReasons'],len(d['residents']),live['v'])
                clock=d['modelSeconds']; sample_no+=1
                sample=dict(wall=wall,clock=clock,gate=d['currentGateReasons'],visible=live['v'],paused=live['paused'],
                            actors=[[r[k] for k in ('key','x','y','activity','ambientRequests','ambientPlans','ambientStarts','ambientArrivals','actualDistance')] for r in d['residents']])
                data['trajectory'].append(sample)
                if 'illness' in sample['gate']:
                    if ill_since is None: ill_since=wall
                    if wall-ill_since>12 and wall-last_care>35:
                        btn=pg.locator('#medicineBtn')
                        if await btn.is_visible() and await btn.is_enabled():
                            try: await btn.tap(timeout=4500); result='medicine button tap'
                            except PlaywrightTimeout: result='tap acknowledgement timeout'
                            data['care'].append(dict(wall=wall,clock=clock,action=result));last_care=wall
                else:ill_since=None
                # Preserve the living roster with the ordinary game controls on every arm.
                # The buttons and the status labels belong to this disposable game page.
                if wall-last_routine>=35 and not sample['gate']:
                    status=await pg.evaluate("""()=>({
                      waste:Number(document.querySelector('#poopRow')?.getAttribute('aria-label')?.match(/[0-9]+/)?.[0]||0),
                      hunger:Number(document.querySelector('#hungerValue')?.textContent),
                      health:Number(document.querySelector('#healthValue')?.textContent)})""")
                    control='#cleanBtn' if status['waste']>=3 else ('#feedBtn' if status['hunger']<35 else None)
                    if control:
                        btn=pg.locator(control)
                        if await btn.is_visible() and await btn.is_enabled():
                            try: await btn.tap(timeout=3500); result='button tap'
                            except PlaywrightTimeout: result='tap acknowledgement timeout'
                            data['care'].append(dict(wall=wall,clock=clock,control=control,indicators=status,action=result));last_routine=wall
                if clock>last_clock: last_advance=wall;last_clock=clock
                if args.attended and wall-last_advance>=30 and wall-last_attended>=35:
                    await attend_choice(pg,data,wall,clock,sample['gate'])
                    last_attended=wall
                if wall-last_advance>100:
                    print('Native clock gated',wall,clock,sample['gate'],flush=True)
                progress=dict(arm=arm,seed=args.seed,wall=wall,clock=clock,gate=sample['gate'],roster=len(d['residents']))
                save(args.out/'progress.json',progress)
                done=wall>=args.seconds and clock>=args.seconds
                if sample_no%6==0 or done:
                    print(progress,flush=True)
                    # Freeze the cutoff inside one synchronous browser turn. Playback continues afterwards.
                    snap=await prior.sample_json(pg,'({baseline:HomeMobilityDiagnostics.read(),events:HomeMobilityDiagnostics.events(),log:forestLog(),checkpoint:forestCheckpoint()})')
                    data.update(snap,wallSeconds=wall)
                    save(args.out/'forest28.json.gz',data)
                    if done:save(args.out/'checkpoint.json',data['checkpoint'])
                if done:break
            assert not errors and max(data['events']['events'],key=lambda e:e['clock'])['clock']<=data['baseline']['modelSeconds']+1e-7
        finally:await browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--arm',required=True)
    p.add_argument('--seed',type=int,default=214);p.add_argument('--out',type=Path,required=True);p.add_argument('--seconds',type=float,default=600)
    p.add_argument('--attended',action='store_true',help='Use the visible native later/keep control only after 30 seconds of a stalled choice panel')
    p.add_argument('--chromium',default='/usr/bin/chromium');asyncio.run(run(p.parse_args()))
