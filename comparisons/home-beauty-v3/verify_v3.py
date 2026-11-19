"""Measure the private local comparison build with Playwright; outputs stay local.
python verify_v3.py http://127.0.0.1:8193 ui --engine webkit --out /tmp/ui-v3.json
"""
import argparse
import asyncio
import json
import math
import os
from pathlib import Path
from time import monotonic
from urllib.parse import urlencode

from playwright.async_api import async_playwright

REGIONS = ['forest','sea','snow','city','memory_lake']
MODES = ['current','B','C','D1','D2','D3']
STAGE = '#castStage'

OBSERVE = """()=>{
 const stage=document.getElementById('castStage');
 const state=()=>({paused:stage.dataset.dioramaPaused,visible:document.visibilityState,
   speech:!document.getElementById('speechBubble')?.classList.contains('hidden'),
   choices:!document.getElementById('speechChoices')?.classList.contains('hidden'),
   care:document.getElementById('castResponse')?.dataset.reaction??null,
   lifeCard:!document.getElementById('lifeCardOverlay')?.classList.contains('hidden')});
 const track={speech:new Set(),long:[],state};
 window.beautyMeasure=track;
 if(PerformanceObserver.supportedEntryTypes.includes('longtask')){
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.duration>=100)track.long.push([+e.startTime.toFixed(1),+e.duration.toFixed(1)])}).observe({type:'longtask'});
 }
 const text=document.getElementById('speechText');
 if(text)new MutationObserver(()=>{if(text.textContent.trim())track.speech.add(text.textContent.trim())}).observe(text,{subtree:true,childList:true,characterData:true});
}"""

SAMPLE = """async ms=>{
 const track=window.beautyMeasure,start=performance.now(),s=document.getElementById('castStage'),gaps=[];
 let previous=null,largest={ms:0},largestActive=0,frozen=0;
 const get=()=>JSON.parse(s.dataset.livingMetrics||'{}'),first=get();
 await new Promise(done=>{function tick(now){
   if(previous!==null){const gap=now-previous;gaps.push(gap);
     if(s.dataset.dioramaPaused==='true')frozen+=gap;
     else largestActive=Math.max(largestActive,gap);
     if(gap>largest.ms)largest={ms:+gap.toFixed(1),at:+now.toFixed(1),...track.state()};
   }
   previous=now;if(now-start<ms)requestAnimationFrame(tick);else done();
 }requestAnimationFrame(tick)});
 const end=get(),sum=gaps.reduce((a,b)=>a+b,0); gaps.sort((a,b)=>a-b);
 const long=track.long.filter(x=>x[0]>=start-2&&x[0]<=start+ms+5000);
 return {seconds:+((performance.now()-start)/1000).toFixed(3),count:s.querySelectorAll('[data-diorama-actor]').length,
   internalHz:+end.fps.toFixed(2),rafHz:+(1000*gaps.length/sum).toFixed(2),
   p95:+gaps[Math.floor(.95*gaps.length)].toFixed(1),max:largest,
   longestUnpausedGapMs:+largestActive.toFixed(1),gapsAbove250:gaps.filter(x=>x>=250).length,
   countLongTasks100:long.length,longestTask:long.sort((a,b)=>b[1]-a[1])[0]||null,
   pausedSec:+(frozen/1000).toFixed(2),modelSeconds:+(end.cast.clock-first.cast.clock).toFixed(2),
   moves:end.cast.moves,approaches:end.cast.activities?.approach||0,speech:track.speech.size,
   heapMiB:end.heapBytes?+(end.heapBytes/1048576).toFixed(2):null,canvases:document.querySelectorAll('canvas').length,
   nodes:document.querySelectorAll('*').length,state:track.state()};
}"""

