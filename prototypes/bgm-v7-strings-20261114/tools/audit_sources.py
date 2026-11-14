"""Measured recording/phrase audit. Noise proxies are not subjective quality scores."""
import pathlib,json,sys,os
import numpy as np,soundfile as sf
from scipy.signal import correlate,welch
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114';SR=44100
sys.path.insert(0,str(V7/'tools'));from strings import Strings

def measure(path,midi):
 x,sr=sf.read(path,always_2d=True);m=x.mean(1);hop=round(sr*.02);n=len(m)//hop
 env=np.sqrt(np.mean(m[:n*hop].reshape(n,hop)**2,1)+1e-20);stable=np.median(env[round(.6/.02):round(3/.02)])
 first=np.where(env>stable*.5)[0];onset=float(first[0]*.02) if len(first) else None
 pitches=[];ratios=[];expected=440*2**((midi-69)/12)
 for t in np.arange(.6,min(4,len(m)/sr-.2),.08):
  z=m[round(t*sr):round(t*sr)+8192]
  if len(z)<8192:continue
  a=correlate(z,z,method='fft')[len(z)-1:];lo=round(sr/expected*.91);hi=round(sr/expected*1.09);k=lo+int(np.argmax(a[lo:hi+1]));freq=sr/k
  pitches.append(1200*np.log2(freq/expected));f,p=welch(z,fs=sr,nperseg=8192)
  distance=np.abs(f/freq-np.round(f/freq))*freq;harm=distance<max(12,freq*.055);band=(f>100)&(f<8000)
  ratios.append(float(10*np.log10((p[band&~harm].sum()+1e-30)/(p[band].sum()+1e-30))))
 return {'seconds':round(len(x)/sr,4),'rootMidi':midi,'onsetToHalfSustainSeconds':onset,'sustainRmsRangeP95P05Db':round(float(20*np.log10(np.percentile(env[30:150],95)/max(np.percentile(env[30:150],5),1e-12))),2),'pitchMedianCents':round(float(np.median(pitches)),2),'pitchP95P05Cents':round(float(np.percentile(pitches,95)-np.percentile(pitches,5)),2),'nonHarmonicEnergyDb':round(float(np.median(ratios)),2),'clippedSamples':int((np.abs(x)>=.9999).sum()),'peakDbfs':round(float(20*np.log10(np.abs(x).max()+1e-30)),2)}

def audit():
 manifest=json.loads((V7/'samples-v7.json').read_text());records=[]
 for f in manifest['files']:
  p=pathlib.Path(os.environ['VSCO_DIR'])/f['path'];records.append({'library':'VSCO','path':f['path'],**measure(p,f['rootMidi'])})
 # Viola is absent from V7-B; audit inherited V6 soft sustains separately, never add a new voice.
 for p in sorted((pathlib.Path(os.environ['VSCO_DIR'])/'Strings/Viola Section/susvib').glob('*_v1_1.wav')):
  import re
  match=re.search(r'_([A-G])([#b]?)(\d)_',p.name)
  if not match:continue
  n,acc,octave=match.groups();midi=12*(int(octave)+2)+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[n]+({'#':1,'b':-1,'':0}[acc]);records.append({'library':'VSCO viola (unused in V7-B)','path':str(p.relative_to(os.environ['VSCO_DIR'])),**measure(p,midi)})
 for p in sorted(pathlib.Path('/workspace/work/karoryfer-cello/Samples/sus').glob('*.wav')):
  note=p.stem.split('_')[0];pc={'C':0,'Eb':3,'Gb':6,'A':9}[note[:-1]];midi=(int(note[-1])+2)*12+pc
  records.append({'library':'Karoryfer cello candidate','path':str(p.relative_to('/workspace/work/karoryfer-cello')),**measure(p,midi)})
 scores=json.loads((V7/'scores-b.json').read_text())[:4];lib=Strings();joins=[]
 for s in scores:
  beat=60/s['bpm'];bar=beat*s['meter']
  for inst in ('violin_solo','cello_chamber'):
   ev=sorted((e for e in s['events'] if e['instrument']==inst),key=lambda e:e['t']);bus=np.zeros((round(s['period']*SR),2))
   for e in ev:
    x=lib.note(inst,e['midi'],e['dur'],e['vel']);st=round(e['t']*SR);n=min(len(x),len(bus)-st);bus[st:st+n]+=x[:n]
   mono=np.mean(bus,1);hop=round(.02*SR);env=np.sqrt(np.mean(mono[:len(mono)//hop*hop].reshape(-1,hop)**2,1)+1e-25)
   for e,n in zip(ev,ev[1:]):
    gap=n['t']-e['t']-e['dur'];candidate=(n['t']-e['t']<=bar*1.04 and gap<=beat*1.45)
    t=n['t'];near=env[max(0,int((t-.55)/.02)):int((t+.4)/.02)];ref=np.median(env[int((e['t']+.4)/.02):int((e['t']+e['dur']-.1)/.02)])
    joins.append({'id':s['id'],'instrument':inst,'at':round(t,5),'fromMidi':e['midi'],'toMidi':n['midi'],'writtenGapSeconds':round(gap,5),'candidateJoin':candidate,'minimumRelativeRmsDb':round(float(20*np.log10(max(near.min(),1e-12)/max(ref,1e-12))),2),'belowMinus24DbSeconds':round(float(np.sum(near<ref*10**(-24/20))*.02),3)})
 out={'method':'20ms RMS; 8192-frame autocorrelation near expected pitch; nonharmonic Welch energy proxy includes natural bow sound and section beating, not an isolated noise floor. V7 uses no sample-loop synthesis. Viola not present in B.','recordings':records,'joins':joins}
 (ROOT/'source-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
 print('recordings',len(records),'joins',len(joins),'candidate gaps below -24dB',sum(x['candidateJoin'] and x['belowMinus24DbSeconds']>0 for x in joins))
if __name__=='__main__':audit()
