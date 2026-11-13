"""Offline sampled instrument renderer. Deterministic; no external generation service.
Usage: python tools/render.py [track-id]. Restore samples with fetch-samples.py first.
"""
import json, math, pathlib, re, struct, subprocess, hashlib, warnings, sys
from fractions import Fraction
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
ROOT=pathlib.Path(__file__).resolve().parents[1]
SR=44100
warnings.filterwarnings('ignore',category=wavfile.WavFileWarning)
PERC={'kick':36,'snare':38,'shaker':42,'cymbal':49,'shell':37}
PROGRAMS={'piano':0,'flute':73,'marimba':12,'harp':46,'strings':48,'bell':9,'cello':45,'pizz':45,'trumpet':56,'timpani':47}
def classify(p):
 s=str(p)
 for part,inst in [('Player_','piano'),('Flute','flute'),('Marimba','marimba'),('Harp','harp'),('Glock','bell'),('Violin','strings'),('Cello','cello'),('Contrabass','pizz'),('Trumpet','trumpet'),('Timpani','timpani'),('BDrum','kick'),('Snare','snare'),('Tamb1-Shake','shaker'),('Cymbals','cymbal')]:
  if part in s:return inst
 raise ValueError(s)
def root_note(p,inst):
 if inst in PERC:return PERC[inst]
 if inst=='timpani':return 43 # fixed sample, used as percussion, not a pitched bass replacement
 if 'Player_' in p.name:return 21+int(p.name[-7:-4])*2
 m=re.search(r'_([A-G])(#?)(\d)',p.name);n,sharp,oct=m.groups()
 return (int(oct)+(1 if 'KSHarp' in p.name else 2))*12+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[n]+bool(sharp)
samples={}
for entry in json.loads((ROOT/'samples/manifest.json').read_text())['files']:
 if not entry['path'].endswith('.wav'):continue
 p=ROOT/'samples'/entry['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256']
 inst=classify(p);rate,x=wavfile.read(p);dtype=x.dtype
 x=x.astype(np.float64)/(np.iinfo(dtype).max if np.issubdtype(dtype,np.integer) else 1)
 if x.ndim>1:x=x.mean(axis=1)
 x=sosfilt(butter(2,35 if inst in ('kick','pizz','cello','timpani') else 65,fs=rate,btype='highpass',output='sos'),x)
 ix=np.flatnonzero(abs(x)>np.max(abs(x))*.008);x=x[max(0,int(ix[0])-int(rate*.003)):]
 x=resample_poly(x,SR,rate).astype(np.float32);x*=.65/max(float(np.max(abs(x))),1e-8)
 samples.setdefault(inst,[]).append((root_note(p,inst),x))
cache={}
def voice(inst,midi,dur):
 key=inst,midi,round(dur,6)
 if key in cache:return cache[key]
 if inst=='shell':
  t=np.arange(round(SR*.30))/SR;rng=np.random.default_rng(534)
  x=sosfilt(butter(2,[1500,5000],fs=SR,btype='bandpass',output='sos'),rng.normal(0,.3,len(t)))*np.exp(-t*32)
  x+=.15*np.sin(2*np.pi*(380*t+1800*t*t))*np.exp(-t*18)
 else:
  root,src=min(samples[inst],key=lambda s:abs(midi-s[0]));ratio=1 if inst in PERC else 2**((midi-root)/12)
  frac=Fraction(1/ratio).limit_denominator(2048);x=resample_poly(src,frac.numerator,frac.denominator)
  release={'piano':.32,'flute':.18,'strings':.55,'harp':.65,'bell':1.05,'marimba':.24,'cello':.35,'pizz':.3,'trumpet':.24,'timpani':.65}.get(inst,.22)
  length=round((dur+release)*SR);x=x[:length].copy()
  if len(x)<length:x=np.pad(x,(0,length-len(x)))
  start=round(dur*SR);x[start:]*=np.exp(-np.linspace(0,8,len(x)-start))
 attack=min(len(x),round(SR*(.045 if inst=='strings' else .003)))
 x[:attack]*=np.linspace(0,1,attack);x[-min(440,len(x)):]*=np.linspace(1,0,min(440,len(x)))
 cutoff={'bell':4300,'trumpet':5300,'shaker':6200,'cymbal':6000,'flute':6500}.get(inst,7800)
 x=sosfilt(butter(2,cutoff,fs=SR,output='sos'),x).astype(np.float32)
 cache[key]=x;return x
def vlq(n):
 b=[n&127];n>>=7
 while n:b.insert(0,(n&127)|128);n>>=7
 return bytes(b)
