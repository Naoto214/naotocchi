from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import subprocess,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
HEAD='35bcd0a7cb0ed2bad00f5445b85e10e24b10d726';CAN='docs/qa/growth-hunger-expression-implementation-checklist-20260926.md'
BG='#e6eaed';F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=lambda n:ImageFont.truetype(F,n)
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=json.loads((R/'docs/qa/antlion08-human-review-20260928/sources.json').read_text())['inputs']
for v in inputs.values():assert sha((R/v['path']).read_bytes())==v['sha256']
a=Image.open(R/inputs['wantsPlay']['path']).convert('RGBA');b=a.copy()
changes=json.loads((O/'pixel-changes.json').read_text());allowed={tuple(v['xy']) for v in changes};assert allowed=={(104,62),(105,62),(105,63)}
for c in changes:
 xy=tuple(c['xy']);assert list(a.getpixel(xy))==c['before'];b.putpixel(xy,tuple(c['after']))
b.save(O/'candidates/wantsPlay-left-eye.png')
changed=[(x,y) for y in range(128) for x in range(128) if a.getpixel((x,y))!=b.getpixel((x,y))];assert set(changed)==allowed
assert a.getchannel('A').tobytes()==b.getchannel('A').tobytes()
# Alpha-defined outer boundary includes opaque pixels adjacent to transparent in 8 directions.
boundary=set()
for y in range(128):
 for x in range(128):
  if a.getpixel((x,y))[3] and any(not(0<=x+dx<128 and 0<=y+dy<128) or not a.getpixel((x+dx,y+dy))[3] for dx,dy in [(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]):boundary.add((x,y))
assert allowed&boundary=={(105,63)}
regions={'本人右目（viewer-left）':[90,56,100,66],'mouth':[97,65,103,68],'nose_between_eyes':[98,59,102,65]}
region_hashes={}
for k,v in regions.items():
 aa=a.crop(v).tobytes();bb=b.crop(v).tobytes();assert aa==bb;region_hashes[k]={'roi':v,'before_rgba_sha256':sha(aa),'after_rgba_sha256':sha(bb),'equal':True}
ims={'A current':a,'B candidate':b};sheets=[]
def canvas(w,h,title):
 im=Image.new('RGB',(w,h),BG);d=ImageDraw.Draw(im);d.text((15,12),title,font=font(21),fill='#172638');d.text((15,44),'Source HEAD: '+HEAD,font=font(12),fill='black');return im,d
def paste(dst,src,x,y,scale=1):
 z=src.resize((src.width*scale,src.height*scale),Image.Resampling.NEAREST);dst.paste(z,(x,y),z)
def save(im,n):im.save(O/(n+'.png'));sheets.append(n)
im,d=canvas(920,960,'WantsPlay A / B: 128 / 104 / 80 / 64px, no marks')
for row,n in enumerate([128,104,80,64]):
 y=90+row*210
 for col,(label,z) in enumerate(ims.items()):
  x=20+col*450;sm=z.resize((n,n),Image.Resampling.NEAREST);paste(im,sm,x,y)
  d.text((x,y+140),label+' '+str(n)+'px',font=font(17),fill='black')
  roi=tuple(round(v*n/128) for v in (88,52,110,70));paste(im,sm.crop(roi),x+180,y,8)
  d.text((x+180,y+155),'Face after resize, 8x',font=font(12),fill='black')
save(im,'sizes')
im,d=canvas(980,490,'Whole face A / B: fixed ROI, 20x nearest-neighbour')
for i,(label,z) in enumerate(ims.items()):paste(im,z.crop((88,52,110,70)),20+i*480,85,20);d.text((20+i*480,450),label,font=font(18),fill='black')
save(im,'faces')
im,d=canvas(1000,950,'Eyes: Character-left (viewer-right) / Character-right (viewer-left)')
for row,(label,z) in enumerate(ims.items()):
 y=110+row*410;d.text((20,y-35),label,font=font(20),fill='black')
 for col,(name,roi) in enumerate([('Character-left (viewer-right)',(100,56,110,66)),('Character-right (viewer-left)',(90,56,100,66))]):
  x=20+col*480;paste(im,z.crop(roi),x,y,30);d.text((x,y+310),name,font=font(18),fill='black')
save(im,'bilateral-eyes')
im,d=canvas(1420,420,'Reference faces: normal08 / happy / hungry / wantsPlay A / wantsPlay B')
refs=[('normal08',Image.open(R/inputs['normal08']['path']).convert('RGBA')),('happy',Image.open(R/inputs['happy']['path']).convert('RGBA')),('hungry B retained',Image.open(R/inputs['hungry']['path']).convert('RGBA')),('wantsPlay A',a),('wantsPlay B',b)]
for i,(label,z) in enumerate(refs):paste(im,z.crop((88,52,110,70)),15+i*280,100,12);d.text((15+i*280,330),label,font=font(17),fill='black')
save(im,'references')
mask=Image.new('RGBA',(128,128),(0,0,0,0));delta=Image.new('RGBA',(128,128),(0,0,0,0))
for xy in changed:
 mask.putpixel(xy,(255,0,100,255));p=a.getpixel(xy);q=b.getpixel(xy);delta.putpixel(xy,tuple(abs(p[i]-q[i]) for i in range(3))+(255,))
mask.save(O/'changed-pixel-mask.png');delta.save(O/'absolute-rgb-difference.png')
im,d=canvas(1160,720,'Changed-pixel mask / absolute RGB difference: exactly 3 pixels')
for i,(label,z) in enumerate([('A current',a),('B candidate',b),('Change mask',mask),('Absolute RGB delta',delta)]):
 x=15+i*285;paste(im,z.crop((100,56,110,66)),x,100,26);d.text((x,375),label,font=font(17),fill='black')
d.text((15,430),'Character-left (viewer-right) ROI [100,56,110,66), 26x. Alpha unchanged.',font=font(17),fill='black')
for i,c in enumerate(changes):d.text((15,485+i*55),str(c['xy'])+': '+str(c['before'])+' -> '+str(c['after']),font=font(18),fill='black')
save(im,'pixel-difference')
rows=[s.split('\t',1) for s in subprocess.check_output(['git','ls-tree','-r',HEAD],cwd=R,text=True).splitlines()];assert len(rows)==3999
unchanged=0
for m,p in rows:
 old=m.split()[2];cur=subprocess.check_output(['git','hash-object',p],cwd=R,text=True).strip()
 if old==cur:unchanged+=1
 else:
  assert p==CAN;original=subprocess.check_output(['git','show',HEAD+':'+CAN],cwd=R);assert (R/CAN).read_bytes().startswith(original)
original_png_count=sum(p.endswith('.png') for _,p in rows)
(O/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{font-family:system-ui}div{overflow:auto}img{max-width:none}</style><h1>wantsPlay本人左目（viewer-right）限定候補</h1><p>A：現状、B：候補。本人右目（viewer-left）・口・身体・粒子は保持。外形alpha保持、外縁色1画素の例外変更はreport.md参照。候補は未承認。本番置換なし。各PNGは100%倍率で確認。</p>'+''.join(f'<h2>{n}</h2><div><img src="{n}.png"></div>' for n in sheets))
verification={'source_head':HEAD,'baseline_tracked_count':len(rows),'unchanged_tracked_count':unchanged,'permitted_existing_change':CAN,'all_existing_png_hashes_preserved':original_png_count,'all11_input_sha256_preserved':True,'production_images_changed':0,'qa_sprite_candidates':1,'local_crop_generation_calls':1,'full_face_regeneration':0,'candidate_changed_pixels':len(changed),'candidate_change_bbox':[104,62,106,64],'alpha_all_pixels_equal':True,'outer_boundary_alpha_shape_unchanged':True,'outer_boundary_8_connected_rgb_changes':[[105,63]],'all_pixels_outside_three_equal':True,'region_hashes':region_hashes,'candidate_sha256':sha((O/'candidates/wantsPlay-left-eye.png').read_bytes()),'source_sha256':inputs['wantsPlay']['sha256'],'hungry_sha256':inputs['hungry']['sha256'],'runtime_tests':'not rerun; runtime and production PNG unchanged','human_candidate_approval':False}
(O/'verification.json').write_text(json.dumps(verification,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(verification,ensure_ascii=False))
