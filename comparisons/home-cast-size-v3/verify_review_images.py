"""Build an owner-only visual comparison from unretouched browser screenshots."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

GAINS = [0, 5, 10, 15, 20]
NAMES = ['現行', 'A', 'B', 'C', 'D']
FONTS = Path('/usr/share/fonts/opentype/noto')


def label(draw, xy, text, size=15, bold=False):
    path = FONTS / ('NotoSansCJK-Bold.ttc' if bold else 'NotoSansCJK-Regular.ttc')
    draw.text(xy, text, font=ImageFont.truetype(str(path),size,index=0), fill='#29483c')


def capture(args, layout):
    args.raw.mkdir(exist_ok=True, parents=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width':320,'height':516},device_scale_factor=2,
                                  is_mobile=True,has_touch=True)
        for gain in GAINS:
            page=ctx.new_page()
            page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
            options = dict(region='forest',count=28,time='day',paused=1,clock=0,variant='B',compareSplit=0,layout=layout,extra=gain)
            page.goto(args.url.rstrip('/')+'/game/limit.html?'+urlencode(options),wait_until='domcontentloaded')
            page.wait_for_function('window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===28',timeout=120000)
            assert page.evaluate('HomeCastTrial.settings.extra')==gain
            page.screenshot(path=str(args.raw/f'{layout}-{gain}.png'),scale='css',animations='allow')
            page.close()
        browser.close()


def compose(args):
    row_height = 179
    out = Image.new('RGB',(674,87+row_height*len(GAINS)+27),'#f5f5ef')
    draw=ImageDraw.Draw(out)
    label(draw,(12,4),'もりの28体を拡大して比べる',24,True)
    label(draw,(12,40),'320×568・昼・初期配置。住民のいる範囲を同じ座標から等倍で切り出しています。',14)
    for i,(gain,name) in enumerate(zip(GAINS,NAMES)):
        y=81+i*row_height
        for j,(layout,title) in enumerate([('fixed','同じ配置'),('optimized','サイズ別の配置')]):
            x=10+j*333
            label(draw,(x,y),f'{name}　+{gain}%　／　{title}',15,True)
            source=Image.open(args.raw/f'{layout}-{gain}.png').convert('RGB')
            out.paste(source.crop((0,143,320,280)),(x,y+27))
    label(draw,(10,out.height-27),'追加0%の基準　主人公120%・恋人120%・仲間105%',13)
    out.save(args.out,'WEBP',lossless=True,method=5)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8303')
    parser.add_argument('--raw',type=Path,required=True)
    parser.add_argument('--out',type=Path)
    parser.add_argument('--capture',choices=['fixed','optimized'])
    args=parser.parse_args()
    if args.capture: capture(args,args.capture)
    if args.out: compose(args)
