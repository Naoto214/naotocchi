from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import binary_dilation,distance_transform_edt
import json,math
p=Path(__file__).parent;a=np.array(Image.open(p/'plate.webp').convert('RGB').resize((1024,1024))).astype(float);hi=a.max(2);lo=a.min(2);y,x=np.mgrid[:1024,:1024];r=np.hypot(x-512,y-500)
leaf=(hi-lo<hi*.32)&(hi>100)&(r<420);leaf=binary_dilation(leaf,iterations=2)
Image.fromarray(np.uint8(~leaf)*255).save(p/'occlusion.png')
silver=leaf|(abs(r-347)<6);Image.fromarray(np.uint8(silver)*255).save(p/'evidence/silver-mask.png');ticks=Image.new('L',(1024,1024));d=ImageDraw.Draw(ticks)
for n in range(60):
 t=n*math.pi/30;rr=422 if n%5==0 else 427;d.line((512+rr*math.sin(t),500-rr*math.cos(t),512+432*math.sin(t),500-432*math.cos(t)),fill=255,width=3 if n%5==0 else 2)
ds={k:distance_transform_edt(~v) for k,v in {'silver':silver,'ticks':np.array(ticks)>0,'bezel':np.hypot(x-512,y-495)>=471}.items()};rows=[]
for n in range(1,13):
 ink=np.array(Image.open(p/f'evidence/D-{n}.png'))[:,:,3]>24;rows.append({'number':n,**{k:round(float(v[ink].min()),2) for k,v in ds.items()}})
(p/'evidence/clearance.json').write_text(json.dumps({'method':'Conservative low-chroma plate silver +2px dilation, full ring r347 +/-6 including shadow, actual raster glyphs; fallback serif, not iPhone Georgia','rows':rows},indent=2));print(rows)
