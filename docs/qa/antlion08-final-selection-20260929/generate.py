"""Render only human-selected existing images; never write sprite sources."""
from pathlib import Path
import hashlib,json,subprocess
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
BASE='1c014721a49fb31e898d822e40451456df7f77a0'
sha=lambda b:hashlib.sha256(b).hexdigest()
selection=json.loads((O/'selection.json').read_text())
order=['normal08','happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
images={}
for k in order:
 v=selection['selected'][k];b=(R/v['path']).read_bytes();assert sha(b)==v['sha256'],k
 images[k]=Image.open(R/v['path']).convert('RGBA');assert images[k].size==(128,128)
assert selection['selected']['strained']['candidate_id']=='A'
assert selection['selected']['critical']['candidate_id']=='A'
for v in selection['rejected'].values():assert sha((R/v['path']).read_bytes())==v['sha256']
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
im=Image.new('RGB',(1780,1410),'#e6eaed');d=ImageDraw.Draw(im)
def text(x,y,s,n=15):d.text((x,y),s,font=font(n),fill='#172638')
def put(z,x,y):im.paste(z,(x,y),z)
text(16,12,'Antlion08 | HUMAN-SELECTED FINAL CONTACT SHEET | pending final visual confirmation',24)
text(16,47,'strained = A | critical = A | tired = D4 | wantsPlay = WP-CL1 | hungry / others = maintained',17)
text(16,73,'Existing files only. Offline NEAREST, no marks / sweat. Display at 100% for labelled sizes. No production replacement.',15)
labels={k:k for k in order};labels.update(strained='strained A',critical='critical A',tired='tired D4',wantsPlay='wantsPlay CL1')
for row,size in enumerate([128,104,80,64]):
 y=118+row*166;text(10,y+52,str(size),17)
 for col,k in enumerate(order):
  x=70+col*154;z=images[k].resize((size,size),Image.Resampling.NEAREST)
  put(z,x+(128-size)//2,y+(128-size)//2);text(x,y+133,labels[k],14)
sections=[('FACES: common ROI [88,52,110,70), 6x', (88,52,110,70),6,810),('LEGS / ABDOMEN: common ROI [65,64,119,116), 2x',(65,64,119,116),2,998),('REAR PARTICLES / TRAILS: common ROI [8,59,62,118), 2x',(8,59,62,118),2,1190)]
for title,roi,scale,y in sections:
 text(16,y,title,19)
 for col,k in enumerate(order):
  x=70+col*154;z=images[k].crop(roi);z=z.resize((z.width*scale,z.height*scale),Image.Resampling.NEAREST)
  put(z,x,y+34);text(x,y+40+z.height,labels[k],14)
text(16,1383,'critical A: intentional higher density (53 components / 189 pixels / 5.93% rear ROI). No density equalization.',16)
im.save(O/'final-contact-sheet.png')
changed=[];preserved=[];png_count=0
for line in subprocess.check_output(['git','ls-tree','-r',BASE],cwd=R,text=True).splitlines():
 meta,p=line.split('\t');b=(R/p).read_bytes();h=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if h==meta.split()[2]:preserved.append(p);png_count+=p.endswith('.png')
 else:changed.append(p)
assert changed==['docs/qa/growth-hunger-expression-implementation-checklist-20260926.md'],changed
summary={'source_head':BASE,'selection_sha256':sha((O/'selection.json').read_bytes()),'contact_sheet_sha256':sha((O/'final-contact-sheet.png').read_bytes()),'source_images_byte_unchanged':11,'rejected_candidates_byte_unchanged':2,'existing_files_checked':len(changed)+len(preserved),'existing_files_preserved':len(preserved),'existing_modified':changed,'existing_pngs_preserved':png_count,'existing_pngs_modified':0,'production_pngs_modified':0,'new_candidate_pngs':0,'new_qa_pngs':1,'source_pixel_changes':0,'critical_A_density':'53 components / 189 particle pixels / 5.93%; intentional human-approved expression variation','critical_B_not_used':True,'strained_B_not_used':True,'rendering':'Pillow NEAREST; static offline; no marks/sweat; no DPR/browser claim','human_final_sheet_confirmation':'pending','step5':False}
(O/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
