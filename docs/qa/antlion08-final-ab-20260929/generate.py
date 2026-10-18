"""Read existing candidates only; create one decision sheet and exact QA evidence."""
from pathlib import Path
import ast, hashlib, json, subprocess
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont
R=Path(__file__).resolve().parents[3]; O=Path(__file__).resolve().parent
BASE='06a3ef6d1f3a9c8aca389eac64825f3707025b8a'
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=json.loads((R/'docs/qa/antlion08-final-review-20260929/sources.json').read_text())['inputs']
for k,v in inputs.items(): assert sha((R/v['path']).read_bytes())==v['sha256'],k
for state in ['strained','critical']:
 inputs[state+'_B']=inputs.pop(state)
 p=f'docs/qa/antlion08-method-d-nine-20260928/candidates/{state}.png'
 inputs[state+'_A']={'path':p,'sha256':sha((R/p).read_bytes())}
images={k:Image.open(R/v['path']).convert('RGBA') for k,v in inputs.items()}
arrays={k:np.array(v) for k,v in images.items()}
scope={'np':np,'ndimage':ndimage}
t=ast.parse((R/'tools/antlion08-size-density-audit.py').read_text())
exec(compile(ast.Module(body=[n for n in t.body if isinstance(n,ast.FunctionDef) and n.name=='masks'],type_ignores=[]),'<existing-pure-masks>','exec'),scope)
masks=scope['masks']; metrics={}; diffs={}
for k,a in arrays.items():
 lab,p,tr,_=masks(a); q=p[59:118,8:62]
 metrics[k]={'components':len(set(lab[59:118,8:62][q].tolist())),'pixels':int(q.sum()),'coverage_pct':float(q.mean()*100),'peak_12x12':max(int(q[y:y+12,x:x+12].sum()) for y in range(q.shape[0]-11) for x in range(q.shape[1]-11)),'trail_proxy_pixels':int(tr[95:118,8:35].sum())}
for state in ['strained','critical']:
 a,b=arrays[state+'_A'],arrays[state+'_B']; diff=np.any(a!=b,axis=2); yy,xx=np.where(diff)
 details=[{'xy':[int(x),int(y)],'before':a[y,x].tolist(),'after':b[y,x].tolist()} for y,x in zip(yy,xx)]
 rec={'changed_pixels':len(details),'rgb_changed':int(np.any(a[:,:,:3]!=b[:,:,:3],axis=2).sum()),'alpha_changed':int((a[:,:,3]!=b[:,:,3]).sum()),'pixels':details,'unchanged_region_rgba_sha256_A':sha(a[~diff].tobytes()),'unchanged_region_rgba_sha256_B':sha(b[~diff].tobytes())}
 assert rec['unchanged_region_rgba_sha256_A']==rec['unchanged_region_rgba_sha256_B']
 if state=='strained':
  assert len(details)==15 and rec['alpha_changed']==0
  assert all(100<=x<105 and 63<=y<66 for x,y in zip(xx,yy))
  assert metrics['strained_A']==metrics['strained_B']
  rec['outside_mouth_changed']=0
 else:
  assert len(details)==30 and rec['rgb_changed']==0
  assert np.all(a[diff,3]==255) and np.all(b[diff,3]==0)
  lab,n=ndimage.label(a[:,:,3]>0,np.ones((3,3))); sizes=np.bincount(lab.ravel()); main=int(sizes[1:].argmax()+1)
  ids=set(lab[diff].tolist()); assert len(ids)==18 and main not in ids
  assert all(diff[lab==i].all() for i in ids)
  assert np.array_equal(a[lab==main],b[lab==main])
  rec['removed_whole_components']=18;rec['body_connected_component_changed']=0
 diffs[state]=rec
# Verify the documented color-transfer mask; ambiguous near-body pixels were protected.
color=json.loads((R/'docs/qa/antlion08-method-d-nine-20260928/color-audit.json').read_text())
mapped=color['states']['critical']['mappings_xy_referencexy_beforeRGB_afterRGB']
retained_matches=0
for m in mapped:
 x,y,rx,ry=m[:4]
 assert np.array_equal(arrays['critical_A'][y,x,:3],arrays['normal08'][ry,rx,:3])
 assert np.array_equal(arrays['critical_B'][y,x,:3],arrays['normal08'][ry,rx,:3])
 retained_matches+=int(arrays['critical_B'][y,x,3]>0)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
