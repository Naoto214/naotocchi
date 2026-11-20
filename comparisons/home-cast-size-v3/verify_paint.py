"""Measure actual browser layout, paint and raster in a running 28-resident household."""
import argparse
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright
from verify_performance import PROFILE, instrument, v1


async def main(args):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        context = await browser.new_context(viewport={'width':320,'height':516},device_scale_factor=2,has_touch=True)
        await context.add_init_script(PROFILE)
        hashes = {}
        async def hook(route):
            await instrument(route, hashes)
        for pattern in ['**/home-production-diorama*.js*','**/home-production-world*.mjs*','**/home-production-model.js*']:
            await context.route(pattern,hook)
        page = await context.new_page()
        await page.goto(args.url.rstrip('/')+'/game/limit.html?count=28&region=forest&time=day&season=autumn&weather=sunny&variant=B&compareSplit=0&extra=0&layout=fixed&paused=0')
        await page.wait_for_function('HomeCastTrial.ready && !!loadProbe.parts.nature && HomeCastTrial.inspect().length===28',timeout=120000)
        client = await context.new_cdp_session(page)
        order = [0,20,10,5,15,15,5,10,20,0]
        await client.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing,cc,benchmark,disabled-by-default-devtools.timeline','transferMode':'ReturnAsStream'})
        rows = []
        for i,extra in enumerate(order):
            await page.evaluate('n=>HomeCastTrial.apply({extra:n})',extra)
            await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            await page.evaluate('(i)=>performance.mark("cast-window-"+i+"-start")',i)
            sample = await page.evaluate(v1.SAMPLE,args.seconds)
            await page.evaluate('(i)=>performance.mark("cast-window-"+i+"-end")',i)
            assert sample['rows']==28 and sample['sameNodes'] and sample['pausedSec']==0
            rows.append({'extra':extra,'sample':sample})
        traces = await v1.read_compositor_trace(client)
        keyed = {a['window']:a for a in traces}
        for i,row in enumerate(rows):
            row['trace']=keyed['cast-window-'+str(i)+'-start']
        data = {'region':'forest','viewport':[320,568],'gameHeight':516,'DPR':2,'engine':browser.version,
                'cpu':sorted(os.sched_getaffinity(0)),'layout':'fixed','rows':rows,'hashes':hashes}
        args.out.write_text(json.dumps(data,separators=(',',':'))+'\n')
        await browser.close()

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://127.0.0.1:8303')
    p.add_argument('--seconds',default=3,type=int)
    p.add_argument('--out',required=True,type=Path)
    asyncio.run(main(p.parse_args()))