def midi(score):
 tracks=[b'\0\xff\x51\x03'+round(60000000/score['bpm']).to_bytes(3,'big')+b'\0\xff\x58\x04'+bytes([score['meter'],2,24,8])+b'\0\xff\x2f\0']
 channels=[0,1,2,3,4,5,6,7,8,10,11,12,13,14,15]
 # The lead has its own MIDI channel: accompaniment note-offs must never cut it short.
 lead_inst=next(e['instrument'] for e in score['events'] if e['role']=='melody')
 groups=[('melody',0,PROGRAMS[lead_inst])]+[(inst,channels[i+1],pr) for i,(inst,pr) in enumerate(PROGRAMS.items())]+[('percussion',9,0)]
 for inst,ch,pr in groups:
  name=inst.encode();ev=[(0,b'\xff\x03'+vlq(len(name))+name),(0,bytes([0xc0+ch,pr]))];intervals={}
  for e in score['events']:
   if inst=='melody':
    if e['role']!='melody':continue
   elif e['role']=='melody' or not (e['instrument']==inst or (inst=='percussion' and e['instrument'] in PERC)):continue
   note=PERC.get(e['instrument'],e['midi']);tick=round(e['t']*score['bpm']/60*960);end=tick+round(e['dur']*score['bpm']/60*960)
   intervals.setdefault(note,[]).append((tick,end,max(1,min(127,round(e['vel']*300)))))
  if not intervals:continue
  for note,items in intervals.items():
   merged=[]
   for start,end,vel in sorted(items):
    if merged and start<merged[-1][1]:merged[-1]=(merged[-1][0],max(end,merged[-1][1]),max(vel,merged[-1][2]))
    else:merged.append((start,end,vel))
   for start,end,vel in merged:ev.extend([(start,bytes([0x90+ch,note,vel])),(end,bytes([0x80+ch,note,0]))])
  out=b'';last=0
  for tick,msg in sorted(ev,key=lambda a:(a[0],a[1][0]&0xf0!=0x80)):out+=vlq(tick-last)+msg;last=tick
  tracks.append(out+b'\0\xff\x2f\0')
 body=b'MThd'+struct.pack('>IHHH',6,1,len(tracks),960)
 for t in tracks:body+=b'MTrk'+struct.pack('>I',len(t))+t
 return body
def loudness(p):
 s=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 return json.loads(s[s.rfind('{'):])
def render(score):
 cache.clear();length=round(score['duration']*SR);out=np.zeros((length,2),np.float64)
 for e in score['events']:
  x=voice(e['instrument'],e['midi'],e['dur'])*e['vel'];offset=round(e['t']*SR)
  pan=e.get('pan',0);st=np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)])
  if score['loop']:
   idx=(np.arange(len(x))+offset)%length;np.add.at(out,idx,x[:,None]*st)
  elif offset<length:
   n=min(len(x),length-offset);out[offset:offset+n]+=x[:n,None]*st
 # A modest deterministic room. Positive early reflections preserve mono compatibility.
 dry=out.copy();wet=.12 if score['family'] not in ('flight','memory','love') else .18
 for delay,gain in [(.023,.60),(.041,.44),(.071,.31),(.103,.22),(.163,.15),(.229,.10),(.337,.07),(.473,.045),(.619,.025)]:
  shift=round(delay*SR)
  if score['loop']:out+=wet*gain*np.roll(dry,shift,axis=0)[:,::-1]
  else:out[shift:]+=wet*gain*dry[:-shift,::-1]
 if not score['loop']:
  n=min(round(.30*SR),length);out[-n:]*=np.linspace(1,0,n)[:,None]
 key=score['id'];temp=ROOT/'audio'/(key+'.wav');wavfile.write(temp,SR,out.astype(np.float32))
 stats=loudness(temp);gain=10**((score['targetLUFS']-float(stats['input_i']))/20)
 gain=min(gain,10**(-2.5/20)/(np.max(abs(out))+1e-12));out*=gain
 wavfile.write(temp,SR,out.astype(np.float32))
 for ext,args in [('flac',['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']),('m4a',['-c:a','aac','-b:a','160k','-movflags','+faststart','-movie_timescale',str(SR)])]:
  subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(temp),*args,str(ROOT/'audio'/(key+'.'+ext))],check=True)
  encoded=ROOT/'audio'/(key+'.'+ext)
  decoded=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(encoded),'-f','f32le','-'],capture_output=True,check=True)
  if decoded.stderr or len(decoded.stdout)//8<length:raise RuntimeError(f'{key}.{ext}: incomplete encode {decoded.stderr!r}')
 temp.unlink();(ROOT/'midi'/(key+'.mid')).write_bytes(midi(score))
 report={'id':key,'sampleRate':SR,'seconds':length/SR,'frames':length,'integratedLUFS':round(float(stats['input_i'])+20*np.log10(gain),2),'peakDbfs':round(20*np.log10(np.max(abs(out))),2),'joinJump':float(np.max(abs(out[0]-out[-1]))),'gainDb':float(20*np.log10(gain)),'masterSha256':hashlib.sha256((ROOT/'audio'/(key+'.flac')).read_bytes()).hexdigest()}
 print(json.dumps(report),flush=True);return report
if __name__=='__main__':
 for d in ['audio','midi']:(ROOT/d).mkdir(exist_ok=True)
 scores=json.loads((ROOT/'scores.json').read_text());only=set(sys.argv[1:]);dest=ROOT/'render-metrics.json'
 report=json.loads(dest.read_text()) if dest.exists() else []
 for s in scores:
  if only and s['id'] not in only:continue
  report=[r for r in report if r['id']!=s['id']]+[render(s)];dest.write_text(json.dumps(report,indent=2)+'\n')
