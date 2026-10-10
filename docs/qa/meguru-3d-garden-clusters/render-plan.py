import json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Circle
p=Path(__file__).parent
before=json.load(open(p/'plan-before.json'));after=json.load(open(p/'plan-after.json'))
fig,axes=plt.subplots(4,2,figsize=(10,14),layout='constrained')
for row in range(4):
 for col,data in enumerate([before,after]):
  s=data['scenes'][row];ax=axes[row,col];a=s['collision'].get('ang',0);fx,fz=math.cos(a),-math.sin(a);sx,sz=math.sin(a),math.cos(a)
  def local(x,z):return ((x-s['x'])*sx+(z-s['z'])*sz,(x-s['x'])*fx+(z-s['z'])*fz)
  def partrect(q,color,alpha=1):
   ang=q.get('ang',0);cx=s['x']+q.get('dx',0);cz=s['z']+q.get('dz',0)
   pts=[local(cx+math.cos(ang)*f+math.sin(ang)*side,cz-math.sin(ang)*f+math.cos(ang)*side) for f,side in [(-q['rz'],-q['rx']),(-q['rz'],q['rx']),(q['rz'],q['rx']),(q['rz'],-q['rx'])]]
   ax.add_patch(Polygon(pts,facecolor=color,edgecolor='#584936',lw=1,alpha=alpha))
  road=s['road'];ra,rb=road['a'],road['b'];dx,dz=rb['x']-ra['x'],rb['z']-ra['z'];L=math.hypot(dx,dz);nx,nz=-dz/L*road['half'],dx/L*road['half']
  ax.add_patch(Polygon([local(ra['x']+nx,ra['z']+nz),local(rb['x']+nx,rb['z']+nz),local(rb['x']-nx,rb['z']-nz),local(ra['x']-nx,ra['z']-nz)],facecolor='#dfd4b9',edgecolor='#b5a887'))
  partrect(s['body'],'#b5aea0');ax.text(0,0,s['id'],ha='center',fontsize=9)
  for q in s['garden']:
   if q['shape']=='box' and q.get('h')==8:partrect(q,'#ab815d',.7)
  for q in s['housePlants']+s['garden']:
   xy=local(s['x']+q.get('dx',0),s['z']+q.get('dz',0))
   if q['shape']=='flower':ax.add_patch(Circle(xy,q['r'],facecolor='#d66b95',edgecolor='#8c4969',alpha=.65,lw=.5))
   elif q['shape']=='crown':ax.add_patch(Circle(xy,q['r'],facecolor='#6d984e',alpha=.6))
   elif q['shape']=='stone':ax.add_patch(Circle(xy,9,facecolor='#849095',edgecolor='#4e5c64',lw=.7))
  door=s['door'];xy=local(s['x']+door.get('dx',0),s['z']+door.get('dz',0));ax.plot(*xy,'s',color='#177eab',markersize=5)
  ax.set(xlim=(-155,155),ylim=(-90,220),aspect='equal',facecolor='#f1f5e9',title=('Before 1e2caad' if col==0 else 'After: garden groups')+' / '+s['id'])
  ax.tick_params(labelsize=8);ax.set_xlabel('Lateral distance');ax.set_ylabel('Front distance')
fig.suptitle('Garden placement from production descriptors\nPink: flowers · brown: beds · grey: stones · blue: entrance\nPlan view only — not a 3D/browser screenshot',fontsize=14)
fig.savefig(p/'plan-comparison.png',dpi=130)
