"""Deterministic sampled arrangement renderer. No live performance is implied."""
import json, math, pathlib, re, struct, subprocess, hashlib, warnings, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt
from fractions import Fraction
ROOT=pathlib.Path(__file__).resolve().parents[1]; SR=32000
warnings.filterwarnings('ignore',category=wavfile.WavFileWarning)

def note_root(path):
 name=path.name
 if 'Player_' in name:return 21+int(name[-7:-4])*2
 m=re.search(r'_([A-G])(#?)(\d)',name);n,sharp,oct=m.groups();pc={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[n]+bool(sharp)
 return (int(oct)+(1 if 'KSHarp' in name else 2))*12+pc

def instrument(p):
 if 'Player_' in p.name:return 'piano'
 if 'Flute' in str(p):return 'flute'
 if 'Marimba' in str(p):return 'marimba'
 if 'Harp' in str(p):return 'harp'
 if 'Glock' in str(p):return 'bell'
 if 'Violin' in str(p):return 'strings'
 if 'Cello' in str(p):return 'cello'

samples={}
for p in (ROOT/'samples').rglob('*.wav'):
 rate,x=wavfile.read(p);dtype=x.dtype
 x=x.astype(np.float64)/(np.iinfo(dtype).max if np.issubdtype(dtype,np.integer) else 1)
 if x.ndim>1:x=x.mean(axis=1)
 x=sosfilt(butter(2,45,fs=rate,btype='highpass',output='sos'),x)
 # Trim only leading silence, retaining the instrument's natural attack.
 ix=np.flatnonzero(abs(x)>max(abs(x))*.006);x=x[max(0,int(ix[0])-int(rate*.003)):]
 x=resample_poly(x,SR,rate).astype(np.float32)
 peak=max(abs(x));x=x*.68/max(peak,1e-8)
 samples.setdefault(instrument(p),[]).append((note_root(p),x,p))
cache={}
def voice(inst,midi,dur):
 key=(inst,midi,round(dur,5))
 if key in cache:return cache[key]
 root,x,p=min(samples[inst],key=lambda s:abs(midi-s[0]))
 ratio=2**((midi-root)/12);f=Fraction(1/ratio).limit_denominator(1024)
 x=resample_poly(x,f.numerator,f.denominator)
 release={'piano':.28,'flute':.18,'strings':.5,'harp':.7,'bell':1.1,'marimba':.3,'cello':.3}[inst]
 length=int((dur+release)*SR);x=x[:length].copy();n=len(x)
 if n<length:x=np.pad(x,(0,length-n))
 start=int(dur*SR);x[start:]*=np.exp(-np.linspace(0,8,len(x)-start))
 attack=int(SR*(.06 if inst=='strings' else .004));x[:attack]*=np.linspace(0,1,attack)
 x[-min(320,len(x)):]*=np.linspace(1,0,min(320,len(x)))
 # Restrained brightness: retain sample character without brittle transients.
 x=sosfilt(butter(2,6500 if inst!='bell' else 4800,fs=SR,output='sos'),x).astype(np.float32)
 cache[key]=x;return x

def vlq(n):
 b=[n&127];n>>=7
 while n:b.insert(0,(n&127)|128);n>>=7
 return bytes(b)
def midi(score):
 programs={'piano':0,'flute':73,'marimba':12,'harp':46,'strings':48,'bell':10,'cello':45}
 tracks=[]
 meta=b'\0\xff\x51\x03'+round(60000000/score['bpm']).to_bytes(3,'big')+b'\0\xff\x58\x04'+bytes([score['meter'],2,24,8])+b'\0\xff\x2f\0';tracks.append(meta)
 for ch,(inst,program) in enumerate(programs.items()):
  ev=[(0,bytes([0xC0+ch,program]))]
  for e in score['events']:
   if e['instrument']!=inst:continue
   tick=round((e['t']-.05)*score['bpm']/60*480);end=tick+round(e['dur']*score['bpm']/60*480)
   ev.extend([(tick,bytes([0x90+ch,e['midi'],max(1,min(127,round(e['vel']*300)))])),(end,bytes([0x80+ch,e['midi'],0]))])
  if len(ev)==1:continue
  out=b'';last=0
  for tick,msg in sorted(ev,key=lambda x:(x[0],x[1][0]&0xf0!=0x80)):out+=vlq(tick-last)+msg;last=tick
  tracks.append(out+b'\0\xff\x2f\0')
 body=b'MThd'+struct.pack('>IHHH',6,1,len(tracks),480)
 for t in tracks:body+=b'MTrk'+struct.pack('>I',len(t))+t
 return body

scores=json.loads((ROOT/'scores.json').read_text());only=sys.argv[1] if len(sys.argv)>1 else None;report=json.loads((ROOT/'audio-metrics.json').read_text()) if only else []
if only:scores=[s for s in scores if s['id']+'-'+s['version']==only];report=[m for m in report if m['id']!=only]
for score in scores:
 length=round(score['period']*SR);out=np.zeros((length,2),np.float64)
 for e in score['events']:
  x=voice(e['instrument'],e['midi'],e['dur'])*e['vel'];offset=round(e['t']*SR)
  pan=e.get('pan',0);st=np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)])
  # Periodic summation retains releases across the loop join.
  idx=(np.arange(len(x))+offset)%length
  np.add.at(out,idx,x[:,None]*st[None,:])
 # Tiny room reflections, periodic so the loop preserves its acoustic space.
 wet=.11 if score['version']=='A' else .17
 dry=out.copy()
 for delay,gain in [(.029,.6),(.047,.42),(.079,.28),(.113,.18),(.173,.12),(.239,.08)]:
  out+=wet*gain*np.roll(dry,round(delay*SR),axis=0)[:,::-1]
 key=score['id']+'-'+score['version'];temp=ROOT/'audio'/(key+'.wav')
 wavfile.write(temp,SR,out.astype(np.float32))
 measure=subprocess.run(['ffmpeg','-hide_banner','-i',str(temp),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 stats=json.loads(measure[measure.rfind('{'):]);gain=10**((-23-float(stats['input_i']))/20)
 peak=float(np.max(abs(out)))*gain
 if peak>.79:gain*=.79/peak
 out*=gain
 wavfile.write(temp,SR,out.astype(np.float32))
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(temp),'-c:a','flac','-sample_fmt','s16',str(ROOT/'audio'/(key+'.flac'))],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(temp),'-c:a','aac','-b:a','128k','-movflags','+faststart',str(ROOT/'audio'/(key+'.m4a'))],check=True)
 temp.unlink();(ROOT/'midi'/(key+'.mid')).write_bytes(midi(score))
 report.append({'id':key,'seconds':length/SR,'sampleRate':SR,'peakDbfs':20*np.log10(np.max(abs(out))),'integratedLUFS':float(stats['input_i'])+20*np.log10(gain),'gainDb':20*np.log10(gain),'joinJump':float(np.max(abs(out[0]-out[-1]))),'playbackBytes':(ROOT/'audio'/(key+'.m4a')).stat().st_size,'masterSha256':hashlib.sha256((ROOT/'audio'/(key+'.flac')).read_bytes()).hexdigest()})
 print(key,report[-1],flush=True)
(ROOT/'audio-metrics.json').write_text(json.dumps(report,indent=2))
