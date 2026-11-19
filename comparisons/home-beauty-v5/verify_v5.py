"""Measure the local V5 comparison using real game DOM and its two shipped renderers.
python verify_v5.py matrix --url http://127.0.0.1:8195
"""
import argparse
import asyncio
import json
import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from playwright.async_api import async_playwright, TimeoutError as BrowserTimeout

HERE=Path(__file__).resolve().parent
SCENES={
    'home':('evening','autumn','rain'),
    'forest':('day','summer','sunny'),
    'river_lake':('day','summer','sunny'),
    'city':('night','autumn','rain'),
    'countryside':('evening','summer','sunny'),
    'mountain':('morning','autumn','cloudy'),
    'snow':('evening','winter','snow'),
    'sea':('evening','summer','sunny'),
    'jungle':('day','summer','rain'),
    'desert':('day','summer','sunny'),
    'deepsea':('day','summer','sunny'),
    'star_stop':('night','winter','sunny'),
    'memory_lake':('night','summer','sunny'),
}

READY = """([r,v,n])=>window.HomeBeauty?.settings?.variant===v &&
    document.querySelector('.home-dayparts-fx')?.dataset.region===r &&
    document.querySelector('#castStage')?.dataset.livingMetrics &&
    document.querySelectorAll('#castStage [data-diorama-actor]').length===n &&
    HomeBeauty.paintRect?.height>=innerHeight-1"""
ART_READY = READY.replace("document.querySelector('#castStage')?.dataset.livingMetrics &&", "")
POSE = """()=>[...document.querySelectorAll('#castStage [data-diorama-actor]')].map(n=>[n.dataset.dioramaActor,n.style.translate,n.style.scale])"""

async def context(browser, width=390, reduced=False):
    return await browser.new_context(viewport={'width':width,'height':844},device_scale_factor=2,
        has_touch=True,reduced_motion='reduce' if reduced else 'no-preference')

async def enter(p,root,r,v,n,observe=False,published=False):
    daypart,season,weather=SCENES[r]
    params=dict(region=r,variant=v,count=n,time=daypart,season=season,weather=weather,speed=1,strength=1)
    await p.goto(root+'/game/index.html?'+urlencode(params),wait_until='domcontentloaded')
    await p.wait_for_function(READY if published else ART_READY,arg=[r,v,n],timeout=100000)
    if observe:
        await p.wait_for_function('()=>Number.isFinite(window.v5Pulses)',timeout=20000)
        await p.evaluate("""()=>{
          window.bgTransfers=0;
          const old=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
            if(args.length===4 && args[0]===0 && args[1]===0 && image instanceof HTMLCanvasElement &&
               image.width===this.canvas.width && image.height===this.canvas.height && this.canvas.classList.contains('home-art-canvas')) bgTransfers++;
            return old.call(this,image,...args);
          };
        }""")

SAMPLE = """async seconds=>{
  const cast=document.querySelector('#castStage'),metrics=()=>JSON.parse(cast.dataset.livingMetrics||'{}');
  const begin=performance.now(),initial=metrics(),startPaints=bgTransfers,initialSteps=window.v5Pulses,gaps=[];
  let prev=null,firstDelay=null,paused=0;
  const state=()=>({visibility:document.visibilityState,paused:cast.dataset.dioramaPaused,
    dialogs:[...document.querySelectorAll('[role=dialog],dialog')].filter(n=>n.getBoundingClientRect().height>0 &&
      getComputedStyle(n).visibility!=='hidden').map(n=>n.id),actors:cast.querySelectorAll('[data-diorama-actor]').length,
    speech:!document.querySelector('#speechBubble')?.classList.contains('hidden'),clock:HomeBeauty.clockSeconds});
  const startState=state(),longGaps=[];
  await new Promise(done=>{function frame(now){
    if(prev===null)firstDelay=performance.now()-begin;
    else{gaps.push(now-prev);if(cast.dataset.dioramaPaused==='true')paused+=now-prev;
      if(now-prev>=250)longGaps.push({at:(now-begin)/1000,gap:now-prev,state:state()});}
    prev=now;if(now-begin<seconds*1000)requestAnimationFrame(frame);else done();
  }requestAnimationFrame(frame)});
  const elapsed=(performance.now()-begin)/1000, end=metrics(),sum=gaps.reduce((a,b)=>a+b,0);
  gaps.sort((a,b)=>a-b);
  return {startState,endState:state(),longGaps,stepHz:(window.v5Pulses-initialSteps)/elapsed,elapsed,pairs:gaps.length,firstDelay,rafHz:sum?1000*gaps.length/sum:null,p95:gaps[Math.floor(.95*gaps.length)]??null,
    max:gaps.at(-1)??null,cachedBackgroundHz:(bgTransfers-startPaints)/elapsed,internalHz:end.fps??null,
    count:cast.querySelectorAll('[data-diorama-actor]').length,pausedSec:paused/1000,modelSeconds:end.cast?.clock-initial.cast?.clock,
    moves:end.cast?.moves??null,approaches:end.cast?.activities?.approach??null};
}"""

