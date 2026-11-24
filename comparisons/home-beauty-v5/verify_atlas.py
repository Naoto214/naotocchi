"""Record the live private game for three effect-clock minutes at each regional preset."""
import argparse
import asyncio
import base64
import io
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
# Keys are the official daypart names. The same three controls can be set by hand.
SCENES = {
    'home': ('evening','autumn','rain'), 'forest': ('day','summer','sunny'),
    'river_lake': ('day','summer','sunny'), 'city': ('night','autumn','rain'),
    'countryside': ('evening','summer','sunny'), 'mountain': ('morning','autumn','cloudy'),
    'snow': ('evening','winter','snow'), 'sea': ('evening','summer','sunny'),
    'jungle': ('day','summer','rain'), 'desert': ('day','summer','sunny'),
    'deepsea': ('day','summer','sunny'), 'star_stop': ('night','winter','sunny'),
    'memory_lake': ('night','summer','sunny'),
}

async def observe(browser, root, region, out, source):
    daytime, season, weather = SCENES[region]
    page = await browser.new_page(viewport={'width':375,'height':730},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    try:
        query=urlencode(dict(region=region,time=daytime,season=season,weather=weather,variant='E3',count=1))
        await page.goto(f'{root}/game/index.html?{query}',wait_until='domcontentloaded')
        await page.wait_for_function("""region=>document.querySelector('.home-dayparts-fx')?.dataset.region===region &&
          HomeBeauty?.paintRect && document.querySelector('#castStage [data-diorama-actor]')""",arg=region,timeout=60000)
        await page.evaluate("()=>window.postMessage({type:'home-beauty-clock',seconds:0,paused:false},location.origin)")
        row=await page.evaluate(source,{'duration':180,'checkpoints':[30,60,180],'active':True})
        row.update(daytime=daytime,season=season,weather=weather,errors=errors)
        row['clockReached']=len(row['records'])==3 and row['records'][-1]['clock']>=180
        for marker in row['records']:
            data=base64.b64decode(marker.pop('image').split(',')[1])
            (out/f"{region}-{marker['checkpoint']}.jpg").write_bytes(data)
        print(region,row['clockReached'],[round(x['changedPercent'],2) for x in row['records']],flush=True)
        return row
    finally:
        await page.close()

def contact_sheet(out,regions,name):
    width,height=130,248
    sheet=Image.new('RGB',(len(regions)*width,(height+20)*3),(28,43,48))
    draw=ImageDraw.Draw(sheet)
    for col,region in enumerate(regions):
        for line,sec in enumerate((30,60,180)):
            path=out/f'{region}-{sec}.jpg'
            if not path.exists():continue
            with Image.open(path) as im:
                im.thumbnail((width,height))
                x,y=col*width,line*(height+20)
                sheet.paste(im,(x+(width-im.width)//2,y))
                draw.text((x+2,y+height),f'{region}  {sec}s',fill='white')
    sheet.save(out/name,'WEBP',quality=83)

async def main(a):
    source=(HERE/'observe_clock.js').read_text()
    a.out.mkdir(parents=True,exist_ok=True)
    results={}
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--no-sandbox','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows'])
        for i in range(0,len(a.regions),a.batch):
            regions=a.regions[i:i+a.batch]
            results.update(zip(regions,await asyncio.gather(*(observe(browser,a.url,r,a.out,source) for r in regions))))
            (a.out/'duration.json').write_text(json.dumps(results,ensure_ascii=False,indent=1)+'\n')
        await browser.close()
    for i in range(0,len(a.regions),5):
        contact_sheet(a.out,a.regions[i:i+5],f'regions-{i+1}.webp')
    assert all(v['clockReached'] and not v['errors'] for v in results.values())

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url');p.add_argument('out',type=Path)
    p.add_argument('--batch',type=int,default=7)
    p.add_argument('--regions',nargs='+',choices=SCENES,default=list(SCENES))
    asyncio.run(main(p.parse_args()))
