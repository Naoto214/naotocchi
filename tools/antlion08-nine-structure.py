#!/usr/bin/env python3
"""Read-only sprite analysis; writes QA JSON, never edits images."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage
import json,hashlib
R=Path(__file__).resolve().parents[1];O=R/'docs/qa/antlion08-method-d-nine-20260928'
states=['happy','strained','hungry','sick','sulky','weak','critical','wantsPlay','sleeping']
paths={'normal':R/'assets/characters/antlion/08.png','D4_tired':R/'assets/characters/expressions/antlion/08-tired.png',**{s:O/f'candidates/{s}.png' for s in states}}
arr={s:np.array(Image.open(p).convert('RGBA')) for s,p in paths.items()}
rois={'head_face':[86,52,110,71],'antennae':[76,20,122,54],'wing_upper':[7,8,88,73],'wing_lower':[30,67,79,116],'abdomen':[58,68,89,112],'legs':[73,65,109,116],'outer_trail':[8,95,35,117],'crossing':[52,83,110,119]}
def mask(b):
 m=np.zeros((128,128),bool);x,y,r,b=b;m[y:b,x:r]=True;return m
traces=[[(85,81),(85,89),(82,95),(79,100),(74,104)],[(88,78),(91,86),(91,91),(88,99),(83,107)],[(94,76),(98,80),(98,87),(95,94)],[(101,72),(104,77),(104,82),(103,85)]]
ant=[[(96,54),(95,44),(91,34),(87,28),(81,29)],[(100,54),(105,43),(112,33),(118,34)]]
normal=arr['normal'];results={}
for s,a in arr.items():
 occupied=a[:,:,3]>0;lab,n=ndimage.label(occupied,np.ones((3,3)));sizes=np.bincount(lab.ravel());largest=int(np.argmax(sizes[1:])+1);main=lab==largest
 y,x=np.where(occupied);checks=[]
 for part,lines,width,radius in [('visible_leg',traces,7,2),('antenna',ant,7,3)]:
  for j,line in enumerate(lines):
   corridor=Image.new('L',(128,128));ImageDraw.Draw(corridor).line(line,fill=1,width=width)
   ll,_=ndimage.label((np.array(corridor)>0)&occupied,np.ones((3,3)))
   def ids(pt):
    px,py=pt;return set(ll[py-radius:py+radius+1,px-radius:px+radius+1].ravel())-{0}
   checks.append({'part':part,'route':j+1,'polyline':line,'corridor_width':width,'probe_radius':radius,'connected':bool(ids(line[0])&ids(line[-1]))})
 stats={}
 for part,bb in rois.items():
  m=mask(bb);no=normal[:,:,3]>0;u=(no|occupied)&m;inter=(no&occupied)&m
  stats[part]={'roi':bb,'normal_occupied':int((no&m).sum()),'candidate_occupied':int((occupied&m).sum()),'silhouette_xor':int(((no^occupied)&m).sum()),'silhouette_iou':float(inter.sum()/u.sum()),'occupied_RGBA_difference':int((np.any(a!=normal,axis=2)&u).sum()),'note':'review ROI overlaps adjacent anatomy, not exact anatomical segmentation'}
 # Detached dark pixels in leg review area are warning evidence only, not automatic deletion.
 leg=mask(rois['legs']);detached=occupied&~main&leg
 results[s]={'path':str(paths[s].relative_to(R)),'sha256':hashlib.sha256(paths[s].read_bytes()).hexdigest(),'bounds':[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)],'alpha_values':[int(v) for v in np.unique(a[:,:,3])],'components':int(n),'main_pixels':int(sizes[largest]),'independent_pixels':int(occupied.sum()-sizes[largest]),'routes':checks,'parts':stats,'detached_leg_roi_pixels':int(detached.sum()),'failed_route_probes':[c['part']+str(c['route']) for c in checks if not c['connected']]}
record={'source_head':'7fda30732e39e365b486a746e0a731558a351f9a','registration':'same approved128canvas/bounds; no rotation/warping or matching anatomy by editing','results':results,'limits':['Connectivity corridors are screening probes and may include adjacent legs; not proof of anatomical leg counts.','Four visually separable outer leg routes are examined, not a claim that all six anatomical legs are separately visible.','Failed fixed-coordinate probes require visual review; no automatic repair.','Natural geometry differences are not classified as failure using a numeric threshold.']}
(O/'structure-audit.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({s:{'components':v['components'],'main':v['main_pixels'],'detached':v['independent_pixels'],'failed_probes':v['failed_route_probes'],'detached_leg_pixels':v['detached_leg_roi_pixels']}for s,v in results.items()}))
