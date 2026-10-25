"""Compose screenshots and exact measured SVG trajectories; no generated artwork."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw, ImageFont
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=Path('docs/qa/home-v16')
by={c['name']:c for c in json.loads((p/'captures.json').read_text())}
# The after-right capture is also the paused 0ms frame.
shutil.copyfile(p/'after-right.jpg',p/'sequence-right-0.jpg')
by['sequence-right-0']=dict(by['after-right'],name='sequence-right-0')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
for n,c in by.items():
 im=Image.open(p/(n+'.jpg'));r=c['frameRect'];w=round(r['width']);x=(im.width-w)//2;y=round(max(q['frameRect']['y'] for q in by.values()));im.crop((x,y,x+w,y+round(r['height']))).save(p/(n+'-game.png'))
def label(d,xy,text):d.text(xy,text,font=font,fill='#17372d')
out=Image.new('RGB',(1000,290),'#eff4ef');d=ImageDraw.Draw(out)
for i,n in enumerate(['before-left','before-right','after-left','after-right']):
 im=Image.open(p/(n+'-game.png')).crop((75,150,315,380));out.paste(im,(i*250+5,45));label(d,(i*250+7,12),n)
out.save(p/'zzz-before-after.png')
out=Image.new('RGB',(1440,520),'#eff4ef');d=ImageDraw.Draw(out)
for row,side in enumerate(['left','right']):
 for col,t in enumerate([0,900,1800,2700,3600,'wake']):
  n='sequence-wake' if t=='wake' else f'sequence-{side}-{t}';im=Image.open(p/(n+'-game.png')).crop((90,155,300,365));out.paste(im,(col*240+10,row*260+40));label(d,(col*240+12,row*260+10),f'{side} {t}'+('ms' if t!='wake' else ''))
out.save(p/'zzz-sequence.png')
fig,axs=plt.subplots(1,2,figsize=(10,4),layout='constrained')
for ax,prefix in zip(axs,['before','after']):
 for side,color in [('left','#2674b8'),('right','#c8553d')]:
  ps=by[prefix+'-'+side]['paths'][::2];xs=[r['rect']['x']+r['rect']['width']/2 for r in ps];ys=[r['rect']['y']+r['rect']['height']/2 for r in ps];xs=[x-xs[0] for x in xs];ys=[-(y-ys[0]) for y in ys]
  ax.plot(xs,ys,'o-',label='Dog visually '+side,color=color)
  for j,(x,y) in enumerate(zip(xs,ys)):ax.text(x,y,'Z',ha='center',va='bottom',fontsize=12+j*3,color=color)
 ax.set(xlim=(-45,45),ylim=(-8,44),title=prefix+' (first Z aligned)',xlabel='horizontal displacement (CSS px)',ylabel='upward displacement (CSS px)');ax.axvline(0,color='#999',lw=.5);ax.grid(alpha=.2);ax.legend(fontsize=8);ax.set_aspect('equal')
fig.savefig(p/'zzz-trajectory-overlay.png',dpi=140)
anchors={}
for side in ['left','right']:
 a,b=by['before-'+side],by['after-'+side];anchors[side]={k:round((a['paths'][0]['rect'][k]-(a['pet'][k] if k in ['x','y'] else 0))-(b['paths'][0]['rect'][k]-(b['pet'][k] if k in ['x','y'] else 0)),6)for k in ['x','y','width','height']}
(p/'anchor-comparison.json').write_text(json.dumps(anchors,indent=2)+'\n')
assert all(abs(v)<.001 for s in anchors.values()for v in s.values()),anchors
out=Image.new('RGB',(820,580),'#eff4ef');d=ImageDraw.Draw(out)
for row,(a,b,lane) in enumerate([('text-before-short','text-after-hey','speechSlot'),('text-before-long','text-after-long','speechSlot'),('text-before-english','text-after-english','speechSlot'),('notice-before-short','notice-after-short','homeEventSlot')]):
 for col,n in enumerate([a,b]):
  im=Image.open(p/(n+'-game.png'));r=next(x['rect']for x in by[n]['panels']if x['id']==lane);crop=im.crop((0,max(0,round(r['top'])-8),im.width,round(r['bottom'])+8));out.paste(crop,(col*410+10,row*145+35));label(d,(col*410+10,row*145+8),n)
out.save(p/'text-before-after.png')
out=Image.new('RGB',(1000,510),'#eff4ef');d=ImageDraw.Draw(out)
for i in range(8):
 n=f'stage-{i}';im=Image.open(p/(n+'-game.png')).crop((70,150,320,360));x=i%4*250;y=i//4*255;out.paste(im,(x,y+35));label(d,(x+8,y+8),f'Dog stage {i+1} / 8')
out.save(p/'zzz-stages.png')
print('Screenshots:',len(by),'anchors unchanged:',anchors)
