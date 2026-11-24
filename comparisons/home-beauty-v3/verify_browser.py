"""Run against a locally served build. Requires Python Playwright plus Chromium.
python verify_browser.py http://127.0.0.1:8193 --out /tmp/home-beauty-check.json
"""
import argparse
import asyncio
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.async_api import async_playwright

parser = argparse.ArgumentParser()
parser.add_argument('url')
parser.add_argument('--out', required=True)
parser.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium')
parser.add_argument('--suite', choices=['load', 'ui', 'soak','fade'], default='load')
parser.add_argument('--sample', type=int, default=6)
parser.add_argument('--soak', type=int, default=120)
args = parser.parse_args()
base = args.url.rstrip('/')
rows = []
errors = []
missing = []

def record(test, result):
    rows.append(dict(test=test, result=result))
    Path(args.out).write_text(json.dumps(dict(engine=args.engine, results=rows, errors=errors, missing=missing), ensure_ascii=False, indent=2))
    print(test, str(result)[:750], flush=True)

SAMPLE = """async ms=>{
 const stage=document.querySelector('#castStage');
 const read=()=>JSON.parse(stage.dataset.livingMetrics||'{}');
 const first=read(), start=performance.now(), gaps=[];
 let last=null;
 await new Promise(done=>{function tick(now){
   if(last!==null)gaps.push(now-last);last=now;
   if(now-start<ms)requestAnimationFrame(tick);else done();
 }requestAnimationFrame(tick)});
 const end=read(), elapsed=performance.now()-start;
 gaps.sort((a,b)=>a-b);
 return {residents:stage.querySelectorAll('[data-diorama-actor]').length,
  variant:window.HomeBeauty?.settings?.variant, seconds:elapsed/1000,
  internalRollingFPS:end.fps, frameCountStart:first.frames,frameCountEnd:end.frames,
  rafHz:1000*gaps.length/gaps.reduce((a,b)=>a+b,0), rafP95ms:gaps[Math.floor(gaps.length*.95)],
  rafMaxMs:gaps.at(-1), heapBytes:end.heapBytes, cast:end.cast,
  nodes:document.querySelectorAll('*').length,panels:document.querySelectorAll('canvas').length};
}"""

async def boot(browser, width=390, reduced=False):
    context=await browser.new_context(viewport=dict(width=width,height=844), device_scale_factor=2,
        reduced_motion='reduce' if reduced else 'no-preference', has_touch=True)
    page=await context.new_page()
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('response',lambda r:missing.append([r.status,r.url]) if r.status>=400 else None)
    return context,page

async def load_game(page, n=4, variant='B', region='sea'):
    q=urlencode(dict(count=n,variant=variant,region=region,weather='rain',time='evening',season='summer',speed=1))
    await page.goto(base+'/game/index.html?'+q, wait_until='domcontentloaded')
    await page.wait_for_function("""([n,r,v])=>document.querySelectorAll('#castStage [data-diorama-actor]').length===n&&
      document.querySelector('.home-dayparts-fx')?.dataset.region===r&&
      window.HomeBeauty?.settings?.variant===v&&document.querySelector('#castStage')?.dataset.livingMetrics""",
      arg=[n,region,variant],timeout=30000)
    await page.wait_for_timeout(700)

async def perf(browser):
    for n in [1,4,28]:
        for variant in ['current','A','B','C']:
            context,page=await boot(browser)
            await load_game(page,n,variant)
            record(f'{n}/{variant}', await page.evaluate(SAMPLE,args.sample*1000))
            await context.close()

async def drag(page):
    await page.evaluate("""()=>{window.pointerSamples=[];document.addEventListener('pointermove',e=>{
     if(e.buttons===1){const ts=e.timeStamp;requestAnimationFrame(()=>pointerSamples.push(performance.now()-ts))}
    },true)}""")
    hit=await page.evaluate("""()=>{let node=document.querySelector('[data-diorama-actor="pet"]')||document.querySelector('[data-diorama-actor]');
     let r=node.getBoundingClientRect();for(let y=r.y+r.height*.65;y<r.bottom;y+=2)for(let x=r.x+r.width*.4;x<r.right;x+=2){
      if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===node)return [x,y]};return null}""")
    if not hit:return dict(hit=False)
    x,y=hit
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+32,y+16,steps=12)
    marker=await page.locator('.diorama-target').is_visible()
    await page.mouse.up()
    await page.wait_for_timeout(300)
    return dict(hit=True, marker=marker, pointerToNextRAFms=await page.evaluate('pointerSamples'))

async def soak(browser):
    context,page=await boot(browser)
    await load_game(page,28,'B')
    await page.evaluate("""()=>{let messages=new Set();window.sampledSpeech=messages;
     let el=document.querySelector('#speechText');if(el)new MutationObserver(()=>{if(el.textContent.trim())messages.add(el.textContent.trim())}).observe(el,{subtree:true,childList:true,characterData:true})}""")
    elapsed=0
    while elapsed<args.soak:
        step=min(20,args.soak-elapsed)
        result=await page.evaluate(SAMPLE,step*1000)
        elapsed+=step
        record(f'soak-{elapsed}',result)
    record('speech',await page.evaluate('[...sampledSpeech].slice(0,5)'))
    await context.close()
    context,page=await boot(browser)
    await load_game(page,1,'B')
    record('drag', await drag(page))
    await context.close()

