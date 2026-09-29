from pathlib import Path
import subprocess, hashlib, json, io
from PIL import Image, ImageDraw, ImageFont
R=Path(__file__).resolve().parents[3]; O=Path(__file__).resolve().parent
HEAD='7c878f86c08557970387e42f7f69a186ef505cd9'
sha=lambda b:hashlib.sha256(b).hexdigest()
prod='assets/characters/expressions/antlion/08-wantsPlay.png'
wp='docs/qa/antlion08-wantsplay-left-eye-candidate-20260929/candidates/wantsPlay-left-eye.png'
candidate=(R/wp).read_bytes()
assert sha(candidate)=='3eb3149d55224531a287eec6eb1965c9702b444ddbd4181f669e34bf99fc7a10'
before=subprocess.check_output(['git','show',HEAD+':'+prod],cwd=R)
(R/prod).write_bytes(candidate)
assert (R/prod).read_bytes()==candidate
def diff(a,b):
 a=Image.open(io.BytesIO(a)).convert('RGBA');b=Image.open(io.BytesIO(b)).convert('RGBA')
 cs=[{'xy':[x,y],'before':a.getpixel((x,y)),'after':b.getpixel((x,y))} for y in range(128) for x in range(128) if a.getpixel((x,y))!=b.getpixel((x,y))]
 return {'count':len(cs),'bounds_inclusive':[min(c['xy'][0] for c in cs),min(c['xy'][1] for c in cs),max(c['xy'][0] for c in cs),max(c['xy'][1] for c in cs)],'alpha_changed':sum(a.getpixel((x,y))[3]!=b.getpixel((x,y))[3] for y in range(128) for x in range(128)),'pixels':cs}
oldqa=(R/'docs/qa/antlion08-method-d-nine-20260928/candidates/wantsPlay.png').read_bytes()
changes=diff(oldqa,candidate);assert changes['count']==3 and changes['alpha_changed']==0
inputs=json.loads((R/'docs/qa/antlion08-human-review-20260928/sources.json').read_text())['inputs']
for name,v in inputs.items():assert sha((R/v['path']).read_bytes())==v['sha256']
inputs['wantsPlay']={'path':prod,'sha256':sha(candidate),'candidate_id':'WP-CL1 / APPROVED'}
for n,v in inputs.items():v['status']='approved production' if n in ['tired','wantsPlay'] else 'reference' if n=='normal08' else 'B / retain QA image' if n=='hungry' else 'pending human final selection'
(O/'sources.json').write_text(json.dumps({'source_head':HEAD,'inputs':inputs},indent=2)+'\n')
BG='#e6eaed';font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
def canvas(w,h,title):
 im=Image.new('RGB',(w,h),BG);d=ImageDraw.Draw(im);d.text((15,10),title,font=font(19),fill='black');d.text((15,38),'Source HEAD: '+HEAD+' | offline NEAREST; no marks/sweat',font=font(12),fill='black');return im,d
def paste(im,z,x,y):im.paste(z,(x,y),z)
images={n:Image.open(R/v['path']).convert('RGBA') for n,v in inputs.items()}
im,d=canvas(1770,790,'Final contact sheet: normal08 + 10 expressions / 128, 104, 80, 64px')
for row,size in enumerate([128,104,80,64]):
 y=90+row*172;d.text((8,y+55),str(size),font=font(16),fill='black')
 for col,(n,z) in enumerate(images.items()):
  x=65+col*154;paste(im,z.resize((size,size),Image.Resampling.NEAREST),x+(128-size)//2,y+(128-size)//2)
  label=n+('*' if n in ['strained','critical'] else '')
  d.text((x,y+132),label,font=font(14),fill='black')
d.text((15,775),'* unapproved latest limited candidate; alternatives in selection-comparison.png. tired=D4; wantsPlay=WP-CL1; hungry=unchanged B.',font=font(12),fill='black')
im.save(O/'contact-sheet.png')
im,d=canvas(2020,265,'Faces / common ROI [88,52,110,70), 8x nearest-neighbour')
for i,(n,z) in enumerate(images.items()):
 paste(im,z.crop((88,52,110,70)).resize((176,144),Image.Resampling.NEAREST),15+i*182,70)
 d.text((15+i*182,225),n,font=font(14),fill='black')
im.save(O/'faces.png')
im,d=canvas(1450,980,'strained / critical: production vs original QA vs limited candidate (NONE newly approved)')
for row,n in enumerate(['strained','critical']):
 y=90+row*440
 paths=[('current production','assets/characters/expressions/antlion/08-'+n+'.png'),('original QA','docs/qa/antlion08-method-d-nine-20260928/candidates/'+n+'.png'),('limited candidate',inputs[n]['path'])]
 for col,(label,p) in enumerate(paths):
  x=20+col*475;z=Image.open(R/p).convert('RGBA');d.text((x,y),n+' / '+label,font=font(17),fill='black')
  for j,s in enumerate([128,104,80,64]):paste(im,z.resize((s,s),Image.Resampling.NEAREST),x+sum([140,116,92][:j]),y+30)
  roi=(88,52,110,70) if n=='strained' else (0,45,60,115)
  k=10 if n=='strained' else 3;cut=z.crop(roi);paste(im,cut.resize((cut.width*k,cut.height*k),Image.Resampling.NEAREST),x,y+190)
  d.text((x,y+410),'face 10x' if n=='strained' else 'rear particles / trail 3x',font=font(13),fill='black')
im.save(O/'selection-comparison.png')
entries=subprocess.check_output(['git','ls-tree','-r',HEAD],cwd=R,text=True).splitlines()
preserved=[];modified=[]
for line in entries:
 meta,p=line.split('\t');blob=meta.split()[2];now=subprocess.check_output(['git','hash-object',p],cwd=R,text=True).strip()
 (preserved if blob==now else modified).append(p)
assert set(modified)<= {prod,'docs/qa/growth-hunger-expression-implementation-checklist-20260926.md'}
record={'source_head':HEAD,'production_path':prod,'before_sha256':sha(before),'after_sha256':sha(candidate),'WP_CL1_byte_equal':True,'production_diff':diff(before,candidate),'original_QA_to_WP_CL1':changes,'WP_CL1_to_production_changed_pixels':0,'existing_file_count':len(entries),'existing_files_preserved':len(preserved),'existing_modified':modified,'protected_pngs_preserved':sum(p.endswith('.png') for p in preserved)}
(O/'verification.json').write_text(json.dumps(record,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in ['production_diff','original_QA_to_WP_CL1']}));print('production diff:',{k:v for k,v in record['production_diff'].items() if k!='pixels'})