async def drag(page):
    await page.evaluate("""()=>{window.qaPointer=[];
      if(!window.qaMouseListener){window.qaMouseListener=e=>{if(e.buttons===1){const t=e.timeStamp;requestAnimationFrame(()=>qaPointer.push(+(performance.now()-t).toFixed(1)))}};document.addEventListener('pointermove',qaMouseListener,true);}
    }""")
    hit=await page.evaluate("""()=>{const nodes=[...document.querySelectorAll('#castStage [data-diorama-actor]')].sort((a,b)=>parseInt(b.style.zIndex)-parseInt(a.style.zIndex));
     for(const n of nodes){const r=n.getBoundingClientRect();
      for(let v=.4;v<.9;v+=.12)for(let u=.35;u<.7;u+=.1){let x=r.x+r.width*u,y=r.y+r.height*v;
       if(document.elementFromPoint(x,y)?.closest('[data-diorama-actor]')===n)return [x,y];}}
     return null;}""")
    if not hit:return {'pointer':'no visible actor'}
    x,y=hit
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(max(5,min(x+36,await page.evaluate('innerWidth-4'))),y+15,steps=10)
    marker=await page.locator('.diorama-target').is_visible()
    await page.mouse.up()
    await page.wait_for_timeout(100)
    return {'marker':marker,'pointerToNextRAFms':await page.evaluate('qaPointer'),'state':await page.evaluate('beautyMeasure.state()')}

