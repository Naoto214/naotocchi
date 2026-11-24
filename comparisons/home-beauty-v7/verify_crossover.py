"""Switch the drawing profile in place, keeping the same active game, fixtures, nodes and model clock."""
import argparse
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

from verify_perf import SAMPLE, open_trial


async def main(a):
    async with async_playwright() as pw:
        path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium') if a.engine=='chromium' else os.getenv('WEBKIT_PATH')
        browser=await getattr(pw,a.engine).launch(executable_path=path)
        split=bool(a.split_reference)
        reference='PR568' if split else 'E3plus'
        context,page,errors=await open_trial(browser,a.url,'forest-leaves',a.mode if split else reference,28,
                                             split=split,split_reference=a.split_reference)
        await page.wait_for_timeout(3000)
        await page.evaluate("window.firstNodes=[...document.querySelectorAll('#castStage [data-diorama-actor]')]")
        rows=[]
        for i,mode in enumerate([reference,a.mode,a.mode,reference,a.mode,reference,reference,a.mode]):
            if split:
                await page.evaluate("flag=>window.perfOriginalSplit=flag",mode==reference)
            else:
                await page.evaluate("v=>postMessage({type:'home-beauty-settings',settings:{variant:v}},location.origin)",mode)
                await page.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=mode)
            await page.wait_for_timeout(400)
            row=await page.evaluate(SAMPLE,a.seconds)
            row.update(mode=mode,window=i+1,count=28)
            assert row['cast']==28 and row['natureHz']>0 and not errors
            assert await page.evaluate("firstNodes.every(n=>n.isConnected)")
            rows.append(row)
            a.out.write_text(json.dumps(dict(engine=a.engine,browser=browser.version,affinity=sorted(os.sched_getaffinity(0)),
                url=a.url,split=split,originalModules=a.split_reference,viewport=[390,844],dpr=2,seconds=a.seconds,rows=rows,errors=errors),separators=(',',':'))+'\n')
            print(i+1,mode,round(row['rafHz'],1),round(row['p95'],1),round(row['pausedSec'],1),flush=True)
        await context.close();await browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--mode',choices=['A','B','C'],default='C')
    parser.add_argument('--url',default='http://127.0.0.1:8197')
    parser.add_argument('--split-reference',help='Serve original split compositor modules from this #568 build URL')
    parser.add_argument('--seconds',type=float,default=8)
    parser.add_argument('--out',type=Path,required=True)
    asyncio.run(main(parser.parse_args()))
