from pathlib import Path
import json,math
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
p=Path(__file__).parent;e=p/'evidence'
ticks=Image.new('L',(1024,1024));d=ImageDraw.Draw(ticks)
for n in range(60):
 a=n*math.pi/30;r=422 if n%5==0 else 427
 d.line((512+r*math.sin(a),500-r*math.cos(a),512+432*math.sin(a),500-432*math.cos(a)),fill=255,width=3 if n%5==0 else 2)
y,x=np.mgrid[:1024,:1024];rows=[]
for v in ['A','B']:
 silver=np.array(Image.open(p/'../v11/evidence/silver-mask.png' if v=='A' else e/'mask.png').convert('L'))>24
 ds={k:distance_transform_edt(~m) for k,m in {'silver':silver,'ticks':np.array(ticks)>0,'bezel':np.hypot(x-512,y-495)>=471}.items()}
 for n in range(1,13):
  ink=np.array(Image.open(e/f'{v}-{n}.png'))[:,:,3]>24
  gaps={k:round(float(a[ink].min()),2) for k,a in ds.items()}
  rows.append({'variant':v,'number':n,**gaps})
  if v=='B':assert min(gaps.values())>=8,(n,gaps)
print(json.dumps(rows))
(e/'final-clearance.json').write_text(json.dumps({'method':'Actual librsvg-rendered glyph alpha >24; original conservative silver mask dilated 2px, same displacement rendered for B; explicit thick ticks; bezel r471. Raster estimate, Georgia fallback, not Safari certification.','rows':rows},indent=2))