async def run(args):
    results={}
    errors=[]
    missing=[]
    async with async_playwright() as pw:
        engine=getattr(pw,args.engine)
        browser=await engine.launch(**({'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if args.engine=='chromium' else {}))
        def save(k,v):
            results[k]=v
            Path(args.out).write_text(json.dumps({'browser':browser.version,'results':results,'errors':errors,'missing':missing},ensure_ascii=False,separators=(',',':')))
            print(k,str(v)[:180],flush=True)
        async def open_page(width=390,reduced=False):
            c=await browser.new_context(viewport={'width':width,'height':844},device_scale_factor=2,has_touch=True,reduced_motion='reduce' if reduced else 'no-preference')
            p=await c.new_page()
            p.on('pageerror',lambda e:errors.append(str(e)))
            p.on('response',lambda r:missing.append([r.status,r.url]) if r.status>=400 else None)
            return c,p
        async def enter(p,variant,n,region='sea'):
            q=urlencode(dict(region=region,time='evening',weather='rain',season='summer',variant=variant,count=n,speed=1,strength=1))
            await p.goto(args.url.rstrip('/')+'/game/index.html?'+q,wait_until='domcontentloaded')
            await p.wait_for_function("""([r,v,n])=>HomeBeauty?.settings?.variant===v&&document.querySelector('.home-dayparts-fx')?.dataset.region===r&&document.querySelector('#castStage')?.dataset.livingMetrics&&document.querySelectorAll('#castStage [data-diorama-actor]').length===n&&HomeBeauty.paintRect?.height>=innerHeight-1""",arg=[region,variant,n])
            await p.evaluate(OBSERVE)
            await p.wait_for_timeout(500)
        if args.suite=='pixels':
            c,p=await open_page()
            await p.goto(args.url+'/game/home-dayparts.mjs')
            code=Path(__file__).with_name('verify_v3_pixels.mjs').read_text().replace('export async function verifyV3Pixels','async function verifyV3Pixels')
            save('pixels',await p.evaluate('async()=>{'+code+';return verifyV3Pixels()}'))
            await c.close()
        elif args.suite=='load':
            for n in [1,4,28]:
                for v in MODES:
                    c,p=await open_page()
                    await enter(p,v,n)
                    save(f'load/{n}/{v}',await p.evaluate(SAMPLE,6000))
                    await c.close()
        elif args.suite=='soak':
            c,p=await open_page()
            await enter(p,'D3',28)
            # First input before autonomous activity. Further probes are reported separately.
            save('drag/start',await drag(p))
            start=monotonic(); elapsed=0
            for end in sorted(set([30,60,180,args.soak]+list(range(20,args.soak,20)))):
                if end>args.soak:continue
                # End points correspond to wall time; screenshot overhead is outside rAF sampling.
                duration=max(.25,start+end-monotonic())
                r=await p.evaluate(SAMPLE,duration*1000)
                r['wallSeconds']=round(monotonic()-start,2)
                save(f'soak/{end}',r)
                if end in [30,60,180] and args.images:
                    out=Path(args.images);out.mkdir(parents=True,exist_ok=True)
                    await p.screenshot(path=str(out/f'sea-d3-{end}.jpg'),type='jpeg',quality=84)
                if end in [180,400]:save('drag/'+str(end),await drag(p))
            save('text',await p.evaluate('[...beautyMeasure.speech].slice(0,5)'))
            await c.close()
        elif args.suite=='ui':
            for width in [320,375,390,430]:
                c,p=await open_page(width,True)
                await c.add_init_script("if(window===top)localStorage.setItem('naotocchi-save-v1','V3_SENTINEL')")
                await p.goto(args.url+'/?region=sea&count=4&variant=D3',wait_until='domcontentloaded')
                await p.wait_for_function("""()=>{const w=document.querySelector('iframe')?.contentWindow;return w?.document.querySelector('#castStage')?.dataset.livingMetrics&&w.HomeBeauty?.paintRect?.height>=w.innerHeight-1&&w.document.querySelectorAll('[data-diorama-actor]').length===4}""")
                frame=await (await p.query_selector('#home')).content_frame()
                async def shape():
                    return await frame.evaluate("""()=>{const f=document.querySelector('.home-dayparts-fx').getBoundingClientRect(),r=HomeBeauty.paintRect;
                    return {offset:Math.max(...['left','top','width','height'].map(k=>Math.abs(r[k]-f[k]))),
                    reduced:document.querySelector('#castStage').dataset.dioramaReduced,
                    actors:[...document.querySelectorAll('[data-diorama-actor]')].map(n=>[n.dataset.dioramaActor,n.style.translate,n.style.scale])}}""")
                await p.wait_for_timeout(400)
                before=await shape()
                for v in MODES:
                    await p.select_option('#quick-variant',v)
                    await frame.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=v)
                await p.click('#panel-toggle')
                if not await p.locator('#fx-motion').is_visible():await p.click('#effect-detail summary')
                for k in await p.locator('#effects input[data-effect]').evaluate_all('(nodes)=>nodes.map(e=>e.dataset.effect)'):
                    await p.locator('#fx-'+k).uncheck()
                    await frame.wait_for_function('k=>!HomeBeauty.settings.effects[k]',arg=k)
                    await p.locator('#fx-'+k).check()
                for strength in [0,1.5,2]:
                    await p.locator('#strength').evaluate("(e,x)=>{e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}",str(strength))
                    await frame.wait_for_function('x=>Math.abs(HomeBeauty.settings.strength-x)<.01',arg=strength)
                after=await shape()
                assert before['actors']==after['actors'] and after['reduced']=='true' and after['offset']<.1
                assert await p.evaluate("localStorage.getItem('naotocchi-save-v1')")== 'V3_SENTINEL'
                save(f'ui/{width}',{'actorsSame':True,'actors':len(after['actors']),'offset':after['offset'],'reduced':True,'localStorageProtected':True})
                await c.close()
            c,p=await open_page()
            await p.goto(args.url,wait_until='domcontentloaded')
            await p.click('#panel-toggle')
            for r in REGIONS:
                await p.select_option('#region',r)
                await p.wait_for_function("""r=>document.querySelector('#home')?.contentDocument?.querySelector('.home-dayparts-fx')?.dataset.region===r""",arg=r)
                f=await (await p.query_selector('#home')).content_frame()
                for k,options in [('weather',['sunny','cloudy','rain','snow']),('time',['morning','day','evening','night']),('season',['spring','summer','autumn','winter'])]:
                    for val in options:
                        await p.locator(f'[name={k}][value="{val}"]').locator('..').click()
                        await f.wait_for_function('a=>HomeBeauty.settings[a[0]]===a[1]',arg=[k,val])
                save('env/'+r,{'controls':12,'variant':await f.evaluate('HomeBeauty.settings.variant')})
            await c.close()
        await browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('url')
    parser.add_argument('suite',choices=['load','soak','ui','pixels'])
    parser.add_argument('--out',required=True)
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--soak',type=int,default=600)
    parser.add_argument('--images')
    asyncio.run(run(parser.parse_args()))
