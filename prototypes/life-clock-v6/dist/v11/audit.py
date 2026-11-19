"""Conservative pixel clearance estimate; does not replace iPhone/font QA.
Silver mask: low-chroma bright source pixels, dilated 2 px to include outlines.
Ticks: explicit SVG line endpoints, including 1.8 px stroke. All units /1024.
"""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt,binary_dilation
p=Path(__file__).parent;e=p/'evidence';a=np.array(Image.open(p/'../assets/dial-art-v4.png').convert('RGB').resize((1024,1024))).astype(float)
y,x=np.mgrid[:1024,:1024];r=np.hypot(x-512,y-500)
hi=a.max(2);lo=a.min(2)
silver=(hi-lo<hi*.32)&(hi>100)&(r<420)
silver=binary_dilation(silver,iterations=2)
ticks=Image.new('L',(1024,1024));d=ImageDraw.Draw(ticks)
for n in range(60):
 t=n*math.pi/30;r0=422 if n%5==0 else 427
 d.line((512+r0*math.sin(t),500-r0*math.cos(t),512+432*math.sin(t),500-432*math.cos(t)),fill=255,width=3 if n%5==0 else 2)
bezel=np.hypot(x-512,y-495)>=471
masks={'silver':silver,'ticks':np.array(ticks)>0,'bezel':bezel}
dists={k:distance_transform_edt(~v) for k,v in masks.items()}
met=json.loads((e/'glyph-metrics.json').read_text());rows=[];layout={}
for v,size in [('A',46),('B',46),('C',48),('D',50),('E',52)]:
 layout[v]={}
 for n in range(1,13):
  g=np.array(Image.open(e/f'glyph-{size}-{n}.png'))[:,:,3]>24;gy,gx=np.where(g);m=met[str(size)][str(n)]
  dx,dy=(0,0) if v=='A' else (m['dx'],m['dy'])
  options=[]
  for radius in ([382] if v=='A' else np.arange(382,409,.5)):
   t=n*math.pi/6;cx=512+radius*math.sin(t);cy=500-radius*math.cos(t)
   for optical in ([0] if v=='A' or n!=10 else [-4,-3,-2,-1,0,1,2,3,4]):
    ox=optical*math.cos(t);oy=optical*math.sin(t)
    xx=np.rint(gx-80+cx+dx+ox).astype(int);yy=np.rint(gy-80+cy+dy+oy).astype(int)
    gaps={k:round(float(z[yy,xx].min()),2) for k,z in dists.items()}
    score=min(gaps.values());contacts=sum(int(z[yy,xx].sum()) for z in masks.values());options.append((score,-abs(radius-382)-abs(optical)*.1,radius,gaps,ox,oy,contacts))
  best=max(options,key=lambda q:(q[0],q[3]['ticks']>0,-q[6],q[1]));radius=best[2];gaps=best[3]
  # Smallest displacement achieving 8px all-mask clearance, if possible.
  comfortable=[q for q in options if q[0]>=8]
  if comfortable:best=max(comfortable,key=lambda q:q[1]);radius=best[2];gaps=best[3]
  dx+=best[4];dy+=best[5]
  item={'radius':float(radius),'dx':dx,'dy':dy,'size':size,'inkWidth':m['width'],'inkHeight':m['height'],'clearance':gaps,'status':'comfortable' if min(gaps.values())>=8 else 'tight' if min(gaps.values())>0 else 'contact'}
  layout[v][n]=item;rows.append({'variant':v,'number':n,**item})
(e/'clearance.json').write_text(json.dumps({'method':'DejaVu Serif fallback; 1024px raster, low-chroma silver including ring/leaves/stems/beads +2px dilation; explicit ticks with conservative stroke; bezel r471. Estimates, not vector-perfect or Safari certification.','comfortThreshold':8,'rows':rows},indent=2))
(p/'layout.mjs').write_text('export const layout='+json.dumps(layout,separators=(',',':'))+';\n')
Image.fromarray((silver*255).astype('uint8')).save(e/'silver-mask.png')
for v in layout:print(v,[(n,z['radius'],min(z['clearance'].values()),z['status']) for n,z in layout[v].items()])
