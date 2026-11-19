from pathlib import Path
import numpy as np,json,math
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
p=Path(__file__).resolve().parent.parent;silver=np.array(Image.open(p/'v16/evidence/silver-mask.png'))>0
ticks=Image.new('L',(1024,1024));d=ImageDraw.Draw(ticks)
for n in range(60):
 a=n*math.pi/30;r=422 if n%5==0 else 427;d.line((512+r*math.sin(a),500-r*math.cos(a),512+432*math.sin(a),500-432*math.cos(a)),fill=255,width=3 if n%5==0 else 2)
ds={k:distance_transform_edt(~v) for k,v in {'silver':silver,'ticks':np.array(ticks)>0}.items()};met=json.loads((p/'v11/evidence/glyph-metrics.json').read_text())['52'];res={}
for n in [10]:
 a=n*math.pi/6;alpha=np.array(Image.open(p/f'v11/evidence/glyph-52-{n}.png'))[:,:,3]>24;gy,gx=np.where(alpha);m=met[str(n)];options=[]
 for r in np.arange(370,411,.5):
  for t in np.arange(-30,30.1,.5):
   xx=np.rint(gx-80+512+r*math.sin(a)+m['dx']+t*math.cos(a)).astype(int);yy=np.rint(gy-80+500-r*math.cos(a)+m['dy']+t*math.sin(a)).astype(int)
   gaps={k:round(float(z[yy,xx].min()),2) for k,z in ds.items()};options.append({'r':r,'t':t,'gaps':gaps,'min':min(gaps.values())})
 good=[q for q in options if q['min']>=8]
 res[n]={'nearest8':min(good,key=lambda q:abs(q['t'])+abs(q['r']-382)*.1) if good else None,'bestWithin4':max([q for q in options if abs(q['t'])<=4],key=lambda q:q['min']),'bestWithin10':max([q for q in options if abs(q['t'])<=10],key=lambda q:q['min'])}
print(json.dumps(res,indent=2));(p/'v16/evidence/placement-search.json').write_text(json.dumps(res,indent=2))