async def exercise_drag(p, chromium):
    await p.evaluate("""()=>{window.pointerDelays=[];
      document.addEventListener('pointermove',e=>{if(e.buttons===1){const t=e.timeStamp;
      requestAnimationFrame(()=>pointerDelays.push(performance.now()-t));}},true);}""")
    hit=await p.evaluate("""()=>{for(const n of [...document.querySelectorAll('#castStage [data-diorama-actor]')].sort((a,b)=>parseInt(b.style.zIndex)-parseInt(a.style.zIndex))){
      const r=n.getBoundingClientRect();for(let v=.4;v<.9;v+=.12)for(let u=.35;u<.7;u+=.1){
      const x=r.x+r.width*u,y=r.y+r.height*v;if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===n)return [x,y];}}return null;}""")
    if not hit:
        return {'error':'no visible actor available for drag'}
    x,y=hit
    end=min(await p.evaluate('innerWidth-4'),x+36)
    if chromium:
        client=await p.context.new_cdp_session(p)
        async def touch(kind,points):
            await client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
        await touch('touchStart',[{'x':x,'y':y,'id':1}])
        for i in range(1,11):
            await touch('touchMove',[{'x':x+(end-x)*i/10,'y':y+1.5*i,'id':1}])
    else:
        await p.mouse.move(x,y)
        await p.mouse.down()
        await p.mouse.move(end,y+15,steps=10)
    marker=await p.locator('.diorama-target').is_visible()
    if chromium:
        await touch('touchEnd',[])
        await client.detach()
    else:
        await p.mouse.up()
    await p.wait_for_timeout(100)
    return {'marker':marker,'pointerToNextRAFms':await p.evaluate('pointerDelays')}

async def count_steps(route):
    # Count each actual accepted frame, including the final fraction between the
    # controller's regular (15-update) metrics publications. Diagnostic response only.
    response=await route.fetch()
    body=await response.text()
    token='frameGaps.push(gap)'
    if body.count(token)!=1:
        raise RuntimeError('Home controller changed; check the update boundary')
    await route.fulfill(response=response,body=body.replace(token,'window.v5Pulses=(window.v5Pulses||0)+1;'+token))

async def fade(p):
    await p.evaluate("""()=>{window.fade=[];
      const old=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
        if(this.canvas.classList.contains('home-art-canvas') && img instanceof HTMLCanvasElement &&
           img.width===this.canvas.width && img.height===this.canvas.height){
          const a=this.globalAlpha;
          if(a<1 || fade.length&&fade.at(-1)[1]<1)fade.push([performance.now(),a]);
        }
        return old.call(this,img,...args);
      };
      postMessage({type:'home-beauty-settings',settings:{
        time:HomeBeauty.settings.time==='night'?'morning':'night',weather:'rain',season:'autumn'}},location.origin);
    }""")
    try:
        await p.wait_for_function('()=>fade.length>3 && fade.at(-1)[1]===1',timeout=20000)
    except BrowserTimeout:
        pass
    trace=await p.evaluate('fade')
    state=await p.evaluate("""()=>({
      pause:document.querySelector('#castStage').dataset.dioramaPaused,
      dialogs:[...document.querySelectorAll('[role=dialog]')].filter(n=>n.getClientRects().length).map(n=>n.id),
      clock:HomeBeauty.clockSeconds,env:HomeBeauty.settings.time,cast:document.querySelectorAll('[data-diorama-actor]').length,
      time:document.querySelector('.home-dayparts-fx')?.dataset?.time
    })""")
    return {'seconds':(trace[-1][0]-trace[0][0])/1000 if trace else None,'frames':len(trace),
            'firstAlpha':trace[0][1] if trace else None,'lastAlpha':trace[-1][1] if trace else None,
            'monotonic':all(a[1]<=b[1] for a,b in zip(trace,trace[1:])),'state':state}

