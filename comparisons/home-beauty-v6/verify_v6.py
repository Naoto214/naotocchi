"""Measure the running V6 comparison with Playwright, using a fresh fixture each time."""
import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright


SCENES = {
    'forest-leaves': ('forest','day','autumn','sunny'),
    'forest-petals': ('forest','day','spring','sunny'),
    'snow-day': ('snow','day','winter','snow'),
    'snow-night': ('snow','night','winter','snow'),
    'country-leaves': ('countryside','evening','autumn','sunny'),
    'sea-rain': ('sea','day','summer','rain'),
}
MODEL = 'for(let remaining=dt;remaining>1e-8;remaining-=.1)model.step('
WORLD = 'world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();'

INIT = """window.v6Probe={frames:0,passes:0,parts:{},slow:[],at(name,start){
 const now=performance.now(),ms=now-start, p=this.parts[name]??={n:0,total:0,max:0};
 p.n++;p.total+=ms;p.max=Math.max(p.max,ms);
 if(ms>=75)this.slow.push({name,start,ms});
}};"""
READY = """([r,v,n])=>window.HomeBeauty?.settings?.variant===v &&
 document.querySelector('.home-dayparts-fx')?.dataset.region===r &&
 document.querySelectorAll('#castStage [data-diorama-actor]').length===n &&
 HomeBeauty.paintRect?.height>=innerHeight-1"""
SAMPLE = """async seconds=>{
 const cast=document.querySelector('#castStage'), q=window.v6Probe, begin=performance.now(), steps=q.frames,passes=q.passes;
 const initialClock=HomeBeauty.clockSeconds;
 q.parts={};q.slow=[];let last=null,firstDelay=null,paused=0,invitations=0,dialogChecks=0;
 const gaps=[],long=[],clockMarkers=[],poseStart=[...cast.querySelectorAll('[data-diorama-actor]')].map(n=>n.style.translate);
 await new Promise(done=>{function tick(t){
   if(last!==null){
     let delta=t-last;gaps.push(delta);
     if(cast.dataset.dioramaPaused==='true')paused+=delta;
     if(delta>=250)long.push({start:last-begin,end:t-begin,ms:delta,paused:cast.dataset.dioramaPaused});
   }else firstDelay=performance.now()-begin;
   const elapsed=(performance.now()-begin)/1000;
   if(elapsed>=dialogChecks){
     dialogChecks=Math.floor(elapsed)+1;
     const invite=document.querySelector('#companionInviteOverlay'),later=document.querySelector('#companionInviteLaterBtn');
     if(invite&&!invite.classList.contains('hidden')&&invite.getClientRects().length&&later){later.click();invitations++;}
   }
   if(elapsed>=(clockMarkers.length+1)*30)clockMarkers.push([Math.round(elapsed*100)/100,HomeBeauty.clockSeconds]);
   last=t;
   if(t-begin<seconds*1000)requestAnimationFrame(tick);else done();
 }requestAnimationFrame(tick)});
 const elapsed=(performance.now()-begin)/1000;
 const sorted=gaps.slice().sort((a,b)=>a-b), sum=gaps.reduce((a,b)=>a+b,0);
 const slow=q.slow.map(o=>({...o,start:o.start-begin}));
 const poseEnd=[...cast.querySelectorAll('[data-diorama-actor]')].map(n=>n.style.translate);
 return {elapsed,frames:gaps.length,rafHz:gaps.length*1000/sum,p95:sorted[Math.ceil(.95*sorted.length)-1],
   max:sorted.at(-1),over250:long.length,firstDelay,stepHz:(q.frames-steps)/elapsed,natureHz:(q.passes-passes)/elapsed,
   clockDelta:HomeBeauty.clockSeconds-initialClock,clockMarkers,pausedSec:paused/1000,invitations,
   cast:poseEnd.length,moving:poseEnd.filter((v,i)=>v!==poseStart[i]).length,
   visibility:document.visibilityState,phases:q.parts,slow,long};
}"""


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f'Unexpected diagnostic boundary: {old}')
    return text.replace(old,new)


async def instrument(route):
    response = await route.fetch()
    text = await response.text()
    if 'home-production-diorama.js' in route.request.url:
        text = replace_once(text,MODEL,'const probe=window.v6Probe;probe.frames++;const m=performance.now();'+MODEL)
        text = replace_once(text,WORLD,
            "probe.at('model',m);const w=performance.now();"+WORLD.replace('paint();','')+
            "probe.at('world',w);const a=performance.now();paint();probe.at('actors',a);")
    else:
        boundary, = (line.strip() for line in text.splitlines() if line.strip().startswith('composeNature(ctx,t,host,fade,'))
        text = replace_once(text,boundary,"const n=performance.now();"+boundary+
            "window.v6Probe.passes++;window.v6Probe.at('nature',n);")
    await route.fulfill(response=response,body=text)


