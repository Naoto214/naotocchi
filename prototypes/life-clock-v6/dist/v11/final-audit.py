from pathlib import Path
import runpy,json
import numpy as np
from PIL import Image
p=Path(__file__).parent
ctx=runpy.run_path(str(p/'audit.py'));d=ctx['dists'];layout=ctx['layout'];e=p/'evidence'
rows=[]
for v in layout:
 for n,q in layout[v].items():
  alpha=np.array(Image.open(e/f'final-masks/{v}-{n}.png'))[:,:,3];yy,xx=np.where(alpha>24)
  assert len(xx) and min(xx)>0 and min(yy)>0 and max(xx)<1023 and max(yy)<1023
  gaps={k:round(float(z[yy,xx].min()),2) for k,z in d.items()}
  q['clearance']=gaps;q['status']='comfortable' if min(gaps.values())>=8 else 'tight' if min(gaps.values())>0 else 'contact'
  rows.append({'variant':v,'number':n,**q})
  if n==10:print('FINAL',v,gaps)
(p/'layout.mjs').write_text('export const layout='+json.dumps(layout,separators=(',',':'))+';\n')
(e/'clearance.json').write_text(json.dumps({'method':'Final fractional SVG numeral positions rasterized at 1024px in DejaVu Serif fallback. Low-chroma silver mask +2px dilation, conservative ticks, bezel r471. Estimates of source-art segmentation, not Safari certification.','comfortThreshold':8,'rows':rows},indent=2))
