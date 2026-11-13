from pathlib import Path
import json,math,numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt
p=Path(__file__).parent;y,x=np.mgrid[:1200,:1200];silver=np.zeros((1200,1200),bool);silver[100:1124,88:1112]=np.array(Image.open(p/'../v16/evidence/silver-mask.png'))>0;rows=[]
for v,scale in [('V16',1),('A',1),('B',1.05),('C',1.1)]:
 ticks=Image.new('L',(1200,1200));d=ImageDraw.Draw(ticks)
 for n in range(60):
  a=n*math.pi/30;r=432*scale;rr=r-(5 if n%5 else 10);d.line((600+rr*math.sin(a),600-rr*math.cos(a),600+r*math.sin(a),600-r*math.cos(a)),fill=255,width=3 if n%5==0 else 2)
 ds={k:distance_transform_edt(~m) for k,m in {'silver':silver,'ticks':np.array(ticks)>0,'bezel':np.hypot(x-600,y-595)>=473*scale-2}.items()}
 for n in range(1,13):
  ink=np.array(Image.open(p/f'evidence/{v}-{n}.png'))[:,:,3]>24;yy,xx=np.where(ink);cx=(xx.min()+xx.max())/2;cy=(yy.min()+yy.max())/2;a=n*math.pi/6;cross=(cx-600)*math.cos(a)+(cy-600)*math.sin(a);rows.append({'variant':v,'number':n,'inkCenter':[cx-88,cy-100],'axisOffset':round(float(cross),3),**{k:round(float(m[ink].min()),2) for k,m in ds.items()}})
(p/'evidence/clearance.json').write_text(json.dumps({'method':'1200 raster / 1design px per pixel. alpha>24 bounding-box ink centers; V16 conservative silver mask +2px, shadow r347 +/-6; thick tick masks; font fallback, Safari not verified','rows':rows},indent=2));print({v:{'minGap':min(min(r[k] for k in ['silver','ticks','bezel']) for r in rows if r['variant']==v),'axisMax':max(abs(r['axisOffset']) for r in rows if r['variant']==v),'ten':next(r for r in rows if r['variant']==v and r['number']==10)} for v in ['V16','A','B','C']})
