"""Save matched crops of actual two-entry browser screenshots at one CSS pixel per output pixel."""
import argparse
import io
import os
from pathlib import Path
from urllib.parse import urlencode
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
from verify_visual import instrument, HERE

FONT = os.environ.get('CJK_FONT','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
def font(size): return ImageFont.truetype(FONT,size)
SAMPLES = {'forest-leaves':(2,[1,2.25,3.5]), 'country-leaves':(5,[3,5,7.5])}
LABEL = {'forest-leaves':'もり・秋の昼', 'country-leaves':'いなか・秋の夕'}
MODES = ['E3plus','A','B','C']
TITLE = {'E3plus':'E3+','A':'A','B':'B','C':'C'}
HALF=30
READY='() => window.leafProbe?.geometry?.mode==="cover" && Math.abs(leafProbe.geometry.cssHeight-innerHeight)<1 && !!document.querySelector("[data-diorama-actor]")'

def live_shot(page,frame,t):
    old=frame.evaluate('HomeBeauty.revision')
    page.evaluate('seconds=>document.querySelector("#home").contentWindow.postMessage({type:"home-beauty-clock",seconds,paused:true},location.origin)',t)
    frame.wait_for_function('([r,t])=>leafProbe.liveRevision>r && leafProbe.liveT===t',arg=[old,t],timeout=15000)
    return Image.open(io.BytesIO(page.screenshot(scale='css'))).convert('RGB')

def run(root,out):
    sheet=Image.new('RGB',(760,410),'#f7f5f0')
    draw=ImageDraw.Draw(sheet)
    draw.text((18,10),'スマートフォンで見る落ち葉の表と裏',font=font(22),fill='#20372f')
    draw.text((18,42),'390 × 844 CSS px の画面から、同じ葉を 60 × 60 CSS px の原寸で切り出した。',font=font(14),fill='#43544e')
    screens=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
        for num,(scene,(track,times)) in enumerate(SAMPLES.items()):
            x0=20+375*num
            draw.text((x0,70),LABEL[scene],font=font(17),fill='#20372f')
            draw.text((x0+6,395),f'手前の葉　番号 {track}',font=font(11),fill='#54665f',anchor='ls')
            for col,t in enumerate(times):
                draw.text((x0+103+83*col,108),f'{t:g} 秒',font=font(12),fill='#43544e',anchor='ms')
            context=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
            context.add_init_script(path=HERE/'verify_visual_probe.js')
            for filename in ['home-production-world.mjs','regional-fall.mjs','autumn-leaf.mjs']:
                context.route('**/'+filename+'*', instrument)
            page=context.new_page()
            page.goto(root+'/?'+urlencode(dict(scene=scene,variant="E3plus",compareSplit=0,clock=0)),wait_until='domcontentloaded')
            page.wait_for_selector('iframe#home')
            iframe=page.locator('#home')
            frame=iframe.element_handle().content_frame()
            frame.wait_for_function(READY,timeout=60000)
            for r,mode in enumerate(MODES):
                page.locator('#quick-variant').select_option(mode)
                frame.wait_for_function('mode=>HomeBeauty.settings.variant===mode',arg=mode)
                assert frame.evaluate('HomeBeauty.settings.variant')==mode
                top=iframe.bounding_box()['y']+frame.evaluate('leafProbe.geometry.y')
                left=iframe.bounding_box()['x']+frame.evaluate('leafProbe.geometry.x')
                y=118+67*r
                draw.text((x0+2,y+31),TITLE[mode],font=font(17),fill='#20372f',anchor='lm')
                for c,t in enumerate(times):
                    candidates=frame.evaluate('t=>leafProbe.render(t)',t)
                    row=next((p for p in candidates if p['id']==track),None)
                    shot=live_shot(page,frame,t)
                    x=x0+73+83*c
                    if row:
                        cx=round(row['x']+left);cy=round(row['y']+top)
                        assert 0<=cx<shot.width and 0<=cy<shot.height
                        l=min(max(0,cx-HALF),shot.width-2*HALF)
                        h=min(max(0,cy-HALF),shot.height-2*HALF)
                        sheet.paste(shot.crop((l,h,l+2*HALF,h+2*HALF)),(x,y))
                        print(scene,mode,t,track,cx,cy,round(row['face'],2),flush=True)
                    else:
                        draw.rectangle((x,y,x+59,y+59),fill='#e4e6e1')
                        draw.text((x+30,y+30),'画面外',font=font(11),fill='#4f5d54',anchor='mm')
                if mode=='B':
                    page.locator('#split-toggle').click()
                    frame.wait_for_function('HomeBeauty.settings.compareSplit===true')
                    screens.append(live_shot(page,frame,1.5))
                    page.locator("#split-toggle").click()
                    frame.wait_for_function("HomeBeauty.settings.compareSplit===false")
            context.close()
        b.close()
    sheet.save(out/'leaf-turnovers.png',optimize=True)
    pair=Image.new('RGB',(790,844),'#f7f5f0')
    pair.paste(screens[0],(0,0));pair.paste(screens[1],(400,0))
    pair.save(out/'leaf-split-at-1-5s.webp',lossless=True,method=4)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://localhost:8197')
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True);run(a.url.rstrip('/'),a.out)
