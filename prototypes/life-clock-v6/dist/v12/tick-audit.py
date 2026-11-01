import json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
p=Path(__file__).parent;e=p/'evidence';entries=json.loads((e/'masks.json').read_text());result={}
for kind in ['growth','end']:
 image=Image.new('L',(1024,1024));d=ImageDraw.Draw(image)
 if kind=='growth':
  for cx,cy in [(326,500),(698,500)]:
   for i in range(20):
    a=i*math.pi/10;r=77 if i%2 else 72;d.line((cx+82*math.sin(a),cy-82*math.cos(a),cx+r*math.sin(a),cy-r*math.cos(a)),fill=255,width=2)
 else:
  for i in range(12):
   a=i*math.pi/6;d.line((512+87*math.sin(a),688-87*math.cos(a),512+84*math.sin(a),688-84*math.cos(a)),fill=255,width=2)
 dist=distance_transform_edt(np.array(image)==0)
 for option in ['G0','G1','G2','R0','R1','R2','S1','S2','S3']:
  group=[x for x in entries if x['option']==option and x['kind']==kind]
  gaps=[(float(dist[np.array(Image.open(e/'masks'/x['file']))[:,:,3]>24].min()),x['number']) for x in group];result.setdefault(option,{})[kind]=min(gaps)
(e/'tick-clearance.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
