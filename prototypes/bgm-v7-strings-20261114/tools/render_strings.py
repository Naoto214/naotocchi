"""Fixed V7-B arrangement and piano; only recorded string performance differs."""
import pathlib,sys,os,json,hashlib,subprocess,shutil
import numpy as np,soundfile as sf
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114'
from sampler import NativeStrings,SR
from performance import build
sys.path.insert(0,str(V7/'tools'));import render_v7 as OLD
R=OLD.R
CLIMAX={'home-morning':(62,81),'home-day':(49.8,59.8),'home-evening':(56.8,65.3),'home-night':(25,35.5)}
def fingerprint(s,v):
 h=hashlib.sha256(json.dumps([s,v],sort_keys=True).encode())
 for p in ('sampler.py','performance.py','render_strings.py'):h.update((ROOT/'tools'/p).read_bytes())
 h.update((ROOT/'samples.json').read_bytes());h.update((V7/'piano-preservation.json').read_bytes())
 for p in sorted(ROOT.parent.glob('bgm-v*/tools/*.py')):
  if p.parent.parent!=ROOT:h.update(str(p.relative_to(ROOT.parent)).encode());h.update(p.read_bytes())
 for p in (V7/'samples-v7.json',V7/'receipts/b'/(s['id']+'.json'),V7/'midi/b'/(s['id']+'.mid')):h.update(p.read_bytes())
 return h.hexdigest()
