"""Compose private QA prints from actual screenshots without resampling character artwork."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
BOLD=FONT.with_name('NotoSansCJK-Bold.ttc')
BG='#f5f4ed'; FG='#233c32'; MUTED='#496354'
NAMES={'river_lake':'みずべ','forest':'もり','city':'とかい','home':'おうち'}
MODES={'current':'現行','A':'A案','B':'B案','pair':'手動'}
def label(draw,xy,text,size=15,color=FG,bold=False):
    draw.text(xy,text,font=ImageFont.truetype(str(BOLD if bold else FONT),size,index=0),fill=color)

def compose(raw,dest,measurements):
    evidence=json.loads(measurements.read_text())
    tile=84; gap=10; left=116
    page=Image.new('RGB',(left+4*(tile+gap)+12,503),BG)
    draw=ImageDraw.Draw(page)
    label(draw,(12,6),'同じ位置で見比べる主人公と恋人',22,bold=True)
    label(draw,(12,40),'390 × 844 CSS px の画面から、同じ足元を等倍で切り出し。',13)
    modes=['current','A','B','pair']
    for i,mode in enumerate(modes):
        label(draw,(left+i*(tile+gap)+5,69),MODES[mode],16,bold=True)
    for scene_index,region in enumerate(['river_lake','forest']):
        data=evidence['widths']['390'][region]
        for role_index,(key,name) in enumerate([('pet:dog','主人公'),('partner:forest_bear','恋人')]):
            row=scene_index*2+role_index
            y=101+row*(tile+7)
            label(draw,(12,y+13),NAMES[region],14,MUTED)
            label(draw,(12,y+34),name,17,bold=True)
            for i,mode in enumerate(modes):
                shot=Image.open(raw/f'chromium-390-{region}-{mode}.png').convert('RGB')
                foot=data['pairFootCss'][key]
                baseline=round(foot['y']+shot.height-data['iframe'][1]); x=round(foot['x'])
                crop=shot.crop((x-tile//2,baseline-57,x+tile//2,baseline-57+tile))
                page.paste(crop,(left+i*(tile+gap),y))
    label(draw,(12,470),'手動の倍率　主人公120%・恋人120%・仲間105%',14,MUTED)
    page.save(dest/'size-pairs.png',optimize=True)
    # Four everyday settings at the default medium-sized count trial and a
    # short-screen cross-section at native CSS resolution for judging overlap.
    scenes=Image.new('RGB',(996,1270),BG); draw=ImageDraw.Draw(scenes)
    label(draw,(18,8),'28体で見る、足元と住民の重なり',28,bold=True)
    label(draw,(18,56),'上段は390 × 844のB案、下段は320 × 568のおうち。写真はCSS px等倍。',16)
    for index,region in enumerate(NAMES):
        y=100+(index//2)*405; x=18+(index%2)*487
        label(draw,(x,y),NAMES[region],18,bold=True)
        shot=Image.open(raw/f'chromium-390-{region}-B.png').convert('RGB')
        scenes.paste(shot.crop((0,204,390,570)),(x,y+30))
    y=919
    for i,mode in enumerate(['current','A','B']):
        x=10+i*328
        label(draw,(x,y),'おうち　'+MODES[mode],17,bold=True)
        shot=Image.open(raw/f'chromium-320-home-{mode}.png').convert('RGB')
        scenes.paste(shot.crop((0,154,320,464)),(x,y+30))
    scenes.save(dest/'size-scenes.webp',format='WEBP',lossless=True,method=5)

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    for name in ('raw','dest','measurements'): ap.add_argument(name,type=Path)
    args=ap.parse_args();compose(args.raw,args.dest,args.measurements)
