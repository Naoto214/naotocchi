import runpy,json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
p=Path(__file__).parent;e=p/'evidence';ctx=runpy.run_path(str(p/'audit.py'));dists=ctx['dists'];layout=ctx['layout'];entries=json.loads((e/'masks.json').read_text());out=[]
for option in dict.fromkeys(x['option'] for x in entries):
 row={'option':option}
 for kind in ['main','growth','end']:
  es=[x for x in entries if x['option']==option and x['kind']==kind];masks=[np.array(Image.open(e/'masks'/x['file']))[:,:,3]>24 for x in es]
  gaps=[]
  for i,m in enumerate(masks):
   distance=distance_transform_edt(~m)
   for j in range(i+1,len(masks)):gaps.append((float(distance[masks[j]].min()),es[i]['number'],es[j]['number']))
  best=min(gaps);row[kind]={'minimumPairGap':round(best[0],2),'pair':best[1:]}
  if kind=='main':
   row['main']['clearance']=[{'number':x['number'],**{k:round(float(z[m].min()),2) for k,z in dists.items()}}for x,m in zip(es,masks)]
   if option.startswith('M'):
    size=[50,52,54,56][int(option[1])]
    for x,m in zip(es,masks):
     q=layout[size][int(x['number'])];q['clearance']={k:round(float(z[m].min()),2) for k,z in dists.items()};v=min(q['clearance'].values());q['status']='comfortable' if v>=8 else 'tight' if v>0 else 'contact'
 out.append(row)
 print(option,'growth',row['growth'],'roman',row['end'])
(e/'final-clearance.json').write_text(json.dumps({'method':'Final SVG glyph raster, original 1024 coordinates, substitute fonts; adjacent glyph gaps, not physical or Safari validation.','options':out},indent=2))
(p/'layout.mjs').write_text('export const layout='+json.dumps(layout)+';\n')
rows=[{'size':s,'number':n,**q}for s,ns in layout.items()for n,q in ns.items()]
(e/'clearance.json').write_text(json.dumps({'method':'Final fractional SVG glyphs, inherited conservative silver mask, substitute fonts. Not Safari certification.','rows':rows},indent=2))
