from pathlib import Path
import json,math
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
p=Path(__file__).parent;e=p/'evidence'
silver=np.array(Image.open(p/'../v11/evidence/silver-mask.png').convert('L'))>24
ticks=Image.new('L',(1024,1024));d=ImageDraw.Draw(ticks)
for n in range(60):
 a=n*math.pi/30;r=422 if n%5==0 else 427
 d.line((512+r*math.sin(a),500-r*math.cos(a),512+432*math.sin(a),500-432*math.cos(a)),fill=255,width=3 if n%5==0 else 2)
y,x=np.mgrid[:1024,:1024]
masks={'silver':silver,'ticks':np.array(ticks)>0,'bezel':np.hypot(x-512,y-495)>=471}
dists={k:distance_transform_edt(~v) for k,v in masks.items()}
met=json.loads((p/'../v11/evidence/glyph-metrics.json').read_text());layout={};rows=[]
for size in [52]:
 layout[size]={}
 for n in range(1,13):
  alpha=np.array(Image.open(p/f'../v11/evidence/glyph-{size}-{n}.png'))[:,:,3]>24;gy,gx=np.where(alpha);m=met[str(size)][str(n)];options=[]
  for r in np.arange(300,411,.5):
   a=n*math.pi/6;cx=512+r*math.sin(a);cy=500-r*math.cos(a)
   xx=np.rint(gx-80+cx+m['dx']).astype(int);yy=np.rint(gy-80+cy+m['dy']).astype(int)
   gaps={k:round(float(z[yy,xx].min()),2) for k,z in dists.items()}
   contacts=sum(int(z[yy,xx].sum()) for z in masks.values())
   options.append((min(gaps.values()),-abs(r-382),r,gaps,-contacts))
  good=[o for o in options if o[0]>=8];best=max(good,key=lambda q:q[1]) if good else max(options,key=lambda q:(q[0],q[3]['ticks']>0,q[4],q[1]))
  q={'radius':float(best[2]),'dx':m['dx'],'dy':m['dy'],'clearance':best[3],'status':'comfortable' if best[0]>=8 else 'tight' if best[0]>0 else 'contact'}
  layout[size][n]=q;rows.append({'size':size,'number':n,**q})
 print(size,[(n,q['radius'],q['clearance']) for n,q in layout[size].items() if min(q['clearance'].values())<8])
(p/'layout.mjs').write_text('export const layout='+json.dumps(layout)+';\n')
(e/'clearance.json').write_text(json.dumps(rows,indent=2))
# Minimum non-contact candidate; uniform font. Baseline angles remain 30 degrees.
# Tangential correction is explicitly recorded, not hidden as a ring deformation.
for n,r,t in [(10,398.5,10),(11,402.5,-5.5),(6,397,-12)]:
 a=n*math.pi/6;q=layout[52][n];q['radius']=r;q['dx']+=t*math.cos(a);q['dy']+=t*math.sin(a);q['tangentialCorrection']=t
(p/'layout.mjs').write_text('export const layout='+json.dumps(layout)+';\n')
