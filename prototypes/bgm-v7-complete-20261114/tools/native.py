"""V7 completion: full native takes, nearby registers, score-aware release.
Never loop/stretch a sustain recording; never infer polyphonic legato.
"""
import pathlib,sys,json,hashlib,bisect
from fractions import Fraction
import numpy as np
from scipy.signal import resample_poly
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));import render_v6 as V
sys.path.insert(0,str(BASE/'bgm-v7-strings-20261114/tools'));from sampler import NativeStrings
from policies import POLICIES
L=V.L;SR=L.SR
class Library(L.Library):
 def __init__(self,score=None):
  super().__init__();self.score=score;self.events=[] if score is None else [e for e in score['events'] if e['instrument']!='shell'];self.index=0;self.uses=[];self.paths={};self.strings=NativeStrings('b2')
  self.mode,self.solo,_=POLICIES.get(score['id'] if score else '',('light',False,''))
  self.boundaries=sorted({e['t'] for e in self.events if e['role']=='pad'})
 def load(self,inst):
  if inst in self.loaded:return
  manifest={f['path']:f for f in json.loads((BASE/'bgm-v2-20261112/samples-manifest.json').read_text())['files']}
  groups={}
  for p in sorted(L.VSCO.glob(L.SPEC[inst]['glob'])):
   rel=p.relative_to(L.VSCO).as_posix();f=manifest[rel]
   if hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Source changed: '+rel)
   groups.setdefault((L.SPEC[inst]['root'](p),L.SPEC[inst]['layer'](p)),[]).append(f)
  self.paths[inst]=groups;super().load(inst)
 def pick(self,inst,midi,layer):
  zs=self.zones[inst]
  if L.SPEC[inst]['kind']=='sustain':
   nearest=min(abs(z[0]-midi) for z in zs)
   zs=[z for z in zs if abs(z[0]-midi)<=max(2,nearest)]
   root,chosen,rrs=min(zs,key=lambda z:(abs(z[1]-layer),abs(z[0]-midi),z[0]<midi))
  else:
   avail=sorted({z[1] for z in zs});chosen=min(avail,key=lambda l:abs(l-layer));root,chosen,rrs=min((z for z in zs if z[1]==chosen),key=lambda z:(abs(z[0]-midi),z[0]<midi))
  k=(inst,root,chosen);i=self.rr.get(k,0);self.rr[k]=i+1
  return root,rrs[i%len(rrs)],i%len(rrs),chosen
 def shifted(self,inst,root,layer,rri,src,semis,maxlen):
  key=(inst,root,layer,rri,semis)
  if key not in self.cache:
   if semis:
    f=Fraction(2**(-semis/12)).limit_denominator(1000);x=resample_poly(src,f.numerator,f.denominator,axis=0).astype(np.float32)
   else:x=src
   self.cache[key]=x
  return self.cache[key]
 def articulation(self,e,inst,dur):
  strings=inst in ('violins','violas','cellos');slow=self.mode in ('lyrical','air')
  attack=min(dur*.2,.065 if strings else L.SPEC[inst].get('attack',.02))
  release=(.32 if slow else .13) if strings else (.19 if slow else .12)
  if e:
   end=e['t']+dur
   if e['role']=='pad':
    i=bisect.bisect_right(self.boundaries,e['t']+1e-6)
    if i<len(self.boundaries):release=min(release,max(.025,self.boundaries[i]-end+.025))
   # No gap filling; release only, capped near following onset in the same voice.
   nxt=[q['t'] for q in self.events if q['instrument']==inst and q['role']==e['role'] and q['t']>e['t']+1e-6]
   if nxt:release=min(release,max(.025,min(nxt)-end+.025))
  return attack,release
 def note(self,inst,midi,dur,vel,layer):
  e=None
  if self.events:
   e=self.events[self.index];self.index+=1
   if (e['instrument'],e['midi'],e['dur'])!=(inst,midi,dur):raise ValueError('Event order changed')
  self.load(inst);spec=L.SPEC[inst]
  if self.solo and inst=='cellos' and e and e['role']=='bass':
   attack,release=self.articulation(e,inst,dur)
   se=dict(instrument='cello_chamber',midi=midi,t=e['t'],sustain=dur,release=release,attack=max(attack,.08),sourceOffset=0,connectedIn=False,connectedOut=False,samePitchIn=False,samePitchOut=False)
   x=self.strings.note(se,vel);self.uses.append({**self.strings.uses[-1],'role':e['role'],'attack':se['attack'],'release':release});return x
  root,src,rri,chosen=self.pick(inst,midi,layer);semis=0 if spec['kind']=='hit' else midi-root
  full=self.shifted(inst,root,chosen,rri,src,semis,0)
  attack=0;release=spec['release']
  if spec['kind']=='sustain':
   if abs(semis)>2:raise ValueError(f'Unverified register {inst} {midi} root {root}')
   attack,release=self.articulation(e,inst,dur);n=round((dur+release)*SR)
   if n>len(full):raise ValueError(f'Native take too short: {inst} {midi} {n}/{len(full)}')
   x=full[:n].copy();a=min(n,max(1,round(attack*SR)));x[:a]*=np.sin(np.linspace(0,np.pi/2,a))[:,None]**2
   st=round(dur*SR);x[st:]*=np.cos(np.linspace(0,np.pi/2,n-st))[:,None]**2
  else:
   ring=spec.get('maxring',2.)
   if inst=='piano':ring=min(ring,dur+release)
   else:ring=max(ring if spec['kind']=='hit' else min(ring,max(dur*1.6+release,.6)),.1)
   n=min(len(full),round(ring*SR));x=full[:n].copy();f=min(n,int(release*SR*.5))
   if f:x[-f:]*=np.cos(np.linspace(0,np.pi/2,f))[:,None]**2
   if inst=='piano' and V.V4._soft['db']>0:x*=10**(-V.V4._soft['db']*np.exp(-np.arange(n)/SR/.30)/20)[:,None]
  source=self.paths[inst][root,chosen][rri]
  self.uses.append(dict(instrument=inst,midi=midi,role=e['role'] if e else None,t=e['t'] if e else 0,sample=source['path'],sha256=source['sha256'],library='vsco',rootMidi=root,transpose=semis,requestedLayer=layer,selectedLayer=chosen,nativeFrames=len(full),usedEndFrame=n,attack=attack,release=release,syntheticLoops=0))
  return x*vel