def diagnostic_cache_ok(rec):
 items=rec.get('diagnosticFiles',[])
 return bool(items) and all((ROOT/f['path']).is_file() and hashlib.sha256((ROOT/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in items)
def validate_inputs():
 for f in json.loads((ROOT/'samples.json').read_text())['files']:
  base=pathlib.Path(os.environ['VSCO_DIR'] if f['library']=='vsco' else os.environ.get('KARORYFER_DIR','/workspace/work/karoryfer-cello'))
  if hashlib.sha256((base/f['path']).read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Changed sample '+f['path'])
 for i,pin in json.loads((V7/'piano-preservation.json').read_text()).items():
  stem=pathlib.Path(os.environ.get('V7_WORK_DIR','/workspace/work/v7-render'))/(i+'-piano.wav')
  if hashlib.sha256(stem.read_bytes()).hexdigest()!=pin['stemSha256']:raise ValueError('Changed piano '+i)
def encode(x,path):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp.wav');sf.write(tmp,x,SR,subtype='FLOAT')
 args=['-c:a','aac','-b:a','192k','-movflags','+faststart','-movie_timescale',str(SR)] if path.suffix=='.m4a' else ['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']
 subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(tmp),*args,str(path)],check=True);tmp.unlink()
def norm(x,target,tag):
 tmp=ROOT/'audio'/(tag+'.tmp.wav');sf.write(tmp,x,SR,subtype='FLOAT');info=R.loudness(tmp);tmp.unlink();gain=10**((target-float(info['input_i']))/20);return x*gain,gain

def render(s,v):
 for name in ('audio','midi','receipts'):(ROOT/name/v).mkdir(parents=True,exist_ok=True)
 R.AUDIO=ROOT/'audio'/v;R.MIDI=ROOT/'midi'/v;R.REC=ROOT/'receipts'/v;fp=fingerprint(s,v)
 if R.receipt_ok(s['id']) and json.loads((R.REC/(s['id']+'.json')).read_text()).get('sourceFingerprint')==fp and diagnostic_cache_ok(json.loads((R.REC/(s['id']+'.json')).read_text())):
  print('skip',v,s['id'],flush=True);return
 stem=pathlib.Path(os.environ.get('V7_WORK_DIR','/workspace/work/v7-render'))/(s['id']+'-piano.wav');pin=json.loads((V7/'piano-preservation.json').read_text())[s['id']]
 assert hashlib.sha256(stem.read_bytes()).hexdigest()==pin['stemSha256'];piano,sr=sf.read(stem);assert sr==SR
 oldrec=json.loads((V7/'receipts/b'/(s['id']+'.json')).read_text());lib=NativeStrings(v);oldlib=OLD.Strings();mix=piano.copy();dry=np.zeros_like(mix);dryold=np.zeros_like(mix);expr=OLD.expression(s,len(mix));gains={};seams=[]
 rows=build(s)
 for inst in ('violin_solo','cello_chamber'):
  perf=[e for e in rows if e['instrument']==inst];bus=np.zeros_like(mix);oldbus=np.zeros_like(mix);anchors=[];oldanchors=[]
  for e in perf:
   score=s['events'][e['eventIndex']];x=lib.note(e,score['vel']);old=oldlib.note(inst,e['midi'],score['dur'],score['vel']);a,b=[round(score['dur']*k*SR) for k in (.55,.8)]
   anchors.append(np.sqrt(np.mean(x[a:b]**2)));oldanchors.append(np.sqrt(np.mean(old[a:b]**2)))
   R.place(bus,x,round(e['t']*SR),score.get('pan',0),.3,s['loop']);R.place(oldbus,old,round(e['t']*SR),score.get('pan',0),.3,s['loop'])
  original_gain=oldrec['stringGains'][inst]['linearGain'];g=original_gain*float(np.median(oldanchors)/np.median(anchors));gains[inst]={'oldLinearGain':original_gain,'newLinearGain':g,'anchorRule':'median per-note 55%-80% of original written duration, before expression','oldAnchorRms':float(np.median(oldanchors)),'newAnchorRms':float(np.median(anchors))}
  bus*=g*expr[:,None];oldbus*=original_gain*expr[:,None];dry+=bus;dryold+=oldbus
  for e in perf:
   if not e['connectedIn']:continue
   t=round(e['t']*SR);hop=round(.02*SR)
   def stats(b):
    z=b[max(0,t-round(.35*SR)):t+round(.35*SR)];env=np.sqrt(np.mean(z[:len(z)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2))+1e-20);return {'minRms':float(env.min()),'maxRms':float(env.max()),'samplePeak':float(np.abs(z).max())}
   seams.append({'instrument':inst,'at':e['t'],'old':stats(oldbus),'new':stats(bus)})
  wet=R.convolve_loop(R.eq(bus,[('hp',180)],s['loop']),R.room_ir(s['room'][0]),s['loop']);mix+=bus+wet*s['room'][1]*.65
 mix,gain=norm(mix,s['targetLUFS'],v+'-'+s['id']);dry*=gain;dryold*=oldrec['pianoGlobalGain']
 if np.abs(mix).max()>10**(-1.3/20):raise ValueError('Revise mix, no limiter')
 out={ext:R.AUDIO/(s['id']+'.'+ext) for ext in ('flac','m4a')}
 for path in out.values():encode(mix,path)
 shutil.copyfile(V7/'midi/b'/(s['id']+'.mid'),R.MIDI/(s['id']+'.mid'))
 rec=R.verify(s,out,mix,{'variant':v,'sourceFingerprint':fp,'pianoGlobalGain':gain,'pianoStemSha256':pin['stemSha256'],'limiterMaxGainReductionDb':0,'samplesUsed':lib.uses,'calibration':gains,'joins':seams})
 a,b=[round(t*SR) for t in CLIMAX[s['id']]];excerpt,eg=norm(dry[a:b],-26,'dry-'+v+'-'+s['id']);encode(excerpt,ROOT/'diagnostics'/v/(s['id']+'.m4a'));rec['dryExcerpt']={'from':a/SR,'to':b/SR,'targetLUFS':-26,'linearGain':eg}
 if v=='b1':
  original,og=norm(dryold[a:b],-26,'dry-a-'+s['id']);encode(original,ROOT/'diagnostics/a'/(s['id']+'.m4a'))
 rec['diagnosticFiles']=[]
 for variant in ([v,'a'] if v=='b1' else [v]):
  path=ROOT/'diagnostics'/variant/(s['id']+'.m4a');info=R.loudness(path)
  rec['diagnosticFiles'].append({'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'integratedLUFS':float(info['input_i']),'truePeakDbtp':float(info['input_tp'])})
  assert abs(float(info['input_i'])+26)<.15 and float(info['input_tp'])<-1
 if s['id']=='home-night':
  first=round(s['period']/2*SR);rec['firstHalfPianoResidualDb']=float(10*np.log10(np.mean((mix[:first]-piano[:first]*gain)**2)/(np.mean(piano[:first]**2)+1e-30)+1e-30));assert rec['firstHalfPianoResidualDb']<-100
 (R.REC/(s['id']+'.json')).write_text(json.dumps(rec,ensure_ascii=False,indent=1)+'\n')
 print(v,s['id'],rec['integratedLUFS'],rec['truePeakDbtp'],rec['monoLossDb'],rec['problems'],flush=True)
 if rec['problems']:raise ValueError(rec['problems'])
if __name__=='__main__':
 validate_inputs();scores=json.loads((V7/'scores-b.json').read_text())
 for v in ('b1','b2'):
  for s in scores[:4]:render(s,v)
