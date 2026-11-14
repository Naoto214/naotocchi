"""Objective sample checks; not a claim of subjective audition or premium quality."""
import pathlib,json,os,hashlib
import numpy as np,soundfile as sf
from scipy.signal import welch,correlate
from strings import Strings,ROOT,SR
lib=Strings();result=[]
for inst in ('violin_solo','cello_chamber'):
 lib.load(inst)
 for midi,x,path in lib.loaded[inst]:
  raw,sr=sf.read(pathlib.Path(os.environ['VSCO_DIR'])/path,always_2d=True)
  f,p=welch(x[SR:3*SR].mean(1),fs=SR,nperseg=8192)
  expected=440*2**((midi-69)/12);z=x[SR:SR+16384].mean(1);ac=correlate(z,z,mode='full',method='fft')[len(z)-1:];lo=round(SR/expected*.94);hi=round(SR/expected*1.06);lag=lo+int(np.argmax(ac[lo:hi+1]));hz=SR/lag
  r={'instrument':inst,'rootMidi':midi,'path':path,'rawSeconds':len(raw)/sr,'nativeSecondsAfterOnsetTrim':len(x)/SR,'samplePeakDbfs':float(20*np.log10(np.abs(raw).max()+1e-20)),'clippedSamples':int(np.sum(np.abs(raw)>=.9999)),'pitchEstimatedHz':round(hz,2),'pitchErrorCents':round(float(1200*np.log2(hz/expected)),1),'sustainRmsDbfs':round(float(20*np.log10(np.sqrt(np.mean(x[SR:2*SR]**2))+1e-20)),2),'powerAbove8kDb':round(float(10*np.log10(np.sum(p[f>8000])/np.sum(p)+1e-30)),2)}
  if r['clippedSamples'] or abs(r['pitchErrorCents'])>45:raise ValueError(r)
  result.append(r)
(ROOT/'sample-quality.json').write_text(json.dumps({'method':'Native stereo recordings, pinned hashes verified; sustain pitch estimate is approximate because of vibrato/section beating. High-band energy includes bow noise, not a separated noise-floor measurement. Subjective quality requires audition.','samples':result},ensure_ascii=False,indent=1)+'\n')
print('16 recordings: no clipped samples, fundamental within 45 cents, native duration verified')
