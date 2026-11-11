"""V2: per-part sampled rendering. Melody note data are immutable.
Restore V1 pinned CC0 samples first. Run prepare.py, then this script.
"""
import pathlib,importlib.util,json,sys,math,subprocess,hashlib
from fractions import Fraction
import numpy as np
from scipy.signal import resample_poly,butter,sosfilt,lfilter
from scipy.io import wavfile
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1';SR=44100
spec=importlib.util.spec_from_file_location('v1_renderer',V1/'tools/render.py');old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
# Load stronger piano dynamics into a separate bank; soft pieces keep dyn1.
strong=[]
for entry in json.loads((R/'samples/piano-manifest.json').read_text()):
 path=R/'samples'/entry['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
 rate,x=wavfile.read(path);dtype=x.dtype;x=x.astype(np.float64)/(np.iinfo(dtype).max if np.issubdtype(dtype,np.integer) else 1)
 if x.ndim>1:x=x.mean(axis=1)
 x=sosfilt(butter(2,65,fs=rate,btype='highpass',output='sos'),x)
 ix=np.flatnonzero(abs(x)>np.max(abs(x))*.008);x=x[max(0,int(ix[0])-int(rate*.003)):]
 x=resample_poly(x,SR,rate).astype(np.float32);x*=.65/max(float(np.max(abs(x))),1e-8)
 strong.append((old.root_note(path,'piano'),x))
cache={}
def voice(inst,midi,dur,soft):
 key=inst,midi,round(dur,6),soft
 if key in cache:return cache[key]
 if inst=='shell':return old.voice(inst,midi,dur)
 root,src=min(strong if inst=='piano' and not soft else old.samples[inst],key=lambda s:abs(midi-s[0]));ratio=1 if inst in old.PERC else 2**((midi-root)/12);frac=Fraction(1/ratio).limit_denominator(2048)
 x=resample_poly(src,frac.numerator,frac.denominator)
 release={'piano':.23,'flute':.14,'strings':.36,'harp':.48,'bell':.68,'marimba':.18,'cello':.28,'pizz':.22,'trumpet':.18,'timpani':.42}.get(inst,.17)
 if soft:release*=1.15
 length=round((dur+release)*SR);x=np.pad(x[:length],(0,max(0,length-len(x))))
 start=round(dur*SR);x[start:]*=np.exp(-np.linspace(0,8,len(x)-start))
 attack=min(len(x),round(SR*(.028 if inst=='strings' else .0015)));x[:attack]*=np.linspace(0,1,attack);n=min(220,len(x));x[-n:]*=np.linspace(1,0,n)
 cutoff={'bell':9500,'trumpet':7600,'shaker':9000,'cymbal':8500,'flute':9000,'piano':11000,'harp':11000,'marimba':10500}.get(inst,9500)
 if soft:cutoff*=.82
 x=sosfilt(butter(2,cutoff,fs=SR,output='sos'),x).astype(np.float32);cache[key]=x;return x

def eq(x,f,db,loop):
 A=10**(db/40);w=2*np.pi*f/SR;al=np.sin(w)/(2*.75);c=np.cos(w)
 b=np.array([1+al*A,-2*c,1-al*A]);a=np.array([1+al/A,-2*c,1-al/A]);b/=a[0];a/=a[0]
 if loop:
  tail=x[-min(SR,len(x)):];return lfilter(b,a,np.concatenate([tail,x]),axis=0)[len(tail):]
 return lfilter(b,a,x,axis=0)
def filt(x,sos,loop):
 if loop:
  tail=x[-min(SR,len(x)):];return sosfilt(sos,np.concatenate([tail,x]),axis=0)[len(tail):]
 return sosfilt(sos,x,axis=0)
def loud(p):
 s=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 return json.JSONDecoder().raw_decode(s[s.rfind('{'):])[0]
def render(s,p):
 cache.clear();n=round(s['duration']*SR)
 out=np.zeros((n,2),np.float64);send=np.zeros_like(out)
 groups=sorted(set((e['instrument'],e['role']) for e in s['events']))
 for inst,role in groups:
  stem=np.zeros_like(out)
  for e in s['events']:
   if (e['instrument'],e['role'])!=(inst,role):continue
   v=voice(inst,e['midi'],e['dur'],p['soft'])*e['vel'];off=round(e['t']*SR)
   pan=e.get('pan',0);st=np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)]);x=v[:,None]*st
   if s['loop']:
    off%=n;pos=0
    while pos<len(x):
     k=min(n-off,len(x)-pos);stem[off:off+k]+=x[pos:pos+k];pos+=k;off=0
   elif off<n:
    k=min(len(x),n-off);stem[off:off+k]+=x[:k]
  cache.clear()
  if role!='melody':
   hp=40 if inst in ['pizz','cello','kick','timpani'] else 105 if inst in ['piano','harp','marimba'] else 170
   stem=filt(stem,butter(2,hp,fs=SR,btype='highpass',output='sos'),s['loop'])
   if inst not in ['kick','pizz','cello','timpani']:stem=eq(stem,p['cutHz'],p['accompanimentCutDb'],s['loop'])
  out+=stem
  if inst not in ['kick','pizz','timpani']:send+=stem*(.60 if role=='melody' else 1)
  del stem
 send=filt(send,butter(2,[240,p['roomLowpassHz']],fs=SR,btype='bandpass',output='sos'),s['loop'])
 for delay,gain in [(.019,.58),(.037,.40),(.063,.27),(.097,.19),(.151,.12),(.223,.07),(.313,.035)]:
  shift=round(delay*SR)
  if s['loop']:out+=p['roomWet']*gain*np.roll(send,shift,axis=0)[:,::-1]
  else:out[shift:]+=p['roomWet']*gain*send[:-shift,::-1]
 if not s['loop']:
  k=min(round(.30*SR),n);out[-k:]*=np.linspace(1,0,k)[:,None]
 temp=R/'audio'/(s['id']+'.wav');wavfile.write(temp,SR,out.astype(np.float32));stats=loud(temp)
 gain=min(10**((s['targetLUFS']-float(stats['input_i']))/20),10**(-3/20)/(np.max(abs(out))+1e-12));out*=gain;wavfile.write(temp,SR,out.astype(np.float32))
 for ext,args in [('flac',['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']),('m4a',['-c:a','aac','-b:a','192k','-movflags','+faststart','-movie_timescale',str(SR)])]:
  subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(temp),*args,str(R/'audio'/(s['id']+'.'+ext))],check=True)
 temp.unlink();report=dict(id=s['id'],frames=n,sampleRate=SR,LUFS=round(float(stats['input_i'])+20*np.log10(gain),2),samplePeakDbFS=float(20*np.log10(np.max(abs(out)))),joinJump=float(np.max(abs(out[0]-out[-1]))))
 print(json.dumps(report),flush=True);return report
if __name__=='__main__':
 scores=json.loads((R/'scores.json').read_text());plans={p['id']:p for p in json.loads((R/'mix-plan.json').read_text())};only=set(sys.argv[1:]);dest=R/'render-metrics.json';reports=json.loads(dest.read_text()) if dest.exists() else []
 for s in scores:
  if only and s['id'] not in only:continue
  reports=[r for r in reports if r['id']!=s['id']]+[render(s,plans[s['id']])];dest.write_text(json.dumps(reports,indent=2)+'\n')
