"""Exact-source QA compositions only. Never writes any input asset."""
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
import subprocess,hashlib,json
R=Path(__file__).resolve().parents[3]; O=Path(__file__).resolve().parent
HEAD='0a77c3dec350840992f6224f6fc7b2f3653aa037'
BG='#e6eaed'; F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n): return ImageFont.truetype(F,n)
def sha(b):return hashlib.sha256(b).hexdigest()
def preserve():
 rows=[s.split('\t',1) for s in subprocess.check_output(['git','ls-tree','-r',HEAD],cwd=R,text=True).splitlines()]
 got=subprocess.check_output(['git','hash-object','--stdin-paths'],input='\n'.join(p for _,p in rows)+'\n',cwd=R,text=True).splitlines()
 assert all(m.split()[2]==g for (m,p),g in zip(rows,got)) and len(rows)==len(got)==3989
 return len(rows)
count=preserve(); inputs=json.loads((R/'docs/qa/antlion08-human-review-20260928/sources.json').read_text())['inputs']
for s,v in inputs.items():assert sha((R/v['path']).read_bytes())==v['sha256'],s
states=['hungry','wantsPlay']; ims={s:Image.open(R/inputs[s]['path']).convert('RGBA') for s in states+['normal08','happy']}
rois={'Character-left (viewer-right)':[100,56,110,66],'Character-right (viewer-left)':[90,56,100,66]}
# Measurement windows are manually placed to contain the eye-associated dark core,
# not a semantic segmentation or whole-eye measurement. Surrounding contours may enter.
windows={'hungry':{'Character-right (viewer-left)':[94,58,99,63],'Character-left (viewer-right)':[104,58,107,62]},'wantsPlay':{'Character-right (viewer-left)':[93,59,98,63],'Character-left (viewer-right)':[102,61,107,65]}}
files=[]
def canvas(w,h,title):
 im=Image.new('RGB',(w,h),BG);d=ImageDraw.Draw(im);d.text((16,12),title,font=font(20),fill='#172638');d.text((16,42),'Source HEAD: '+HEAD,font=font(12),fill='#172638');return im,d
def paste(dst,src,x,y,scale=1):
 im=src.resize((src.width*scale,src.height*scale),Image.Resampling.NEAREST) if scale!=1 else src
 dst.paste(im,(x,y),im)
def save(im,name):im.save(O/(name+'.png'));files.append(name+'.png')
metrics={}
for s in states:
 src=ims[s]; im,d=canvas(1050,1100,s+': Character-left (viewer-right) / Character-right (viewer-left)')
 d.text((16,68),'Original orientation. All enlarged pixels use nearest-neighbour. No marks.',font=font(14),fill='black')
 paste(im,src,30,113);d.text((30,250),'128px original',font=font(14),fill='black')
 face=src.crop((88,52,110,70));paste(im,face,235,108,18)
 d.text((235,444),'Face ROI [88,52,110,70), 18x; unannotated',font=font(14),fill='black')
 # Separate coordinate map: boxes are only annotations on this QA panel.
 paste(im,face,675,108,12)
 for side,roi in rois.items():
  color='#007cba' if side=='Character-right (viewer-left)' else '#ae2473';x0,y0,x1,y1=roi
  d.rectangle((675+(x0-88)*12,108+(y0-52)*12,675+(x1-88)*12-1,108+(y1-52)*12-1),outline=color,width=2)
 d.text((675,345),'Blue: Character-right (viewer-left)',font=font(14),fill='#007cba');d.text((675,370),'Pink: Character-left (viewer-right)',font=font(14),fill='#ae2473')
 crops={side:src.crop(tuple(roi)) for side,roi in rois.items()}
 for i,(side,crop) in enumerate(crops.items()):
  x=30+i*350;paste(im,crop,x,505,28);d.text((x,470),side,font=font(16),fill='black');d.text((x,795),str(rois[side])+'; 10 x 10 px; 28x',font=font(13),fill='black')
 # Mirror overlay is explicitly synthetic; no semantic alignment or score.
 left=Image.new('RGBA',(10,10),BG);left.alpha_composite(crops['Character-right (viewer-left)'])
 right=Image.new('RGBA',(10,10),BG);right.alpha_composite(ImageOps.mirror(crops['Character-left (viewer-right)']))
 over=Image.blend(left,right,0.5);paste(im,over,740,505,28)
 d.text((740,470),'50/50 overlay',font=font(20),fill='black');d.text((740,800),'CR (viewer-left) + mirrored\nCL (viewer-right)',font=font(12),fill='black')
 d.text((16,855),'Overlay: crop origins aligned; no eye-centre registration, no pixel-match pass/fail.',font=font(15),fill='black')
 # raw right and mirrored right to disambiguate transformed diagnostic.
 paste(im,crops['Character-left (viewer-right)'],45,910,12);paste(im,ImageOps.mirror(crops['Character-left (viewer-right)']),445,910,12)
 d.text((45,1040),'Character-left (viewer-right): raw',font=font(14),fill='black');d.text((445,1040),'Character-left (viewer-right): mirrored',font=font(14),fill='black')
 save(im,s+'-bilateral')
 metrics[s]={}
 for side,roi in windows[s].items():
  dark=[];bright=[];raw=[]
  for y in range(roi[1],roi[3]):
   for x in range(roi[0],roi[2]):
    rgba=src.getpixel((x,y));r,g,b,a=rgba;lum=.2126*r+.7152*g+.0722*b
    raw.append({'xy':[x,y],'rgba':rgba})
    if a and lum<60:dark.append([x,y])
    if a and min(r,g,b)>=200 and max(r,g,b)-min(r,g,b)<=40:bright.append([x,y])
  bbox=[min(p[0] for p in dark),min(p[1] for p in dark),max(p[0] for p in dark)+1,max(p[1] for p in dark)+1]
  metrics[s][side]={'measurement_window':roi,'dark_threshold':'Rec.709 luminance < 60, alpha > 0','dark_count':len(dark),'dark_bbox':bbox,'dark_width_height':[bbox[2]-bbox[0],bbox[3]-bbox[1]],'near_white_criterion':'all RGB >= 200 and max-min <= 40','near_white_pixels':bright,'near_white_area':len(bright),'raw_pixels':raw}
