"""Reproduce V4 QA against a loopback build with Playwright Chromium or WebKit."""
import argparse
import asyncio
import base64
import io
import json
from pathlib import Path
from urllib.parse import urlencode

from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
REGIONS = ('sea','forest')
MODES = ('D3','E1','E2','E3')
READY = """([r,v,n])=>window.HomeBeauty?.settings?.variant===v &&
    document.querySelector('.home-dayparts-fx')?.dataset.region===r &&
    document.querySelector('#castStage')?.dataset.livingMetrics &&
    document.querySelectorAll('#castStage [data-diorama-actor]').length===n &&
    HomeBeauty.paintRect?.height>=innerHeight-1"""
POSE = """()=>[...document.querySelectorAll('#castStage [data-diorama-actor]')].map(n=>[n.dataset.dioramaActor,n.style.translate,n.style.scale])"""

async def context(browser, width=390, reduced=False):
    return await browser.new_context(viewport={'width':width,'height':844},device_scale_factor=2,
        has_touch=True,reduced_motion='reduce' if reduced else 'no-preference')

async def enter(p,root,r,v,n,observe=False):
    params={'region':r,'variant':v,'count':n,'time':'evening' if r=='sea' else 'day',
            'season':'summer','weather':'sunny','speed':1,'strength':1}
    await p.goto(root+'/game/index.html?'+urlencode(params),wait_until='domcontentloaded')
    await p.wait_for_function(READY,arg=[r,v,n],timeout=45000)
    if observe:
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
  const begin=performance.now(),initial=metrics(),startPaints=bgTransfers,gaps=[];
  let prev=null,firstDelay=null,paused=0;
  await new Promise(done=>{function frame(now){
    if(prev===null)firstDelay=performance.now()-begin;
    else{gaps.push(now-prev);if(cast.dataset.dioramaPaused==='true')paused+=now-prev;}
    prev=now;if(now-begin<seconds*1000)requestAnimationFrame(frame);else done();
  }requestAnimationFrame(frame)});
  const elapsed=(performance.now()-begin)/1000, end=metrics(),sum=gaps.reduce((a,b)=>a+b,0);
  gaps.sort((a,b)=>a-b);
  return {elapsed,pairs:gaps.length,firstDelay,rafHz:sum?1000*gaps.length/sum:null,p95:gaps[Math.floor(.95*gaps.length)]??null,
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
    end=min(385,x+36)
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

def filmstrips(data,out,field='image',suffix='continuous'):
    for region in REGIONS:
        montage=Image.new('RGB',(208*4,3*470+24),(26,29,36))
        draw=ImageDraw.Draw(montage)
        for col,v in enumerate(MODES):
            draw.text((col*208+8,5),v,fill='white')
            for row,rec in enumerate(data[region+'/'+v]['records']):
                image=Image.open(io.BytesIO(base64.b64decode(rec.pop(field).split(',')[-1])))
                image.thumbnail((208,445))
                y=24+row*470
                montage.paste(image,(col*208,y))
                draw.text((col*208+5,y+447),f"{rec['checkpoint']} s / delta {rec['changedPercent']:.1f}%",fill='white')
        montage.save(out/(region+'-'+suffix+'.webp'),quality=85,method=4)

async def main(a):
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    results={}; errors=[]; missing=[]
    async with async_playwright() as pw:
        browser=await getattr(pw,a.engine).launch(**({'executable_path':'/usr/bin/chromium','args':[
            '--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows']} if a.engine=='chromium' else {}))
        async def page(c):
            p=await c.new_page()
            p.on('pageerror',lambda exc:errors.append(str(exc)))
            p.on('response',lambda res:missing.append([res.url,res.status]) if res.status>=400 else None)
            return p
        def save():
            (out/(a.suite+'-'+a.engine+'.json')).write_text(json.dumps(
                {'browser':browser.version,'results':results,'errors':errors,'httpErrors':missing},ensure_ascii=False,indent=1))
        if a.suite in ('duration','active'):
            scenes=[]
            for r in REGIONS:
                for v in MODES:
                    c=await context(browser,320)
                    p=await page(c)
                    await enter(p,a.url,r,v,1)
                    scenes.append((r+'/'+v,c,p))
            source=(HERE/'verify_duration.js').read_text()
            async def watch(key,c,p):
                tasks={}
                def checkpoint(k):
                    async def screenshot():
                        jpeg=await p.screenshot(type='jpeg',quality=72,scale='css',timeout=25000)
                        return base64.b64encode(jpeg).decode()
                    tasks[k]=asyncio.create_task(screenshot())
                await p.expose_function('v4Checkpoint',checkpoint)
                await p.evaluate("""()=>window.postMessage({type:'home-beauty-clock',seconds:0,paused:false},location.origin)""")
                results[key]=await p.evaluate(source,{'duration':180,'checkpoints':[30,60,180],'active':a.suite=='active'})
                for rec in results[key]['records']:
                    rec['fullImage']=await tasks[rec['checkpoint']]
            await asyncio.gather(*(watch(*scene) for scene in scenes))
            filmstrips(results,out,suffix='active' if a.suite=='active' else 'continuous')
            filmstrips(results,out,'fullImage','active-home' if a.suite=='active' else 'home')
            save()
            assert all(len(row['records'])==3 for row in results.values()), 'A scene did not reach the 180-second checkpoint.'
        elif a.suite=='conditions':
            c=await context(browser)
            p=await page(c)
            await p.route('**/qa-probe',lambda route:route.fulfill(content_type='text/html',body='<title>V4 conditions</title>'))
            await p.goto(a.url+'/qa-probe')
            results.update(await p.evaluate((HERE/'verify_conditions.js').read_text()))
            save()
            assert len(results)==32 and sum(row['conditions'] for row in results.values())==512
            assert all(row['reducedTemporalDifference']==0 and row['zeroPixels']==0 and row['doubleDifference']>0 for row in results.values())
            await c.close()
        elif a.suite=='matrix':
            for n in (1,4,28):
                for r in REGIONS:
                    for v in MODES:
                        c=await context(browser)
                        p=await page(c)
                        await enter(p,a.url,r,v,n,True)
                        await p.wait_for_timeout(600)
                        row=await p.evaluate(SAMPLE,a.seconds)
                        row['drag']=await exercise_drag(p,a.engine=='chromium')
                        results[f'{r}/{n}/{v}']=row
                        await c.close()
                        save()
                        print(r,n,v,round(row['rafHz'] or 0,1),flush=True)
        elif a.suite=='ui':
            for width in (320,375,390,430):
                for r in REGIONS:
                    c=await context(browser,width,True)
                    await c.add_init_script("if(window===top)localStorage.setItem('naotocchi-save-v1','V4_QA_SENTINEL')")
                    p=await page(c)
                    await p.goto(a.url+'/?'+urlencode(dict(region=r,count=4,variant='E3',clock=5)),wait_until='domcontentloaded')
                    f=await (await p.wait_for_selector('#home')).content_frame()
                    await f.wait_for_function(READY,arg=[r,'E3',4],timeout=45000)
                    await p.wait_for_timeout(350)
                    first=await f.evaluate(POSE)
                    for v in MODES:
                        await p.select_option('#quick-variant',v)
                        await f.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=v)
                    await p.click('#split-toggle')
                    await p.locator('#wipe-handle').press('End')
                    await f.wait_for_function('()=>HomeBeauty.settings.compareSplit&&HomeBeauty.settings.split===.95')
                    await p.locator('#wipe-handle').press('Home')
                    await f.wait_for_function('()=>HomeBeauty.settings.split===.05')
                    await p.click('#split-toggle')
                    await p.click('#panel-toggle')
                    if not await p.locator('#fx-water').is_visible():
                        await p.click('#effect-detail summary')
                    toggles=await p.locator('#effect-detail input[data-effect]:enabled:visible').evaluate_all('(ns)=>ns.map(n=>n.dataset.effect)')
                    for key in toggles:
                        await p.locator('#fx-'+key).uncheck()
                        await f.wait_for_function('k=>!HomeBeauty.settings.effects[k]',arg=key)
                        await p.locator('#fx-'+key).check()
                    for val in [0,1.5,2]:
                        await p.locator('#strength').evaluate("(n,val)=>{n.value=val;n.dispatchEvent(new Event('input',{bubbles:true}))}",str(val))
                        await f.wait_for_function('v=>HomeBeauty.settings.strength===v',arg=val)
                    after=await f.evaluate(POSE)
                    geom=await f.evaluate("""()=>{const r=HomeBeauty.paintRect,box=document.querySelector('.home-dayparts-fx').getBoundingClientRect();
                        return Math.max(...['left','top','width','height'].map(k=>Math.abs(r[k]-box[k])))}""")
                    reduced=await f.locator('#castStage').get_attribute('data-diorama-reduced')
                    frozen=await f.evaluate('HomeBeauty.frozen && HomeBeauty.clockSeconds===5')
                    sentinel=await p.evaluate("localStorage.getItem('naotocchi-save-v1')")
                    assert first==after and geom<.1 and reduced=='true' and frozen and sentinel=='V4_QA_SENTINEL', (first,after,geom,reduced,frozen,sentinel)
                    assert len(toggles)==(10 if r=='sea' else 11),toggles
                    results[f'{width}/{r}']=dict(actors=after,reduced=True,freeze5=True,splitBounds=[.05,.95],offsetPx=geom,toggles=toggles,saveProtected=True)
                    save()
                    await c.close()
        elif a.suite=='drag':
            chosen=a.drag_case
            if not chosen:
                previous=json.loads((out/('matrix-'+a.engine+'.json')).read_text())['results']
                chosen=[key for key,row in previous.items() if not row['drag'].get('marker')]
            for key in chosen:
                r,n,v=key.split('/')
                probes=[]
                for i in range(3):
                    c=await context(browser)
                    p=await page(c)
                    await enter(p,a.url,r,v,int(n),True)
                    await p.wait_for_timeout(600)
                    cadence=await p.evaluate(SAMPLE,a.seconds)
                    await p.evaluate("""()=>{
                      window.downs=[];
                      document.addEventListener('pointerdown',e=>downs.push({
                        target:e.target.id||e.target.nodeName,actor:e.target.closest('[data-diorama-actor]')?.dataset.dioramaActor??null,
                        paused:document.querySelector('#castStage').dataset.dioramaPaused,
                        invite:!document.querySelector('#companionInviteOverlay').classList.contains('hidden')
                      }),true);
                    }""")
                    row=await exercise_drag(p,a.engine=='chromium')
                    row['downs']=await p.evaluate('downs')
                    row['cadence']=cadence
                    probes.append(row)
                    await c.close()
                results[key]=probes
                save()
        elif a.suite=='speed':
            for r in REGIONS:
                c=await context(browser)
                p=await page(c)
                await p.goto(a.url+'/?'+urlencode(dict(region=r,count=1,variant='E3')),wait_until='domcontentloaded')
                f=await (await p.wait_for_selector('#home')).content_frame()
                await f.wait_for_function(READY,arg=[r,'E3',1])
                async def clock_rate():
                    return await f.evaluate("""async()=>{const t=performance.now(),s=HomeBeauty.clockSeconds;
                      await new Promise(resolve=>setTimeout(resolve,2400));return (HomeBeauty.clockSeconds-s)*1000/(performance.now()-t);}""")
                normal=await clock_rate()
                await p.click('#panel-toggle')
                await p.locator('[name=speed][value="0.25"]').locator('..').click()
                await f.wait_for_function('HomeBeauty.settings.speed===.25')
                await p.click('#panel-close')
                slow=await clock_rate()
                assert .58<normal<1.25 and .13<slow<.39,(r,normal,slow)
                await p.click('#split-toggle')
                await p.locator('#wipe-handle').scroll_into_view_if_needed()
                h=await p.locator('#wipe-handle').bounding_box()
                stage=await p.locator('#home').bounding_box()
                x,y=h['x']+.5*h['width'],h['y']+.5*h['height']
                await p.mouse.move(x,y)
                await p.mouse.down()
                await p.mouse.move(stage['x']+.73*stage['width'],y,steps=10)
                await p.mouse.up()
                await f.wait_for_function('()=>HomeBeauty.settings.split>.7 && HomeBeauty.settings.split<.76')
                split=await f.evaluate('HomeBeauty.settings.split')
                await p.click('#panel-toggle')
                counts=[]
                for n in [4,28,1]:
                    await p.locator(f'[name=count][value="{n}"]').locator('..').click()
                    await f.wait_for_function(READY,arg=[r,'E3',n],timeout=45000)
                    counts.append(await f.locator('#castStage [data-diorama-actor]').count())
                results[r]=dict(normalRate=normal,slowRate=slow,draggedBoundary=split,switchedCounts=counts)
                save()
                await c.close()
        elif a.suite=='switch':
            for r in REGIONS:
                for v in MODES:
                    c=await context(browser)
                    p=await page(c)
                    await enter(p,a.url,r,v,4,True)
                    await p.evaluate("""()=>{window.fade=[];const old=CanvasRenderingContext2D.prototype.drawImage;
                      CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
                      if(this.canvas.classList.contains('home-art-canvas')&&img instanceof HTMLCanvasElement&&img.width===this.canvas.width&&img.height===this.canvas.height){
                      const a=this.globalAlpha;if(a<1 || fade.length&&fade.at(-1)[1]<1)fade.push([performance.now(),a]);}return old.call(this,img,...args)};
                      postMessage({type:'home-beauty-settings',settings:{time:'night',weather:'snow',season:'winter'}},location.origin);}""")
                    row=await p.evaluate(SAMPLE,5.5)
                    fade=await p.evaluate('fade')
                    assert len(fade)>5 and fade[0][1]<.3 and fade[-1][1]==1,fade
                    assert all(x[1]<=y[1] for x,y in zip(fade,fade[1:]))
                    results[r+'/'+v]=dict(sample=row,steps=len(fade),observedSeconds=(fade[-1][0]-fade[0][0])/1000)
                    save()
                    await c.close()
        await browser.close()
        assert not errors and not missing,(errors,missing)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('url')
    parser.add_argument('suite',choices=['duration','active','ui','matrix','switch','conditions','speed','drag'])
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--seconds',type=float,default=6)
    parser.add_argument('--drag-case',action='append',help='Optional region/count/variant for repeated input diagnosis.')
    parser.add_argument('--out',type=Path,default=HERE/'evidence')
    asyncio.run(main(parser.parse_args()))
