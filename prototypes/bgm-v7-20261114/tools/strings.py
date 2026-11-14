"""Recorded chamber strings: complete-source cache, no looping/time synthesis.
Only pinned soft recordings; normal pitch resampling <=2 semitones. Calibration
uses the stable sustain, not noisy bow onsets. V6 piano uses another renderer.
"""
import pathlib,os,json,hashlib,math
from fractions import Fraction
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
ROOT=pathlib.Path(__file__).resolve().parents[1];SR=44100
class Strings:
 def __init__(self):
  self.root=pathlib.Path(os.environ['VSCO_DIR']);self.manifest=json.loads((ROOT/'samples-v7.json').read_text())['files'];self.loaded={};self.cache={};self.synthetic_loops=0;self.uses=[]
 def load(self,inst):
  if inst in self.loaded:return
  zones=[]
  for f in self.manifest:
   if f['instrument']!=inst:continue
   p=self.root/f['path'];data=p.read_bytes()
   if hashlib.sha256(data).hexdigest()!=f['sha256']:raise ValueError('Changed sample '+f['path'])
   x,sr=sf.read(p,always_2d=True,dtype='float32');x=x[:,:2]
   if x.shape[1]==1:x=np.repeat(x,2,axis=1)
   if sr!=SR:x=resample_poly(x,SR,sr,axis=0).astype(np.float32)
   # Keep 25ms before the actual onset, rather than repeating any attack segment.
   a=np.abs(x).max(1);start=max(0,int(np.argmax(a>a.max()*.015))-round(.025*SR));x=x[start:]
   x=sosfilt(butter(2,35 if inst=='cello_chamber' else 65,fs=SR,btype='highpass',output='sos'),x,axis=0).astype(np.float32)
   rms=float(np.sqrt(np.mean(x[round(.5*SR):round(2.5*SR)]**2))+1e-12)
   zones.append((f['rootMidi'],x,rms,f['path']))
  target=float(np.median([z[2] for z in zones]));self.loaded[inst]=[(m,x*float(np.clip(target/r,10**(-8/20),10**(8/20))),p) for m,x,r,p in zones]
 def note(self,inst,midi,dur,vel):
  self.load(inst);root,src,path=min(self.loaded[inst],key=lambda z:(abs(z[0]-midi),z[0]))
  if abs(midi-root)>2:raise ValueError(f'Outside verified sample range: {inst} {midi}')
  key=(inst,midi,root)
  if key not in self.cache:
   q=Fraction(2**((root-midi)/12)).limit_denominator(1000)
   self.cache[key]=resample_poly(src,q.numerator,q.denominator,axis=0).astype(np.float32) if root!=midi else src.copy()
  release=.38 if inst=='violin_solo' else .42;n=round((dur+release)*SR);x=self.cache[key]
  if len(x)<n:raise ValueError(f'Native recording too short, do not loop: {inst} {midi} {dur}')
  out=x[:n].copy();attack=round((.12 if inst=='violin_solo' else .17)*SR);out[:attack]*=np.sin(np.linspace(0,math.pi/2,attack))[:,None]**2
  st=round(dur*SR);out[st:]*=np.cos(np.linspace(0,math.pi/2,n-st))[:,None]**2
  self.uses.append({'instrument':inst,'midi':midi,'rootMidi':root,'transpose':midi-root,'seconds':dur,'nativeSeconds':round(len(x)/SR,4),'sample':path})
  return out*vel
