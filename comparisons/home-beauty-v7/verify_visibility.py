"""Exercise the page visibility handler with an injected document state transition."""
import argparse
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

from verify_perf import open_trial


async def main(a):
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        ctx,page,errors=await open_trial(browser,a.url,'forest-leaves','B',28)
        await page.evaluate("""()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
            document.dispatchEvent(new Event('visibilitychange'));}""")
        probe="""()=>({steps:perfProbe.frames,paints:perfProbe.passes,clock:HomeBeauty.clockSeconds,
            blocked:document.querySelector('#castStage').dataset.dioramaPaused,cast:document.querySelectorAll('#castStage [data-diorama-actor]').length})"""
        before=await page.evaluate(probe);await page.wait_for_timeout(1250);after=await page.evaluate(probe)
        assert before==after and after['blocked']=='true' and after['cast']==28,(before,after)
        await page.evaluate("""()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));}""")
        await page.wait_for_function('prev=>perfProbe.passes>prev.paints && perfProbe.frames>prev.steps && HomeBeauty.clockSeconds>prev.clock',arg=after,timeout=15000)
        resumed=await page.evaluate(probe);assert resumed['cast']==28 and not errors
        a.out.write_text(json.dumps(dict(browser=browser.version,syntheticVisibilityChange=True,hiddenWaitMs=1250,before=before,after=after,resumed=resumed,errors=errors),indent=1)+'\n')
        print('28-resident update, background paint and clock suspended under synthetic hidden state and resumed.')
        await ctx.close();await browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:8197');p.add_argument('--out',type=Path,required=True)
    asyncio.run(main(p.parse_args()))
