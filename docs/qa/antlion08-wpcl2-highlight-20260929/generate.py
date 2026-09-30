from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,hashlib,subprocess,math
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;HEAD='54ce21d8184977f2f7a2cc0e547284b3aeb54607'
P=R/'docs/qa/antlion08-wantsplay-left-eye-candidate-20260929/candidates/wantsPlay-left-eye.png'
sha=lambda b:hashlib.sha256(b).hexdigest()
a=Image.open(P).convert('RGBA');assert sha(P.read_bytes())=='3eb3149d55224531a287eec6eb1965c9702b444ddbd4181f669e34bf99fc7a10'
b=a.copy();b.putpixel((104,62),(14,11,9,255));b.putpixel((103,63),a.getpixel((104,62)))
(O/'candidates').mkdir(exist_ok=True);b.save(O/'candidates/WP-CL2.png')
changes=[{'xy':[x,y],'before':a.getpixel((x,y)),'after':b.getpixel((x,y)),'rgb_delta':[b.getpixel((x,y))[i]-a.getpixel((x,y))[i] for i in range(3)]} for y in range(128) for x in range(128) if a.getpixel((x,y))!=b.getpixel((x,y))]
assert {tuple(v['xy']) for v in changes}=={(104,62),(103,63)}
assert a.getchannel('A').tobytes()==b.getchannel('A').tobytes()
for c in changes:
 x,y=c['xy'];assert all(a.getpixel((x+dx,y+dy))[3] for dx in [-1,0,1] for dy in [-1,0,1])
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n);BG='#e6eaed';sheets=[]
def sheet(w,h,title):
 im=Image.new('RGB',(w,h),BG);d=ImageDraw.Draw(im);d.text((15,10),title,font=font(20),fill='black');d.text((15,40),'Source HEAD: '+HEAD,font=font(12),fill='black');return im,d
def paste(im,z,x,y,k):
 z=z.resize((z.width*k,z.height*k),Image.Resampling.NEAREST);im.paste(z,(x,y),z)
def save(im,n):im.save(O/(n+'.png'));sheets.append(n)
pairs=[('WP-CL1',a),('WP-CL2',b)]
im,d=sheet(980,490,'Whole face: WP-CL1 / WP-CL2 (20x nearest-neighbour)')
for i,(n,z) in enumerate(pairs):paste(im,z.crop((88,52,110,70)),20+i*480,85,20);d.text((20+i*480,450),n,font=font(18),fill='black')
save(im,'faces')
im,d=sheet(1000,950,'Character-left (viewer-right) / Character-right (viewer-left)')
for row,(n,z) in enumerate(pairs):
 y=110+row*410;d.text((20,y-35),n,font=font(20),fill='black')
 for col,(name,roi) in enumerate([('Character-left (viewer-right)',(100,56,110,66)),('Character-right (viewer-left)',(90,56,100,66))]):
  x=20+col*480;paste(im,z.crop(roi),x,y,30);d.text((x,y+310),name,font=font(18),fill='black')
save(im,'eyes')
measure={}
for method in ['NEAREST','BILINEAR']:
 im,d=sheet(980,1000,method+' offline reference: NOT a browser screenshot')
 d.text((15,65),'Actual CSS/browser raster verification remains pending.',font=font(16),fill='black')
 measure[method]={}
 for row,n in enumerate([128,104,80,64]):
  measure[method][str(n)]={};y=100+row*220
  for col,(label,z) in enumerate(pairs):
   sm=z.resize((n,n),getattr(Image.Resampling,method));x=20+col*480;paste(im,sm,x,y,1);d.text((x,y+145),label+' '+str(n)+'px',font=font(17),fill='black')
   roi=tuple(round(v*n/128) for v in (88,52,110,70));paste(im,sm.crop(roi),x+185,y,8)
   d.text((x+185,y+160),'Post-resize face, 8x',font=font(12),fill='black')
   box=(math.floor(102*n/128),math.floor(60*n/128),math.ceil(105*n/128),math.ceil(64*n/128))
   pixels=[{'xy':[xx,yy],'rgba':list(sm.getpixel((xx,yy)))} for yy in range(box[1],box[3]) for xx in range(box[0],box[2])]
   light=[p for p in pixels if p['rgba'][3] and p['rgba'][0]>=220 and p['rgba'][1]>=200 and p['rgba'][2]>=170]
   measure[method][str(n)][label]={'target_roi':box,'highlight_count':len(light),'highlight_pixels':light,'all_roi_pixels':pixels}
 save(im,'sizes-'+method.lower())