# Four display sizes: actual-sized body plus exact post-downsample face/eyes.
im,d=canvas(1220,1000,'Hungry / wantsPlay: actual display sizes and post-downsample face views')
d.text((16,67),'CL = Character-left (viewer-right); CR = Character-right (viewer-left). Nearest-neighbour.',font=font(14),fill='black')
for row,n in enumerate([128,104,80,64]):
 y=110+row*214
 for col,s in enumerate(states):
  x=20+col*610;small=ims[s].resize((n,n),Image.Resampling.NEAREST);paste(im,small,x,y)
  d.text((x,y+140),s+' '+str(n)+'px',font=font(16),fill='black')
  box=tuple(round(v*n/128) for v in (88,52,110,70));paste(im,small.crop(box),x+170,y,6)
  d.text((x+170,y+140),'Face after resize, 6x',font=font(12),fill='black')
  for i,(side,roi) in enumerate(rois.items()):
   # preserve equal width at each size via same rounded side length
   w=round(10*n/128);xx=round(roi[0]*n/128);yy=round(roi[1]*n/128)
   paste(im,small.crop((xx,yy,xx+w,yy+w)),x+360+i*115,y,8)
   d.text((x+360+i*115,y+100),'CL (viewer-right)' if i==0 else 'CR (viewer-left)',font=font(10),fill='black')
  d.text((x+360,y+140),'Eyes after resize, 8x',font=font(12),fill='black')
save(im,'size-comparison')
im,d=canvas(1150,365,'Reference face style: normal08 / happy / hungry / wantsPlay')
d.text((16,67),'Common ROI [88,52,110,70), 11x. Normal/happy are closed-eye references, not open-eye templates.',font=font(14),fill='black')
for i,s in enumerate(['normal08','happy','hungry','wantsPlay']):
 paste(im,ims[s].crop((88,52,110,70)),18+i*283,104,11);d.text((18+i*283,320),s,font=font(18),fill='black')
save(im,'reference-faces')
# Coordinate evidence for the target eye, with an unannotated duplicate in bilateral sheets.
im,d=canvas(1240,670,'Target regions: Character-left (viewer-right), original pixel coordinates')
d.text((16,68),'Red box = inspection region, not a repair mask. No source pixel was changed.',font=font(15),fill='black')
for col,s in enumerate(states):
 x=20+col*620;src=ims[s];roi=windows[s]['Character-left (viewer-right)'];crop=(100,57,108,66)
 d.text((x,100),s+' Character-left (viewer-right)',font=font(17),fill='black')
 paste(im,src.crop(crop),x,142,28)
 d.rectangle((x+(roi[0]-100)*28,142+(roi[1]-57)*28,x+(roi[2]-100)*28-1,142+(roi[3]-57)*28-1),outline='#ff0060',width=2)
 d.text((x,408),'ROI '+str(roi),font=font(14),fill='black')
 for yy in range(57,66):
  for xx in range(100,108):
   gx=x+245+(xx-100)*43;gy=142+(yy-57)*43;r,g,b,a=src.getpixel((xx,yy))
   color=(r,g,b) if a else BG
   d.rectangle((gx,gy,gx+42,gy+42),fill=color,outline='#809099')
   lum=.2126*r+.7152*g+.0722*b
   d.text((gx+2,gy+3),str(xx)+','+str(yy),font=font(10),fill='white' if a and lum<100 else 'black')
 d.text((x,560),'Grid is annotated; use bilateral sheet for unannotated eye.',font=font(13),fill='black')
save(im,'target-coordinates')
assert preserve()==count
manifest={'source_head':HEAD,'inputs':{s:inputs[s] for s in states+['normal08','happy']},'coordinate_system':'Original PNG, zero-based, half-open ROI. 本人左目 (viewer-right): larger x; 本人右目 (viewer-left): smaller x.','eye_comparison_rois':rois,'measurement_limit':'Manual windows plus threshold are descriptive dark-core proxies; not semantic iris/eyelid masks; no automated naturalness decision. Near-white is not all possible highlights.','measurements':metrics}
(O/'measurements.json').write_text(json.dumps(manifest,indent=2)+'\n')
(O/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{font-family:system-ui}div{overflow:auto}img{max-width:none}</style><h1>左右眼の追加監査</h1><p>本人左目（viewer-right）＝大きいx。本人右目（viewer-left）＝小さいx。原寸は100%表示。元画像変更なし。判定・制約はreport.md参照。</p>'+''.join(f'<h2>{p}</h2><div><img src="{p}"></div>' for p in files))
(O/'verification.json').write_text(json.dumps({'source_head':HEAD,'existing_tracked_files_hash_preserved':count,'all11_input_sha256_preserved':True,'source_image_changes':0,'regeneration':0,'production_replacement':0,'human_approval':False,'runtime_tests':'not rerun; QA-only','artifact_sha256':{p:sha((O/p).read_bytes()) for p in files+['measurements.json','comparison.html']}},indent=2)+'\n')
print(json.dumps({'preserved':count,'metrics':{s:{side:{k:v for k,v in m.items() if k!='raw_pixels'} for side,m in sides.items()} for s,sides in metrics.items()}}))
