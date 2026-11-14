"""Full native takes, source-specific stable starts, bounded slow level calibration.
No looping, time stretch, synthetic vibrato or denoising gate. Pitch resampling
retains recorded vibrato; a measured constant offset centers recording intonation.
"""
import pathlib,os,json,hashlib
from fractions import Fraction
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
from scipy.ndimage import gaussian_filter1d
ROOT=pathlib.Path(__file__).resolve().parents[1];SR=44100
class NativeStrings:
 def __init__(self,variant):
  assert variant in ('b1','b2');self.variant=variant;self.files=[f for f in json.loads((ROOT/'samples.json').read_text())['files'] if variant in f['variants']];self.sources={};self.pitched={};self.uses=[]
 def load(self,inst):
  if inst in self.sources:return
  zones=[]
  for f in self.files:
   if f['instrument']!=inst:continue
   root=pathlib.Path(os.environ['VSCO_DIR'] if f['library']=='vsco' else os.environ.get('KARORYFER_DIR','/workspace/work/karoryfer-cello'));p=root/f['path']
   if hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Changed recording '+str(p))
   x,sr=sf.read(p,always_2d=True,dtype='float32');x=x[:,:2]
   if x.shape[1]==1:x=np.repeat(x,2,axis=1)
   if sr!=SR:x=resample_poly(x,SR,sr,axis=0)
   x=x[round(f['startSeconds']*SR):].copy();x=sosfilt(butter(2,65 if inst=='violin_solo' else 35,fs=SR,btype='highpass',output='sos'),x,axis=0)
   # 50ms RMS and 300ms smoothing affect slow take-level drift, not bow/vibrato cycles.
   hop=round(.05*SR);n=len(x)//hop;env=np.sqrt(np.mean(x[:n*hop].reshape(n,hop,2)**2,axis=(1,2))+1e-20);db=20*np.log10(env+1e-20);trend=gaussian_filter1d(db,6,mode='nearest');target=float(np.median(trend[4:60]));correction=np.clip(target-trend,-3,3)
   gain=10**(np.interp(np.arange(len(x)),(np.arange(n)+.5)*hop,correction)/20);x*=gain[:,None]
   stable=np.sqrt(np.mean(x[round(.25*SR):round(2.5*SR)]**2));x*=.035/max(stable,1e-12)
   zones.append((f,x.astype(np.float32)))
  self.sources[inst]=zones
 def note(self,e,velocity):
  inst=e['instrument'];self.load(inst);f,x=min(self.sources[inst],key=lambda z:(abs(z[0]['rootMidi']-e['midi']),z[0]['rootMidi']))
  root=f['rootMidi'];transpose=e['midi']-root
  if abs(transpose)>2:raise ValueError('Outside verified pitch range')
  key=(inst,e['midi'],f['path'])
  if key not in self.pitched:
   q=Fraction(2**((root-e['midi']-f['tuningCorrectionCents']/100)/12)).limit_denominator(10000);self.pitched[key]=resample_poly(x,q.numerator,q.denominator,axis=0).astype(np.float32)
  full=self.pitched[key];start=round(e['sourceOffset']*SR);n=round((e['sustain']+e['release'])*SR)
  if start+n>len(full):raise ValueError('Native take too short for connected run; do not loop')
  out=full[start:start+n].copy();attack=min(round(e['attack']*SR),n);release_start=round(e['sustain']*SR)
  incoming=np.sin(np.linspace(0,np.pi/2,attack));outgoing=np.cos(np.linspace(0,np.pi/2,n-release_start))
  # Same-pitch continuous takes are correlated: complementary linear-power weights, not +3dB equal-power addition.
  if not e['connectedIn'] or e['samePitchIn']:incoming**=2
  if not e['connectedOut'] or e['samePitchOut']:outgoing**=2
  out[:attack]*=incoming[:,None];out[release_start:]*=outgoing[:,None]
  self.uses.append({'instrument':inst,'midi':e['midi'],'sample':f['path'],'library':f['library'],'rootMidi':root,'transpose':transpose,'intonationCorrectionCents':f['tuningCorrectionCents'],'nativeFrames':len(full),'usedEndFrame':start+n,'sourceOffset':e['sourceOffset'],'t':e['t'],'syntheticLoops':0})
  return out*velocity
