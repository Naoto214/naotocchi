"""Deterministic, explicitly bounded RGB-only eye candidates and QA figures."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
(O/'candidates').mkdir(exist_ok=True)
BASE='ead09bb8e61dabd3a3099da60709a047f788c27d'
paths={'normal08':'assets/characters/antlion/08.png','hungry_A':'docs/qa/antlion08-method-d-nine-20260928/candidates/hungry.png','WP_CL1':'assets/characters/expressions/antlion/08-wantsPlay.png','pre_CL1':'docs/qa/antlion08-method-d-nine-20260928/candidates/wantsPlay.png'}
sha=lambda b:hashlib.sha256(b).hexdigest()
ims={k:Image.open(R/p).convert('RGBA') for k,p in paths.items()}
inputs={k:{'path':p,'sha256':sha((R/p).read_bytes())} for k,p in paths.items()}
# Move the single warm-white CL1 highlight upward; restore its old position from
# the pre-CL1 source (not CL2). Preserve both CL1 boundary improvements unchanged.
wp=ims['WP_CL1'].copy()
assert wp.getpixel((104,62))==(252,226,178,255)
assert ims['pre_CL1'].getpixel((104,62))==(14,11,9,255)
wp.putpixel((104,61),wp.getpixel((104,62)))
wp.putpixel((104,62),ims['pre_CL1'].getpixel((104,62)))
ims['WP_CL3']=wp
# One hungry proposal only: lift its existing grey-brown reflection (no new white
# dot or relocation) and soften the inner eye transition. No eye copied from WP.
hb=ims['hungry_A'].copy()
assert hb.getpixel((105,60))==(88,73,59,255)
assert hb.getpixel((104,60))==(56,18,0,255)
hb.putpixel((105,60),(163,145,125,255))
hb.putpixel((104,60),(108,66,34,255))
ims['hungry_B']=hb
diffs={}
for a,b,file in [('WP_CL1','WP_CL3','WP-CL3.png'),('hungry_A','hungry_B','hungry-B.png')]:
 x=np.array(ims[a]);y=np.array(ims[b]);mask=np.any(x!=y,axis=2);ys,xs=np.where(mask)
 expected={(104,61),(104,62)} if b=='WP_CL3' else {(104,60),(105,60)}
 assert set(zip(xs.tolist(),ys.tolist()))==expected
 assert np.array_equal(x[:,:,3],y[:,:,3])
 assert np.array_equal(x[~mask],y[~mask])
 assert np.array_equal(x[:,0:100],y[:,0:100]) # entire viewer-left side protected
 # The head silhouette's rightmost opaque pixel in each row is protected.
 for yy in range(52,71):
  opaque=np.where(x[yy,:,3]>0)[0]
  if len(opaque):assert np.array_equal(x[yy,opaque[-1]],y[yy,opaque[-1]])
 ims[b].save(O/'candidates'/file)
 diffs[b]={'base':a,'candidate_path':str((O/'candidates'/file).relative_to(R)),'candidate_sha256':sha((O/'candidates'/file).read_bytes()),'RGB_changed_pixels':len(xs),'alpha_changed':0,'outside_mask_RGBA_changed':0,'character_right_viewer_left_changed':0,'outermost_head_edge_changed':0,'protected_RGBA_sha256':sha(x[~mask].tobytes()),'changes':[{'xy':[int(xx),int(yy)],'before':x[yy,xx].tolist(),'after':y[yy,xx].tolist()} for yy,xx in zip(ys,xs)]}
rois={'character_left_viewer_right':[100,56,110,66],'character_right_viewer_left':[90,56,100,66]}
raw={}
for state in ['normal08','hungry_A','hungry_B','WP_CL1','WP_CL3']:
 raw[state]={}
 for side,roi in rois.items():
  rows=[]
  for y in range(roi[1],roi[3]):
   for x in range(roi[0],roi[2]):rows.append({'xy':[x,y],'RGBA':ims[state].getpixel((x,y))})
  raw[state][side]={'roi':roi,'pixels':rows}
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
def canvas(w,h,title):
 im=Image.new('RGB',(w,h),'#e6eaed');d=ImageDraw.Draw(im);d.text((18,12),title,font=font(22),fill='#172638');return im,d
def put(dst,z,x,y):dst.paste(z,(x,y),z)
im,d=canvas(1460,1170,'Eye candidates | WP-CL1 vs WP-CL3; hungry A vs B | NO adoption')
d.text((18,48),'Target = character-left / viewer-right. RGB only; alpha and all other pixels locked. Offline NEAREST.',font=font(16),fill='black')
for row,(a,b) in enumerate([('WP_CL1','WP_CL3'),('hungry_A','hungry_B')]):
 y=100+row*520
 d.text((18,y),a+'  /  '+b+(' : highlight moves (104,62) -> (104,61)' if row==0 else ' : existing reflection + inner eye boundary, 2 RGB pixels'),font=font(20),fill='black')
 for col,size in enumerate([128,104,80,64]):
  x=24+col*360;d.text((x,y+36),str(size)+'px   '+('CL1                   CL3' if row==0 else 'A                       B'),font=font(14),fill='black')
  for j,k in enumerate([a,b]):
   z=ims[k].resize((size,size),Image.Resampling.NEAREST);put(im,z,x+j*158+(128-size)//2,y+65+(128-size)//2)
   # Crop AFTER resize, so this panel shows actual retained small-image pixels.
   box=tuple(round(v*size/128) for v in (88,52,110,70));face=z.crop(box);face=face.resize((face.width*6,face.height*6),Image.Resampling.NEAREST)
   put(im,face,x+j*158,y+215)
  d.text((x,y+340),'Face after resize, 6x',font=font(13),fill='black')
 for j,k in enumerate([a,b]):
  face=ims[k].crop((100,56,110,66)).resize((130,130),Image.Resampling.NEAREST);put(im,face,26+j*215,y+375)
  d.text((175+j*215,y+415),k,font=font(13),fill='black')
 d.text((490,y+405),'CL (viewer-right) eye at 128px, 13x. Same 10x10 crop; no mirroring.',font=font(16),fill='black')
 d.text((490,y+440),'128px naturalness first. 64px white-point survival is not a pass/fail criterion.',font=font(16),fill='black')
im.save(O/'comparison.png')
im,d=canvas(1500,970,'Normal08 / hungry A / hungry B | both eyes, coordinates, original orientation')
d.text((18,49),'CR = character-right / viewer-left (smaller x). CL = character-left / viewer-right (larger x).',font=font(17),fill='black')
for col,k in enumerate(['normal08','hungry_A','hungry_B']):
 x=20+col*495;d.text((x,85),k,font=font(20),fill='black');put(im,ims[k],x,120)
 face=ims[k].crop((88,52,110,70)).resize((286,234),Image.Resampling.NEAREST);put(im,face,x+170,118)
 d.text((x,370),'CR (viewer-left)',font=font(16),fill='black');d.text((x+235,370),'CL (viewer-right)',font=font(16),fill='black')
 for j,roi in enumerate([(90,56,100,66),(100,56,110,66)]):
  put(im,ims[k].crop(roi).resize((200,200),Image.Resampling.NEAREST),x+j*235,405)
 d.text((x,627),'CL pixel map [102,57,108,64), 32x',font=font(16),fill='black')
 for yy in range(57,64):
  d.text((x,674+(yy-57)*32),str(yy),font=font(13),fill='black')
  for xx in range(102,108):
   rgb=ims[k].getpixel((xx,yy));bx=x+42+(xx-102)*32;by=670+(yy-57)*32
   if rgb[3]:d.rectangle((bx,by,bx+31,by+31),fill=rgb[:3])
   d.rectangle((bx,by,bx+31,by+31),outline='#9a9a9a')
 for xx in range(102,108):d.text((x+42+(xx-102)*32,650),str(xx),font=font(11),fill='black')
 d.text((x,910),'0-based coordinates; right/bottom exclusive.',font=font(14),fill='black')
im.save(O/'hungry-coordinate-audit.png')
rows=subprocess.check_output(['git','ls-tree','-r',BASE],cwd=R,text=True).splitlines();changed=[];pngs=0
for line in rows:
 meta,p=line.split('\t');b=(R/p).read_bytes();g=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if g!=meta.split()[2]:changed.append(p)
 elif p.endswith('.png'):pngs+=1
assert set(changed)<= {'docs/qa/growth-hunger-expression-implementation-checklist-20260926.md'}
result={'source_head':BASE,'inputs':inputs,'differences':diffs,'raw_eye_pixels':raw,'existing_files_checked':len(rows),'existing_modified':changed,'existing_pngs_preserved':pngs,'production_image_changes':0,'candidate_count':2,'candidate_alpha_changes':0,'CL2_used':False,'WP_eye_copied_into_hungry':False,'generation':'deterministic explicit pixel edits only; no generative model call','WP_CL1_formal_adoption':'maintained','hungry_current_A_decision':'reopened; A/B pending human decision','step5':False}
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['inputs','differences','raw_eye_pixels']}))
