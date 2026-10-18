#!/usr/bin/env python3
"""Read-only character audit; writes only derived QA sheets and an evidence JSON."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from scipy.ndimage import label
import numpy as np,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa';SOURCE='0620f3048e1a3e83e2d0c1c55854e2d44aa0f53c'
KEYS=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
JP=['喜び','いやだ','空腹','病気','疲労','不機嫌','いのち低下','危険','かまって','睡眠']
NAMES=['浮遊幼生','後期浮遊幼生','着底・変態期','変態後の稚ヒトデ','小型の稚ヒトデ','若いヒトデ','成熟したヒトデ','長生きしたヒトデ']
ROIS={'B1 左上':[22,23,46,46],'B2 右上':[93,23,123,53],'B3 左下':[4,63,33,94],'B4 右下大泡':[103,71,123,90],'B5 右下極小泡':[102,90,111,97]}
F='/root/.local/share/fonts/mplus.ttf'
def font(n):return ImageFont.truetype(F,n)
def hashes():return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted((ROOT/'assets/characters').rglob('*'))if p.is_file()}
before=hashes();records=[]
for st in range(1,9):
 paths=[ROOT/f'assets/characters/starfish/{st:02}.png']+[ROOT/f'assets/characters/expressions/starfish/{st:02}-{k}.png'for k in KEYS]
 sheet=Image.new('RGB',(1024,970+(350 if st==8 else 0)),'#f4f1e9');d=ImageDraw.Draw(sheet)
 d.text((16,10),f'ヒトデ{st:02}「{NAMES[st-1]}」泡のみ監査',font=font(25),fill='#172b3b')
 d.text((16,45),f'通常基準：{5 if st==8 else 0}泡／10表情：全て{5 if st==8 else 0}泡。身体模様・汗・状態マークは除外。',font=font(18),fill='#172b3b')
 d.text((16,74),'source '+SOURCE,font=font(14),fill='#465767')
 ims=[]
 for j,p in enumerate(paths):
  im=Image.open(p).convert('RGBA');ims.append(im);a=np.array(im);l,n=label(a[:,:,3]>16);components=[]
  for k in range(1,n+1):
   y,x=np.where(l==k);components.append({'area':int(len(x)),'box':[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]})
  components.sort(key=lambda c:c['area'],reverse=True)
  rec={'stage':f'{st:02}','key':'normal' if j==0 else KEYS[j-1],'path':str(p.relative_to(ROOT)),'sha256':before[str(p.relative_to(ROOT))],'dimensions':list(im.size),'alpha_threshold':16,'components_4_connected':components,'visual_external_bubble_count':5 if st==8 else 0,'visual_identity_ids':list(ROIS)if st==8 else [],'missing':[],'added':[],'review':'individual image compared with same-stage normal; count assigned by visual review, not component count'}
  if st==8:
   ai=a.astype(int);blue=(ai[:,:,3]>16)&(ai[:,:,0]<90)&(ai[:,:,1]>40)&(ai[:,:,2]>ai[:,:,1]+20)
   rec['blue_core_pixels_in_anchor_rois']={name:int(blue[y0:y1,x0:x1].sum())for name,(x0,y0,x1,y1)in ROIS.items()}
   assert all(v>0 for v in rec['blue_core_pixels_in_anchor_rois'].values())
   if j:
    normal=np.array(ims[0]);lab,_=label(normal[:,:,3]>0);bubble=lab==lab[93,106]
    rec['tiny_bubble_reference_pixel_matches']=int(np.all(a[bubble]==normal[bubble],axis=1).sum())
    assert rec['tiny_bubble_reference_pixel_matches'] in [44,45]
  elif j:assert len(components)==1
  records.append(rec)
  x=j%4*256;y=110+j//4*280;d.text((x+6,y),('通常基準'if j==0 else JP[j-1]+' / '+KEYS[j-1]),font=font(17),fill='#172b3b')
  # QA-only enlargement; source file is never overwritten.
  q=im.resize((256,256),Image.Resampling.NEAREST);sheet.paste(q,(x,y+24),q)
  if st==8 and j==0:
   for (tx,ty,t)in [(25,22,'B1'),(102,24,'B2'),(0,67,'B3'),(108,67,'B4'),(108,98,'B5')]:d.text((x+tx*2,y+24+ty*2),t,font=font(13),fill='#232323',stroke_width=1,stroke_fill='white')
 if st==8:
  d.text((16,960),'B4・B5拡大：同じ矩形 x96〜124 / y70〜102。輪郭接触は欠損と別に判定。',font=font(17),fill='#172b3b')
  for j,im in enumerate(ims):
   x=j%6*170;y=990+j//6*155;d.text((x+6,y),'通常'if j==0 else JP[j-1],font=font(16),fill='#172b3b');q=im.crop((96,70,124,102)).resize((112,128),Image.Resampling.NEAREST);sheet.paste(q,(x+28,y+23),q)
 sheet.save(OUT/f'starfish-bubble-audit-20260927-{st:02}.png',optimize=True)
after=hashes();assert before==after
manifest='\n'.join(p+' '+h for p,h in before.items())+'\n'
report={'source_head':SOURCE,'source_tree':'81968c383b035ed49902344eca9ed54b24f9397b','scope':'8 normal + 80 expression images; bubbles only','definition':'external bubbles only; body lobes, remnant larval body, highlights, markings, sweat and state accents excluded','blue_anchor_rois':ROIS,'records':records,'character_asset_files_verified_unchanged':len(before),'character_asset_manifest_sha256':hashlib.sha256(manifest.encode()).hexdigest(),'image_asset_changes':0,'new_repair_candidates':0,'notes':['01 normal: isolated 1x8 native-pixel fringe at x766 y261; not a bubble','03 normal: isolated 1x9 native-pixel fringe at x797 y617; not a bubble','08 four large bubbles vary in size/shape by expression; identity and relative region preserved, not byte-identical','08 tiny bubble 45/45 reference pixels in seven; 44/45 in strained/hungry/critical due protected pre-existing contour; human-approved']}
(OUT/'starfish-bubble-audit-20260927.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'images':len(records),'image_asset_changes':0,'new_repair_candidates':0,'manifest_sha256':report['character_asset_manifest_sha256']}))