async def open_trial(browser, root, scene, mode, count, width=390, reduced=False):
    context = await browser.new_context(viewport={'width':width,'height':844},device_scale_factor=2,
        has_touch=True,reduced_motion='reduce' if reduced else 'no-preference')
    await context.add_init_script(INIT)
    for script in ('home-production-diorama.js','home-production-world.mjs'):
        await context.route('**/'+script+'*',instrument)
    page = await context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    region, time, season, weather = SCENES[scene]
    query=urlencode(dict(region=region,variant=mode,count=count,time=time,season=season,weather=weather,
                         strength=1,speed=1,compareSplit=0))
    await page.goto(root+'/game/index.html?'+query,wait_until='domcontentloaded')
    await page.wait_for_function(READY,arg=[region,mode,count],timeout=120000)
    await page.wait_for_function('window.v6Probe.frames>2 && window.v6Probe.passes>0',timeout=120000)
    return context,page,errors


async def drag(page, touch):
    hit=await page.evaluate("""()=>{for(const n of [...document.querySelectorAll('#castStage [data-diorama-actor]')]
      .sort((a,b)=>parseInt(b.style.zIndex)-parseInt(a.style.zIndex))){
      const r=n.getBoundingClientRect();
      for(const v of [.6,.45,.75])for(const u of [.45,.6,.35]){
        const x=r.x+r.width*u,y=r.y+r.height*v;
        if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===n)return [x,y];}}return null;}""")
    if not hit:
        return {'hit':False}
    await page.evaluate("""()=>{window.dragFrames=[];document.addEventListener('pointermove',e=>{
      if(e.buttons===1){const t=e.timeStamp;requestAnimationFrame(()=>dragFrames.push(performance.now()-t));}},true)}""")
    x,y=hit
    dx=24 if x<220 else -24
    if touch:
        client=await page.context.new_cdp_session(page)
        async def send(kind,points):
            await client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
        await send('touchStart',[{'x':x,'y':y,'id':1}])
        for i in range(1,11):
            await send('touchMove',[{'x':x+dx*i/10,'y':y+i,'id':1}])
    else:
        await page.mouse.move(x,y)
        await page.mouse.down()
        await page.mouse.move(x+dx,y+10,steps=10)
    marker=await page.locator('.diorama-target').is_visible()
    if touch:
        await send('touchEnd',[])
        await client.detach()
    else:
        await page.mouse.up()
    await page.wait_for_timeout(150)
    return {'hit':True,'marker':marker,'pointerToNextCallbackMs':await page.evaluate('dragFrames')}


async def main(a):
    result={'engine':a.engine,'suite':a.suite,'at':datetime.now(timezone.utc).isoformat(),
            'viewport':[390,844],'dpr':2,'affinity':sorted(os.sched_getaffinity(0)),
            'url':a.url,'conditions':SCENES,'seconds':a.seconds,'rows':[]}
    if a.dist:
        result['renderers']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in
                             sorted((a.dist/'game'/'beauty').glob('*.mjs'))}
    a.out.parent.mkdir(exist_ok=True,parents=True)
    async with async_playwright() as pw:
        browser=await getattr(pw,a.engine).launch(**(
            {'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if a.engine=='chromium' else {}))
        result['browser']=browser.version
        for i,n in enumerate(a.counts):
            for j,scene in enumerate(a.scenes):
                modes=a.modes if (i+j)%2==0 else list(reversed(a.modes))
                for mode in modes:
                    context,page,errors=await open_trial(browser,a.url,scene,mode,n)
                    await page.wait_for_timeout(a.warmup*1000)
                    row=await page.evaluate(SAMPLE,a.seconds)
                    assert row['cast']==n and row['stepHz']>0 and row['natureHz']>0 and row['visibility']=='visible',row
                    if a.suite=='touch':
                        row['drag']=await drag(page,a.engine=='chromium')
                    row.update(scene=scene,mode=mode,count=n,errors=errors)
                    await context.close()
                    result['rows'].append(row)
                    a.out.write_text(json.dumps(result,ensure_ascii=False,indent=1)+'\n')
                    print(scene,n,mode,'rAF %.1f, P95 %.1f, max %.1f, model steps %.1f, nature %.1f; errors %s'%
                          (row['rafHz'],row['p95'],row['max'],row['stepHz'],row['natureHz'],errors),flush=True)
                    assert not errors,errors
        await browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('suite',choices=['load','touch'])
    parser.add_argument('--url',default='http://127.0.0.1:8196')
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--scenes',choices=SCENES,nargs='+',default=list(SCENES))
    parser.add_argument('--modes',choices=['E3','E3plus'],nargs='+',default=['E3','E3plus'])
    parser.add_argument('--counts',nargs='+',type=int,choices=[1,4,28],default=[1,4,28])
    parser.add_argument('--seconds',type=float,default=8)
    parser.add_argument('--warmup',type=float,default=2)
    parser.add_argument('--dist',type=Path)
    parser.add_argument('--out',type=Path,required=True)
    asyncio.run(main(parser.parse_args()))
