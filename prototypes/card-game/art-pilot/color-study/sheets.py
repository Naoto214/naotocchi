from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
from analyze import *
p=P;out=p/'previews';palettes=json.loads((p/'palettes.json').read_text());names={'current':'現行','candidate':'新案','improved':'改善案（紫1色のみ変更）'}
fontpath='/root/.local/share/fonts/mplus-rounded.ttf'
def font(n):return ImageFont.truetype(fontpath,n)
def text(im,xy,s,size=18,color='#453c2e'):ImageDraw.Draw(im).text(xy,s,font=font(size),fill=color)
ids=['M-man-06','M-cat-06','M-frog-07','M-clownfish-06','M-beetle-04','M-dandelion-06','M-dragon-06','M-star-06','C-cat_friend','P-forest_bear','W-sea','G-beach-volley','I-naoto_lantern','E-midlife-flower'];keys=list(palettes['current'])
# Swatches with exact source HEX; no template effects.
all=Image.new('RGB',(1200,1100),'#f4efe2')
for col,(pk,colors) in enumerate(palettes.items()):
 im=Image.new('RGB',(400,1100),'#f4efe2');text(im,(20,12),names[pk],22)
 for i,(key,h) in enumerate(colors.items()):
  y=64+i*72;ImageDraw.Draw(im).rounded_rectangle((16,y,130,y+56),radius=8,fill=h);text(im,(147,y+2),key,20);text(im,(147,y+29),h,17)
 im.save(out/f'palette-{pk}.png');all.paste(im,(col*400,0))
all.save(out/'palettes-comparison.png')
# Simulation on exact swatches: severity 1.0 linear RGB matrix; clipped gamut.
cvd=Image.new('RGB',(1200,4*1140),'#f4efe2')
for row,mode in enumerate(['normal',*MATRICES]):
 a=np.array(all)/255;v=a if mode=='normal' else sim(a,mode);im=Image.fromarray(np.uint8(np.clip(v,0,1)*255));cvd.paste(im,(0,row*1140+40));text(cvd,(20,row*1140+4),mode+' / severity 1.0（模式的シミュレーション）',22)
cvd.save(out/'cvd-palettes.png')
# Actual 14-card sheets and deep green board comparison.
board=Image.new('RGB',(1820,710),'#132d2c')
for row,pk in enumerate(palettes):
 im=Image.new('RGB',(1820,880),'#f4efe2');text(im,(24,12),names[pk]+' · 実在カード14枚（アート・数値・本文は共通）',24)
 text(board,(18,row*232+4),names[pk],20,'#f6f0dc')
 for i,(key,id) in enumerate(zip(keys,ids)):
  x=20+(i%7)*258;y=55+(i//7)*410;card=Image.open(out/f'{pk}-{id}.png').convert('RGB');im.paste(card.resize((240,360),Image.Resampling.LANCZOS),(x,y));text(im,(x,y+365),key+' '+palettes[pk][key],16)
  small=Image.open(out/f'{pk}-{id}-110.png').convert('RGB');board.paste(small,(18+i*118,row*232+40))
 back=Image.open(p.parent/'references/approved-card-back.png').convert('RGB');back.thumbnail((110,165));board.paste(back,(1680,row*232+40));text(board,(1670,row*232+207),'採用裏面',14,'#f6f0dc');im.save(out/f'cards-{pk}.png')
board.save(out/'board-comparison.png')
# Three-column actual-card comparison, same row = same canonical ID.
im=Image.new('RGB',(770,14*290+60),'#f4efe2')
for col,pk in enumerate(palettes):
 text(im,(col*255+15,10),names[pk],17)
 for row,(key,id) in enumerate(zip(keys,ids)):
  card=Image.open(out/f'{pk}-{id}.png');card.thumbnail((160,240));im.paste(card,(col*255+45,60+row*290));text(im,(col*255+12,60+row*290+242),key+' '+palettes[pk][key],17)
im.save(out/'cards-three-way.png')
im=Image.new('RGB',(760,14*205+65),'#132d2c')
for col,pk in enumerate(palettes):
 text(im,(col*250+12,6),names[pk],16,'#fff9e5');text(im,(col*250+12,32),'80px / 110px',15,'#fff9e5')
 for row,id in enumerate(ids):
  for w,dx in [(80,15),(110,110)]:im.paste(Image.open(out/f'{pk}-{id}-{w}.png'),(col*250+dx,65+row*205))
im.save(out/'small-three-way.png')
# Ink proposal isolated from palette-only comparisons. SVG paths unchanged.
im=Image.new('RGB',(1000,440),'#f4efe2')
for i,id in enumerate(['M-man-06','M-frog-07','M-beetle-04','M-dragon-06']):
 text(im,(i*250+12,5),keys[ids.index(id)]+'：白線 → 濃色線',17)
 for col,prefix in enumerate(['improved','ink']):
  a=Image.open(out/f'{prefix}-{id}.png');a=a.crop((20,30,170,190));a.thumbnail((110,125));im.paste(a,(i*250+15+col*120,50))
  full=Image.open(out/f'{prefix}-{id}.png');full.thumbnail((110,165));im.paste(full,(i*250+15+col*120,200))
im.save(out/'icon-ink-comparison.png')
# Rendered tint patch comparisons; same unobstructed edge ROI in all screenshots.
rendered={}
for pk in palettes:
 colors={}
 for key,id in zip(keys,ids):
  im=np.array(Image.open(out/f'{pk}-{id}.png').convert('RGB'))/255
  mean=np.median(im[400:500,14:18],axis=(0,1));colors[key]='#'+''.join(f'{int(round(c*255)):02X}' for c in mean)
 rendered[pk]={'sample_roi':[14,400,18,500],'samples':colors,'analysis':analyze(colors)}
(p/'rendered-metrics.json').write_text(json.dumps(rendered,ensure_ascii=False,indent=2)+'\n')
print('Review sheets generated')