async def ui(browser):
    for width in [320,375,390,430]:
        context,page=await boot(browser,width,reduced=True)
        await context.add_init_script("if(window===top)localStorage.setItem('naotocchi-save-v1','untouched-sentinel')")
        await page.goto(base+'/?region=sea&variant=B&count=4',wait_until='domcontentloaded')
        await page.wait_for_function("""()=>document.querySelector('#home')?.contentWindow?.HomeBeauty?.settings &&
         document.querySelector('#home').contentDocument.querySelector('.home-dayparts-fx')?.dataset.region==='sea'""")
        child=await (await page.query_selector('#home')).content_frame()
        def shape():
            return child.evaluate("""()=>{let s=document.querySelector('#castStage'),r=document.querySelector('.home-dayparts-fx').getBoundingClientRect();
              return {fx:[r.x,r.y,r.width,r.height],paint:window.HomeBeauty.paintRect,reduced:s.dataset.dioramaReduced,
                actors:[...s.querySelectorAll('[data-diorama-actor]')].map(n=>[n.dataset.dioramaActor,n.style.translate,n.style.scale])}}""")
        await child.wait_for_function("document.body.dataset.homeTinyOverview==='true' && HomeBeauty.paintRect?.height>=innerHeight-1 && document.querySelector('#castStage')?.dataset.livingMetrics")
        await page.wait_for_timeout(400)
        before=await shape()
        assert before['reduced']=='true' and len(before['actors'])==4
        art=before['paint']
        assert max(abs(a-b) for a,b in zip(before['fx'],[art[k] for k in ('left','top','width','height')]))<0.1
        await page.locator('#panel-toggle').click()
        for v in ['current','A','B','C']:
            await page.locator('[name=variant][value="'+v+'"]').locator('..').click()
            await child.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=v)
        await page.locator('[name=variant][value=B]').locator('..').click()
        await page.locator('#effect-detail summary').click()
        for effect in ['water','light','particles','contact']:
            check=page.locator('#fx-'+effect)
            await check.uncheck(force=True)
            await child.wait_for_function('k=>HomeBeauty.settings.effects[k]===false',arg=effect)
            await check.check(force=True)
        after=await shape()
        record(f'{width}/pose', dict(before=before,after=after,identical=before['actors']==after['actors']))
        assert await page.evaluate("localStorage.getItem('naotocchi-save-v1')")== 'untouched-sentinel'
        assert before['actors']==after['actors']
        await context.close()
    context,page=await boot(browser)
    await page.goto(base,wait_until='domcontentloaded')
    await page.locator('#panel-toggle').click()
    for region in ['forest','sea','snow','city','memory_lake']:
        await page.select_option('#region',region)
        await page.wait_for_function("""r=>document.querySelector('#home')?.contentDocument?.querySelector('.home-dayparts-fx')?.dataset.region===r""",arg=region)
        child=await (await page.query_selector('#home')).content_frame()
        for name,values in [('season',['spring','summer','autumn','winter']),('weather',['sunny','cloudy','rain','snow']),('time',['morning','day','evening','night'])]:
            for val in values:
                await page.locator(f'[name={name}][value="{val}"]').locator('..').click()
                await child.wait_for_function('a=>HomeBeauty.settings[a[0]]===a[1]',arg=[name,val])
        record('controls/'+region,await child.evaluate('HomeBeauty.settings'))
    await page.locator('[name=speed][value="0.25"]').locator('..').click()
    await child.wait_for_function("HomeBeauty.settings.speed===.25")
    record('slow',await child.evaluate('HomeBeauty.settings.speed'))
    mask_source=Path(__file__).with_name('verify_masks.mjs').read_text().replace('export async function auditWater', 'async function auditWater')
    record('water-pixels',await child.evaluate('async()=>{'+mask_source+';return auditWater()}'))
    await page.locator('[name=count][value="28"]').locator('..').click()
    await page.wait_for_function("""()=>document.querySelector('#home').contentDocument?.querySelectorAll('[data-diorama-actor]').length===28""")
    await page.locator('#replay').click()
    await page.wait_for_function("""()=>document.querySelector('#home').contentDocument?.querySelectorAll('[data-diorama-actor]').length===28""")
    record('replay',28)
    record('persistent-production-key',await page.evaluate("localStorage.getItem('naotocchi-save-v1')"))
    await context.close()

async def fade(browser):
    context,page=await boot(browser)
    await load_game(page,4,'B','sea')
    await page.evaluate("""()=>{const orig=CanvasRenderingContext2D.prototype.drawImage;
     window.fadeTrace=[];CanvasRenderingContext2D.prototype.drawImage=function(image,...rest){
       if(this.canvas.classList.contains('home-art-canvas')&&image instanceof HTMLCanvasElement){
         const alpha=this.globalAlpha;
         if(alpha<1||fadeTrace.length&&fadeTrace.at(-1).alpha<1)fadeTrace.push({at:performance.now(),alpha});
       }
       return orig.call(this,image,...rest);
     };
     postMessage({type:'home-beauty-settings',settings:{time:'night',season:'winter',weather:'snow'}},location.origin)}""")
    sample=await page.evaluate(SAMPLE,6000)
    trace=await page.evaluate('fadeTrace')
    record('evening-rain-to-night-snow',dict(count=len(trace),first=trace[:1],last=trace[-1:],load=sample))
    assert len(trace)>5 and trace[0]['alpha']<.2 and trace[-1]['alpha']==1
    assert all(a['alpha']<=b['alpha'] for a,b in zip(trace,trace[1:]))
    await context.close()

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if args.engine=='webkit' else pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']))
        try:await {'load':perf,'soak':soak,'ui':ui,'fade':fade}[args.suite](browser)
        finally:
            record('browser',browser.version)
            await browser.close()
if __name__=='__main__':asyncio.run(main())
