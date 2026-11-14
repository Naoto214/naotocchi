from PIL import Image
from pathlib import Path
import json,re,math
root=Path(__file__).resolve().parent;im=Image.open(root/'contrast-bg.jpg').convert('RGB');regs=json.loads((root/'contrast-regions.json').read_text())
def lum(rgb):
 v=[c/255 for c in rgb];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(x*w for x,w in zip(v,[.2126,.7152,.0722]))
def ratio(a,b):
 x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
rows=[]
for r in regs:
 vals={}
 for part in ['title','brand']:
  box=r[part];ink=[int(x) for x in re.findall(r'\d+',r[part+'Ink'])];pix=im.crop((math.ceil(box['x']),math.ceil(box['y']),math.floor(box['x']+box['width']),math.floor(box['y']+box['height'])));rs=sorted(ratio(ink,p) for p in pix.getdata());vals[part+'Min']=round(min(rs),2)
 rows.append({k:r[k] for k in ['id','variant','color']}|vals)
report={'method':'Chrome screenshot of identical CSS card background with text hidden; entire title and signature boxes sampled at 140 CSS px. Gold botanical strokes excluded; JPEG quantization applies. Not a WCAG conformance claim or physical iPhone test.','rows':rows}
(root/'contrast-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
