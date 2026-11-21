"""Observe an uninterrupted visible native home under an explicitly seeded fixture."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from forest_layout import SAVE_KEY, fixture_script, forest_url

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('forest_v9',HERE.parent/'home-mobility-v9/forest_live.py')
v9=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v9)
prior=v9.prior
save=v9.save
replace_once=v9.replace_once
attend_choice=v9.attend_choice


def observe_model(source):
    updated=v9.observe_model(source)
    return replace_once(updated,"planned:report.planned,retry:report.retry,escape:","activity:a.activity,resumed:typeof continuing!=='undefined'&&continuing===key,planned:report.planned,retry:report.retry,escape:")

async def reload_save(browser, args, raw, initial_save):
    saved=json.loads(raw)
    ctx=await browser.new_context(viewport={'width':args.width,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
    try:
        await ctx.add_init_script(prior.SEED.replace('let seed=214;',f'let seed={args.seed};'))
        await ctx.add_init_script('globalThis.forestSavedRaw='+json.dumps(raw)+';')
        page=await ctx.new_page()
        async def load_fixture(route):
            response=await route.fetch()
            changed=fixture_script(await response.text(),args.order,args.seed,saved)
            await route.fulfill(response=response,body=changed)
        await page.route(re.compile(r'/beauty/fixture\.js(?:\?|$)'),load_fixture)
        await page.goto(forest_url(args.url,args.arm,paired=False),wait_until='domcontentloaded',timeout=120000)
        await page.wait_for_function('window.HomeCastTrial?.ready&&HomeCastTrial.inspect().length===28',timeout=120000)
        read=await page.evaluate('(key)=>({saved:JSON.parse(localStorage.getItem(key)),roster:HomeCastTrial.inspect().map(a=>a.key)})',SAVE_KEY)
        loaded=read['saved']
        ids=lambda a:[c['id'] for c in a['companions']]
        assert ids(initial_save)==ids(saved)==ids(loaded) and saved['partner']['id']==loaded['partner']['id']
        assert saved['regionId']==loaded['regionId'] and len(set(read['roster']))==28
        await page.evaluate('HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false})')
        start=time.monotonic();last_progress=start;last_clock=0;last_action=start;care={'care':[]}
        while True:
            await asyncio.sleep(1)
            meter=await prior.sample_json(page,'HomeMobilityDiagnostics.read()')
            clock=meter['modelSeconds'];now=time.monotonic();gates=meter['currentGateReasons']
            assert len(meter['residents'])==28
            if clock>last_clock:last_progress=now;last_clock=clock
            starts=sum(a['ambientStarts'] for a in meter['residents'])
            if (clock>=10 and starts) or clock>=30 or now-start>=100:break
            if now-last_action>=30 and now-last_progress>=30:
                await attend_choice(page,care,now-start,clock,gates)
                if 'illness' in gates:
                    button=page.locator('#medicineBtn')
                    if await button.is_visible() and await button.is_enabled():
                        try:
                            await button.tap(timeout=3500);care['care'].append(dict(clock=clock,action='medicine button tap'))
                        except PlaywrightTimeout:pass
                last_action=now
        return dict(savedSHA256=hashlib.sha256(raw.encode()).hexdigest(),roster=read['roster'],companions=ids(loaded),
            nativeRevisionBefore=saved['lifetime'].get('saveRevision'),nativeRevisionAfter=loaded['lifetime'].get('saveRevision'),
            modelAfter=clock,wallAfter=now-start,ambientStarts=starts,ownDistanceModelPx=sum(a['ambientDistance'] for a in meter['residents']),
            actors=[{'key':a['key'],'ambientStarts':a['ambientStarts'],'ambientDistance':a['ambientDistance']} for a in meter['residents']],
            finalGate=gates,care=care['care'],pairedReset=False)
    finally:
        await ctx.close()

async def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    arm=args.arm
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=args.chromium,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        try:
            ctx=await browser.new_context(viewport={'width':args.width,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
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
                    changed=fixture_script(code,args.order,args.seed)
                else:
                    changed=replace_once(code,'let actorSeed=214;',f'let actorSeed={args.seed};')
                hashes[name]={'source':hashlib.sha256(code.encode()).hexdigest(),'observed':hashlib.sha256(changed.encode()).hexdigest()}
                await route.fulfill(response=resp,body=changed)
            await pg.route(re.compile(r'/(?:home-production-model-mobility-v(?:9|10)(?:-seats|-reference)?\.js|drag-trial-hooks(?:-mobility-v(?:9|10)(?:-seats)?)?\.js|beauty/fixture\.js|population-beauty\.js)(?:\?|$)'),inject)
            pg.on('pageerror',lambda err:errors.append(str(err)))
            url=forest_url(args.url,arm)
            await pg.goto(url,wait_until='domcontentloaded',timeout=120000)
            await pg.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&window.HomeMobilityDiagnostics&&typeof window.forestCheckpoint==="function"',timeout=120000)
            opening=await pg.evaluate('HomeDragTrial.opening()'); initial=await pg.evaluate('forestCheckpoint()')
            assert len(opening['actors'])==28 and opening['clock']==0 and len(hashes)==4,(opening,hashes)
            assert opening['width']==args.width and len({a['key'] for a in initial['actors']})==28
            first_save=await pg.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY)
            initial_save=json.loads(first_save)
            assert len(initial_save['companions'])==26 and initial_save['partner']
            save(args.out/'initial-checkpoint.json',initial)
            save(args.out/'initial-save.json',initial_save)
            version=await pg.evaluate('()=>{HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});return HomeMobilityDiagnostics.read().arm}')
            assert version in (arm,arm.split('-')[0]),(version,arm)
            data=dict(arm=arm,seed=args.seed,width=args.width,order=args.order,choice_deferrals=args.attended,url=url,opening=opening,initial=initial,sources=hashes,browser=browser.version,
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
                    if done:
                        save(args.out/'checkpoint.json',data['checkpoint'])
                        last_save=await pg.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY)
                        save(args.out/'aged-save.json',json.loads(last_save))
                        save(args.out/'restore.json',await reload_save(browser,args,last_save,initial_save))
                if done:break
            assert not errors and max(data['events']['events'],key=lambda e:e['clock'])['clock']<=data['baseline']['modelSeconds']+1e-7
        finally:await browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--arm',required=True)
    p.add_argument('--width',type=int,default=390);p.add_argument('--order',type=int,default=0)
    p.add_argument('--seed',type=int,default=214);p.add_argument('--out',type=Path,required=True);p.add_argument('--seconds',type=float,default=600)
    p.add_argument('--attended',action='store_true',help='After 30 seconds of a stalled native user choice, defer it or answer the visible authored question')
    p.add_argument('--chromium',default='/usr/bin/chromium');asyncio.run(run(p.parse_args()))
