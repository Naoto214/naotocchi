"""Exercise the private V6 shell against the embedded real game with Playwright."""
import argparse
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

from verify_v6 import SCENES

SLIDERS={'count':(0,1.5),'size':(.5,2),'speed':(.25,2),'wind':(0,2)}
POSE="""()=>[...document.querySelectorAll('#castStage [data-diorama-actor]')]
  .map(n=>[n.dataset.dioramaActor,n.style.translate,n.style.scale])"""
READY="""region=>window.HomeBeauty?.settings?.region===region && HomeBeauty.paintRect &&
 document.querySelector('.home-dayparts-fx')?.dataset.region===region &&
 document.querySelectorAll('#castStage [data-diorama-actor]').length===4"""
async def main(args):
    async with async_playwright() as pw:
        browser=await getattr(pw,args.engine).launch(**(
           {'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if args.engine=='chromium' else {}))
        result={'browser':browser.version,'engine':args.engine,'widths':{}}
        for width,scene in zip((320,375,390,430),('forest-leaves','forest-petals','snow-night','sea-rain')):
            context=await browser.new_context(viewport={'width':width,'height':844},
                    reduced_motion='reduce',has_touch=True,device_scale_factor=2)
            await context.add_init_script("if(window===top)localStorage.setItem('naotocchi-save-v1','V6_SENTINEL')")
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            await page.goto(args.url+f'/?scene={scene}&count=4&compareSplit=0&variant=E3plus',wait_until='domcontentloaded')
            frame=await (await page.wait_for_selector('#home')).content_frame()
            await frame.wait_for_function(READY,arg=SCENES[scene][0],timeout=120000)
            geometry=await frame.evaluate("""()=>{const a=HomeBeauty.paintRect,b=document.querySelector('.home-dayparts-fx').getBoundingClientRect();
              return Math.max(...['left','top','width','height'].map(k=>Math.abs(a[k]-b[k])))}""")
            assert geometry<.1,geometry
            await frame.wait_for_function("Number(JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').frames)>=15",timeout=60000)
            await frame.evaluate("window.comparisonNodes=[...document.querySelectorAll('#castStage [data-diorama-actor]')]")
            poses=await frame.evaluate(POSE)
            reduced=await frame.locator('#castStage').get_attribute('data-diorama-reduced')
            clock=await frame.evaluate('HomeBeauty.clockSeconds')
            assert reduced=='true',reduced
            presets=await page.locator('[data-scene]').evaluate_all('(ns)=>ns.map(n=>n.dataset.scene)')
            assert set(SCENES)==set(presets),presets
            await page.locator('#panel-toggle').click()
            for key,extremes in SLIDERS.items():
                slider=page.locator('#fall-'+key)
                for value in (*extremes,1):
                    await slider.evaluate("(n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}))}",value)
                    await frame.wait_for_function("([k,v])=>HomeBeauty.settings.fall[k]===v",arg=[key,value])
            regions=await page.locator('#region option').count()
            assert regions==13,regions
            for value in ('E3','E3plus'):
                await page.locator('[name=variant][value="'+value+'"]').locator('..').click()
                await frame.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=value)
            effect=page.locator('#fx-particles')
            if not await effect.is_visible():
                await page.locator('#effect-detail summary').click()
            await effect.uncheck()
            await frame.wait_for_function('!HomeBeauty.settings.effects.particles')
            await effect.check()
            await frame.wait_for_function('HomeBeauty.settings.effects.particles')
            await page.locator('#panel-close').click()
            await page.locator('#split-toggle').click()
            await frame.wait_for_function('HomeBeauty.settings.compareSplit')
            await page.locator('#wipe-handle').press('End')
            await frame.wait_for_function('HomeBeauty.settings.split===.95')
            await page.wait_for_timeout(450)
            same=poses==await frame.evaluate(POSE)
            static=abs(clock-await frame.evaluate('HomeBeauty.clockSeconds'))<1e-8
            same_nodes=await frame.evaluate("comparisonNodes.every(n=>n.isConnected)")
            assert same and static and same_nodes,(poses,await frame.evaluate(POSE),static,same_nodes)
            assert await page.evaluate("localStorage.getItem('naotocchi-save-v1')")=='V6_SENTINEL'
            assert not errors,errors
            result['widths'][width]=dict(scene=scene,geometryOffset=geometry,reduced=True,staticClock=static,
                sameFourActors=same,saveProtected=True,completeSliders=list(SLIDERS),presets=presets,regions=regions,
                splitDrag=.95,toggleParticles=True,errors=errors)
            args.out.write_text(json.dumps(result,ensure_ascii=False,indent=1)+'\n')
            print(width,scene,flush=True)
            await context.close()
        await browser.close()

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--engine',choices=['chromium','webkit'],default='webkit')
    cli.add_argument('--url',default='http://127.0.0.1:8196')
    cli.add_argument('--out',required=True,type=Path)
    asyncio.run(main(cli.parse_args()))