im=Image.new('RGB',(1440,2040),'#e6eaed');d=ImageDraw.Draw(im)
def text(x,y,s,n=17):d.text((x,y),s,font=font(n),fill='#172638')
def put(k,x,y,size=128,roi=None,scale=1):
 z=images[k]
 if roi:z=z.crop(roi);z=z.resize((z.width*scale,z.height*scale),Image.Resampling.NEAREST)
 else:z=z.resize((size,size),Image.Resampling.NEAREST)
 im.paste(z,(x,y),z)
text(20,12,'Antlion08 | FINAL A/B DECISION SHEET | awaiting human decision',24)
text(20,47,'A = saved original QA candidate   B = saved limited candidate   |   no new sprite / no adoption',16)
text(20,72,'Offline NEAREST; no marks or sweat. Read at 100% for stated pixel sizes; crops use identical coordinates.',14)
for row,state in enumerate(['strained','critical']):
 y=110+row*390
 text(20,y,state.upper()+(' | B: mouth RGB only, 15 pixels' if state=='strained' else ' | B: 18 detached components / 30 alpha pixels removed'),21)
 for c,s in enumerate([128,104,80,64]):
  x=35+c*350;text(x,y+33,f'{s}px  A                 B',15)
  put(state+'_A',x+(128-s)//2,y+63+(128-s)//2,s)
  put(state+'_B',x+160+(128-s)//2,y+63+(128-s)//2,s)
 if state=='strained':
  for c,k in enumerate(['strained_A','strained_B']):
   x=35+c*360;put(k,x,y+210,roi=(88,52,110,70),scale=8);text(x,y+360,k+' / face 8x',15)
  text(770,y+240,'Eyes / brows unchanged. Compare mouth, not label.',17)
  text(770,y+275,'B reduces upturned-mouth cue; 64px difference is small.',17)
 else:
  for c,k in enumerate(['normal08','tired','critical_A','critical_B']):
   x=35+c*350;put(k,x,y+208,roi=(8,59,62,118),scale=3);text(x+175,y+220,k,16)
   text(x+175,y+253,str(metrics[k]['components'])+' components',13);text(x+175,y+278,str(metrics[k]['pixels'])+' px area',13)
text(20,900,'STRAINED LEGS | same ROI [65,64,119,116), 4x | roots to tips; A and B pixel-identical',20)
for c,k in enumerate(['normal08','tired','strained_A','strained_B']):
 x=35+c*350;put(k,x,940,roi=(65,64,119,116),scale=4);text(x,1160,k,17)
text(20,1210,'COMMON STYLE REFERENCES | 128px | normal08 + other expressions + A/B',21)
order=['normal08','happy','hungry','sick','tired','sulky','weak','wantsPlay','sleeping','strained_A','strained_B','critical_A','critical_B']
for i,k in enumerate(order):
 x=35+(i%7)*200;y=1255+(i//7)*178;put(k,x,y);text(x,y+136,k,15)
text(20,1635,'COMMON REAR ROI | [8,59,62,118), 2x | same order and scale',20)
for i,k in enumerate(order):
 x=35+(i%7)*200;y=1675+(i//7)*163;put(k,x,y,roi=(8,59,62,118),scale=2);text(x,y+124,k,15)
text(20,2010,'QA comparison only. D4 / WP-CL1 / hungry unchanged. No winner selected; no step 5.',15)
im.save(O/'final-decision-sheet.png')
entries=subprocess.check_output(['git','ls-tree','-r',BASE],cwd=R,text=True).splitlines()
protected={};changed=[]
for line in entries:
 meta,p=line.split('\t');b=(R/p).read_bytes();blob=sha(b)
 gitblob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 assert gitblob==meta.split()[2],p
 protected[p]=blob
(O/'protected-hashes.json').write_text(json.dumps(protected,indent=2)+'\n')
result={'source_head':BASE,'inputs':inputs,'pixel_differences':diffs,'density_method':'canonical masks() from tools/antlion08-size-density-audit.py; 8-connectivity; exclude largest body and detached span >=12px; ROI [8,59,62,118), not semantic particle count','metrics':metrics,'normal08_RGB_mapping_verified':len(mapped),'remaining_mapped_opaque_pixels_verified':retained_matches,'RGB_scope':'existing documented color mask only; ambiguous near-body pixels remain protected; all-image RGB A/B identical','existing_files_preserved':len(protected),'existing_pngs_preserved':sum(p.endswith('.png') for p in protected),'existing_image_changes':0,'new_sprite_candidates':0,'new_comparison_pngs':1,'human_approval':False}
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'preserved':len(protected),'pngs':result['existing_pngs_preserved'],'diffs':{k:{n:v for n,v in q.items() if n!='pixels'} for k,q in diffs.items()},'metrics':metrics}))