async def run(a):
    now=lambda:datetime.now(timezone.utc).isoformat(timespec='seconds')
    out=Path(a.out);out.parent.mkdir(exist_ok=True,parents=True)
    result={'environment':SCENES,'started':now(),'engine':a.engine,'cpuAffinity':sorted(os.sched_getaffinity(0)),
            'signals':{},'jsErrors':[],'httpErrors':[]}
    if (a.resume or a.refresh) and out.exists():
        result=json.loads(out.read_text())
    batch={'started':now(),'regions':a.regions or 'all','counts':a.counts,'modes':a.modes,'cpuAffinity':sorted(os.sched_getaffinity(0))}
    if a.dist:
        batch['rendererSha256']={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((a.dist/'game'/'beauty').glob('*.mjs'))}
    result.setdefault('batches',[]).append(batch)
    async with async_playwright() as pw:
        browser=await getattr(pw,a.engine).launch(**({'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if a.engine=='chromium' else {}))
        result['browser']=browser.version
        def save():
            result['updated']=now()
            out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
        async def fresh(width=390,reduced=False):
            c=await context(browser,width,reduced)
            await c.route('**/home-production-diorama.js*',count_steps)
            p=await c.new_page()
            p.on('pageerror',lambda e:result['jsErrors'].append(str(e)))
            p.on('response',lambda res:result['httpErrors'].append([res.status,res.url]) if res.status>=400 else None)
            return c,p
        regions=a.regions.split(',') if a.regions else list(SCENES)
        if a.suite=='matrix':
            for n in a.counts:
                for index,r in enumerate(regions):
                    # Alternate acquisition order to avoid always measuring E3 last.
                    modes=('previous','E3') if (index+(n==4))%2==0 else ('E3','previous')
                    for v in modes:
                        if v not in a.modes:
                            continue
                        key=f'{r}/{n}/{v}'
                        if a.resume and not a.refresh and key in result['signals']:
                            continue
                        c,p=await fresh()
                        await enter(p,a.url,r,v,n,True,published=a.engine=='chromium')
                        await p.wait_for_timeout(450)
                        row=await p.evaluate(SAMPLE,a.seconds)
                        assert row['count']==n,(r,v,n,row)
                        row['sampledUpdates']=bool(row['pairs'] and row['stepHz']>0 and row['cachedBackgroundHz']>0)
                        result['signals'][key]=row
                        await c.close();save()
                    print('done',r,n,flush=True)
        elif a.suite=='input-repeat':
            for r in regions:
                for n in a.counts:
                    trials=[]
                    for _ in range(3):
                        c,p=await fresh()
                        await enter(p,a.url,r,'E3',n,True)
                        await p.evaluate("""()=>{window.v5Down=[];
                         document.addEventListener('pointerdown',e=>v5Down.push({
                           target:e.target.id || e.target.nodeName,actor:e.target.closest('[data-diorama-actor]')?.dataset.dioramaActor||null,
                           paused:document.querySelector('#castStage').dataset.dioramaPaused
                         }),true)}""")
                        row=await exercise_drag(p,a.engine=='chromium')
                        row['down']=await p.evaluate('v5Down')
                        trials.append(row)
                        await c.close()
                        result['signals'][f'{r}/{n}']=trials
                        save()
        elif a.suite=='interactions':
            for r,n in [('home',1),('sea',4),('jungle',28),('star_stop',4)]:
                if r not in regions or (a.resume and r in result['signals']):
                    continue
                print('input',r,n,flush=True)
                c,p=await fresh()
                await enter(p,a.url,r,'E3',n,True)
                row={'drag':await exercise_drag(p,a.engine=='chromium')}
                await p.locator('#menuBtn').click()
                await p.locator('#menuOverlay').wait_for(state='visible')
                await p.locator('#dexBtn').click()
                await p.locator('#dexOverlay').wait_for(state='visible')
                await p.locator('#dexCloseBtn').click()
                if await p.locator('#menuOverlay').is_visible():await p.locator('#menuCloseBtn').click()
                await p.locator('#menuOverlay').wait_for(state='hidden')
                await p.wait_for_function("()=>document.querySelector('#castStage').dataset.dioramaPaused==='false'")
                row['menuDexReturn']=True
                await c.close()
                c,p=await fresh()
                await enter(p,a.url,r,'E3',n,True)
                row['fade']=await fade(p)
                print('fade',r,row['fade'],flush=True)
                row['appAfter']=await p.evaluate("""()=>({actors:document.querySelectorAll('[data-diorama-actor]').length,
                  time:HomeBeauty.settings.time,weather:HomeBeauty.settings.weather,season:HomeBeauty.settings.season})""")
                result['signals'][r]=row
                await c.close();save()
        elif a.suite=='widths':
            for width,r in zip((320,375,390,430),('home','river_lake','deepsea','memory_lake')):
                if r not in regions or (a.resume and str(width) in result['signals']):
                    continue
                print('width',width,r,flush=True)
                c,p=await fresh(width,True)
                await c.add_init_script("if(window===top)localStorage.setItem('naotocchi-save-v1','V5_SENTINEL')")
                await p.goto(a.url+'/?'+urlencode(dict(region=r,variant='E3',count=4)),wait_until='domcontentloaded')
                f=await (await p.wait_for_selector('#home')).content_frame()
                await f.wait_for_function(ART_READY,arg=[r,'E3',4],timeout=100000)
                await p.wait_for_timeout(300)
                before=await f.evaluate(POSE)
                available=await p.locator('#region option').evaluate_all('(ns)=>ns.map(n=>n.value)')
                assert set(available)==set(SCENES),available
                compact=not await p.locator('#quick-variant').is_visible()
                if compact:
                    await p.click('#panel-toggle')
                for selected in ('previous','E3'):
                    if compact:
                        await p.locator(f'[name="variant"][value="{selected}"]').locator('..').click()
                    else:
                        await p.select_option('#quick-variant',selected)
                    await f.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=selected)
                if compact:
                    await p.click('#panel-close')
                await p.click('#split-toggle')
                await p.locator('#wipe-handle').press('End')
                await f.wait_for_function('HomeBeauty.settings.compareSplit && HomeBeauty.settings.split===.95')
                await p.click('#split-toggle')
                await p.click('#panel-toggle')
                slider=p.locator('#strength')
                for level in [0,1.5,2]:
                    await slider.evaluate("(n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}))}",str(level))
                    await f.wait_for_function('v=>HomeBeauty.settings.strength===v',arg=level)
                detail=p.locator('#effect-detail')
                if not await detail.evaluate('d=>d.open'):
                    await detail.locator('summary').click()
                fx=await detail.locator('input[data-effect]:enabled:visible').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.effect)')
                assert fx
                for key in fx:
                    await p.locator('#fx-'+key).uncheck()
                    await f.wait_for_function('k=>!HomeBeauty.settings.effects[k]',arg=key)
                    await p.locator('#fx-'+key).check()
                after=await f.evaluate(POSE)
                state=await f.evaluate("""()=>{const r=HomeBeauty.paintRect,b=document.querySelector('.home-dayparts-fx').getBoundingClientRect();return {
                  maxGeometryOffset:Math.max(...['left','top','width','height'].map(k=>Math.abs(r[k]-b[k]))),
                  reduced:document.querySelector('#castStage').dataset.dioramaReduced==='true',clock:HomeBeauty.clockSeconds}}""")
                await p.wait_for_timeout(450)
                state['staticClock']=abs(state['clock']-await f.evaluate('HomeBeauty.clockSeconds'))<1e-8
                state['sameFourActors']=before==after and len(after)==4
                state['saveProtected']=await p.evaluate("localStorage.getItem('naotocchi-save-v1')")== 'V5_SENTINEL'
                state['effects']=fx
                state['regionOptionCount']=len(available)
                assert state['maxGeometryOffset']<.1 and all(state[k] for k in ('reduced','staticClock','sameFourActors','saveProtected')),state
                result['signals'][str(width)]=state
                await c.close();save()
        await browser.close()
        assert not result['httpErrors'] and not result['jsErrors'],result

if __name__=='__main__':
    cli=argparse.ArgumentParser()
    cli.add_argument('suite',choices=['matrix','interactions','widths','input-repeat'])
    cli.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    cli.add_argument('--url',default='http://127.0.0.1:8195')
    cli.add_argument('--regions')
    cli.add_argument('--modes',nargs='+',choices=['previous','E3'],default=['previous','E3'])
    cli.add_argument('--refresh',action='store_true',help='Re-measure this subset in an existing matrix after a renderer update.')
    cli.add_argument('--dist',type=Path,help='Record local build renderer digests in the batch metadata.')
    cli.add_argument('--resume',action='store_true',help='Continue a partial matrix using the same build and settings.')
    cli.add_argument('--counts',nargs='+',type=int,default=[1,4,28])
    cli.add_argument('--seconds',type=float,default=4)
    cli.add_argument('--out',required=True,type=Path)
    asyncio.run(run(cli.parse_args()))