for n in ['104','80']:assert measure['NEAREST'][n]['WP-CL2']['highlight_count']==1 and measure['NEAREST'][n]['WP-CL1']['highlight_count']==0
im,d=sheet(940,600,'Pixel difference: 2 RGB pixels; highlight area stays one native pixel')
mask=Image.new('RGBA',(128,128));delta=Image.new('RGBA',(128,128))
for c in changes:mask.putpixel(tuple(c['xy']),(255,0,100,255));delta.putpixel(tuple(c['xy']),tuple(abs(v) for v in c['rgb_delta'])+(255,))
mask.save(O/'change-mask.png');delta.save(O/'rgb-difference.png')
for i,(label,z) in enumerate([('WP-CL1',a),('WP-CL2',b),('Change mask',mask),('Absolute RGB delta',delta)]):paste(im,z.crop((100,56,110,66)),15+i*230,90,21);d.text((15+i*230,315),label,font=font(15),fill='black')
for i,c in enumerate(changes):d.text((15,380+i*65),str(c['xy'])+' '+str(c['before'])+' -> '+str(c['after']),font=font(16),fill='black')
save(im,'difference')
(O/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{font-family:system-ui}div{overflow:auto}img{max-width:none}</style><h1>WP-CL1 / WP-CL2</h1><p>本人左目（viewer-right）の光のみ。本人右目（viewer-left）は保持。縮小資料はオフライン計算で、ブラウザー実表示の検証は未実施。候補は未承認。</p>'+''.join(f'<h2>{n}</h2><div><img src="{n}.png"></div>' for n in sheets))
rows=[l.split('\t',1) for l in subprocess.check_output(['git','ls-tree','-r',HEAD],cwd=R,text=True).splitlines()]
got=subprocess.check_output(['git','hash-object','--stdin-paths'],cwd=R,text=True,input='\n'.join(p for _,p in rows)+'\n').splitlines();assert len(rows)==len(got) and all(m.split()[2]==v for (m,p),v in zip(rows,got))
(O/'measurements.json').write_text(json.dumps({'source_head':HEAD,'changes':changes,'highlight_rule':'R>=220 G>=200 B>=170 in target eye ROI; warm off-white, not perceptual proof','software':'Pillow '+Image.__version__,'browser_actual_pixels_verified':False,'offline_measurements':measure},indent=2)+'\n')
assert all(('ℹ '+k+' '+str(v)) in (O/'focused-test.log').read_text() for k,v in [('tests',1120),('pass',1120),('fail',0)])
(O/'verification.json').write_text(json.dumps({'source_head':HEAD,'existing_files_unchanged':len(rows),'production_image_changes':0,'qa_candidates':1,'changed_pixels':2,'all_alpha_equal':True,'all_outer_boundary_rgba_equal':True,'all_rgba_outside_2_equal':True,'candidate_sha256':sha((O/'candidates/WP-CL2.png').read_bytes()),'browser_actual_pixels_verified':False,'acceptance_status':'pending actual browser verification and human review','focused_test':{'command':'node --test tests/pet-expression-test.cjs tests/pet-expression-assets-test.cjs tests/pet-expression-integration-test.cjs','tests':1120,'pass':1120,'fail':0,'exit_code':0}},indent=2)+'\n')
print(json.dumps({'preserved':len(rows),'candidate_sha256':sha((O/'candidates/WP-CL2.png').read_bytes()),'counts':{m:{n:{s:q['highlight_count'] for s,q in v.items()} for n,v in ns.items()} for m,ns in measure.items()}}))
