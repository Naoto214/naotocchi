"""Explicit phrase expression over immutable V5 sample-level correction.
No new notes, pitch changes, random expression, or new instruments.
Bar coordinates are zero-based; the per-track profiles are the musical score.
"""
import copy,json,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
V5=ROOT.parent/'bgm-v5-20261115'
def curve(points,x):
 if x<=points[0][0]:return points[0][1]
 for (a,u),(b,v) in zip(points,points[1:]):
  if x<=b:
   t=(x-a)/(b-a); t=t*t*(3-2*t)
   return u+(v-u)*t
 return points[-1][1]
def window_gain(windows,bar):
 # Half-bar soft entrances/exits, and -7 dB outside selected phrases.
 amount=0.
 for a,b in windows:
  if a<=bar<=b:amount=1.
  elif a-.5<bar<a:amount=max(amount,(bar-a+.5)/.5)
  elif b<bar<b+.5:amount=max(amount,(b+.5-bar)/.5)
 return -7*(1-amount)
def build():
 src=json.loads((V5/'scores-v5.json').read_text());cfg=json.loads((ROOT/'profiles.json').read_text())
 for s in src:
  c=cfg[s['id']];bar=60/s['bpm']*s['meter'];night=s['id']=='home-night'
  for e in s['events']:
   x=e['t']/bar;local=x%s['bars'];g=curve(c['arc'],x);role=e['role']
   if role=='melody':delta=g
   elif role=='bass':delta=.3*g
   elif role in ('counter','response','doubling'):
    delta=.65*g+window_gain(c['voiceWindows'],local)
    # Responding line emerges while doubling steps behind it.
    if role=='doubling' and any(z['role']=='response' and abs(z['t']-e['t'])<bar*.75 for z in s['events']):delta-=2
   elif role=='pad':delta=.8*g+window_gain([(s['bars']*.5,s['bars']*.9)],local)*.35
   elif role=='percussion':delta=.25*g
   else:delta=(.25 if night else .5)*g
   delta=round(delta,5);e['vel']*=10**(delta/20);e['expressionDb']=delta
  s['v6']={'method':'explicit phrase curves and existing voice windows','profile':c,'newNotes':0,'baseline':'0cf8100d3ad85888f5e32f670a56631ecb4e82ce'}
 return src
if __name__=='__main__':
 out=build();(ROOT/'scores-v6.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
 print('32 profiles applied; melody notes:',sum(e['role']=='melody' for s in out for e in s['events']))
