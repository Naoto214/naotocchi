"""Compose private, native-scale comparisons from browser captures. No artwork is redrawn."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

STYLE = Path('/usr/share/fonts/opentype/noto')
BG, INK, SUB = '#f5f5ef', '#213f32', '#4c6558'
REGIONS = {'forest':'もり','river_lake':'みずべ','city':'とかい','home':'おうち'}
MODES = {'current':'現行サイズ・従来の配置','adopted':'採用サイズ・従来の配置','final':'採用サイズ・最終配置'}


def label(draw, xy, text, size=16, bold=False):
    name = 'NotoSansCJK-Bold.ttc' if bold else 'NotoSansCJK-Regular.ttc'
    draw.text(xy,text,font=ImageFont.truetype(str(STYLE/name),size,index=0),fill=INK if bold else SUB)


def load(refs, final):
    return {**json.loads(refs.read_text())['measurements'],**json.loads(final.read_text())['measurements']}


def placement(raw,out,data):
    w,h=320,228
    page=Image.new('RGB',(3*(w+12)+16,89+4*(h+56)+17),BG)
    d=ImageDraw.Draw(page)
    label(d,(12,4),'320px幅で比べる28体の配置',24,True)
    label(d,(12,42),'同じ昼のホーム。各画面の同じ範囲を、CSSピクセル等倍で切り出しています。',15)
    for j,region in enumerate(REGIONS):
        y=87+j*(h+56)
        for i,mode in enumerate(MODES):
            x=10+i*(w+12)
            a=data[f'320/{region}/28/{mode}']
            label(d,(x,y),REGIONS[region]+'　'+MODES[mode],16,True)
            shot=Image.open(raw/f'chromium-320-{region}-{mode}.png').convert('RGB')
            page.paste(shot.crop((0,118,w,118+h)),(x,y+27))
            label(d,(x,y+29+h),f"輪郭が重なる組 {a['pairs']}   ／   重なり面積 {a['sharedPct']:.1f}%",13)
    out.mkdir(parents=True,exist_ok=True)
    page.save(out/'placement-320.webp',format='WEBP',lossless=True,method=5)


def couple(raw,out,data):
    out.mkdir(parents=True,exist_ok=True)
    tile=80
    pair=Image.new('RGB',(148+len(MODES)*(tile+18)+10,106+8*(tile+4)+32),BG)
    d=ImageDraw.Draw(pair)
    label(d,(12,5),'主人公と恋人の見え方',23,True)
    label(d,(12,43),'390×844の実画面で各住民の足元を追った等倍の切り出し。',13)
    for i,title in enumerate(('現行','#570採用','最終調整')):
        label(d,(148+i*(tile+18)+7,75),title,16,True)
    for j,region in enumerate(REGIONS):
        for k,(key,name) in enumerate((('pet:dog','主人公'),('partner:forest_bear','恋人'))):
            y=102+(j*2+k)*(tile+4)
            label(d,(13,y+10),REGIONS[region],15)
            label(d,(13,y+32),name,17,True)
            for i,mode in enumerate(MODES):
                shot=Image.open(raw/f'chromium-390-{region}-{mode}.png').convert('RGB')
                a=data[f'390/{region}/28/{mode}']
                fx,fy=a['poses'][key][-2:]
                l,t=round(fx)-tile//2,round(fy)-54
                pair.paste(shot.crop((l,t,l+tile,t+tile)),(148+i*(tile+18),y))
    label(d,(12,pair.height-26),'最終サイズ　主人公120%・恋人120%・仲間105%',14)
    pair.save(out/'resident-pair.png',optimize=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['raw','out','refs','final']:p.add_argument(name,type=Path)
    p.add_argument('--only',choices=['placement','couple'])
    a=p.parse_args();data=load(a.refs,a.final)
    if a.only!='couple':placement(a.raw,a.out,data)
    if a.only!='placement':couple(a.raw,a.out,data)
