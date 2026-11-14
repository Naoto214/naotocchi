"""Home A/B renderer. Frozen V6 piano + native recorded chamber strings.
No compressor, limiter, random expression, synthetic vibrato or sample loops.
"""
import pathlib,sys,os,json,hashlib,shutil,subprocess
import numpy as np,soundfile as sf
ROOT=pathlib.Path(__file__).resolve().parents[1];V6=ROOT.parent/'bgm-v6-20261114'
sys.path.insert(0,str(V6/'tools'));import render_v6 as V
from strings import Strings,SR
R=V.R;WORK=pathlib.Path(os.environ.get('V7_WORK_DIR','/workspace/work/v7-render'))
LEVELS={'a':{'violin_solo':-24,'cello_chamber':-25},'b':{'violin_solo':-17,'cello_chamber':-20}}
def fingerprint(s):
 h=hashlib.sha256(json.dumps(s,sort_keys=True).encode())
 for name in ('render_v7.py','strings.py','piano_stems.py'):h.update((ROOT/'tools'/name).read_bytes())
 for name in ('samples-v7.json','piano-preservation.json'):h.update((ROOT/name).read_bytes())
 return h.hexdigest()
def expression(s,n):
 x=np.arange(n)/SR/(60/s['bpm']*s['meter']);points=s['v6']['profile']['arc'];y=np.full(n,points[-1][1],dtype=float)
 y[x<=points[0][0]]=points[0][1]
 for (a,u),(b,v) in zip(points,points[1:]):
  mask=(x>a)&(x<=b);t=(x[mask]-a)/(b-a);y[mask]=u+(v-u)*t*t*(3-2*t)
 return 10**(y/20)
def render(s,v):
 for name in ('audio','midi','receipts'):(ROOT/name/v).mkdir(parents=True,exist_ok=True)
 R.AUDIO=ROOT/'audio'/v;R.MIDI=ROOT/'midi'/v;R.REC=ROOT/'receipts'/v
 fp=fingerprint(s)
 if R.receipt_ok(s['id']) and json.loads((R.REC/(s['id']+'.json')).read_text()).get('sourceFingerprint')==fp:
  print('skip',v,s['id'],flush=True);return
 out={e:R.AUDIO/(s['id']+'.'+e) for e in ('flac','m4a')}
 R.GM.update(violin_solo=40,cello_chamber=42)
 (R.MIDI/(s['id']+'.mid')).write_bytes(R.midi_bytes(s))
 stem=WORK/(s['id']+'-piano.wav')
 if hashlib.sha256(stem.read_bytes()).hexdigest()!=json.loads((ROOT/'piano-preservation.json').read_text())[s['id']]['stemSha256']:raise ValueError('Changed V6 piano stem')
 piano,sr=sf.read(stem);assert sr==SR
 mix=piano.copy();lib=Strings();gains={};expr=expression(s,len(mix))
 if v=='a' and s['id']=='home-night':
  for e,p in out.items():shutil.copyfile(V6/'audio'/p.name,p)
  shutil.copyfile(V6/'midi'/(s['id']+'.mid'),R.MIDI/(s['id']+'.mid'))
  mix,_=sf.read(out['flac']);gain=1.
 else:
  for inst in ('violin_solo','cello_chamber'):
   events=[e for e in s['events'] if e['instrument']==inst]
   if not events:continue
   bus=np.zeros_like(mix)
   for e in events:
    x=lib.note(inst,e['midi'],e['dur'],e['vel'])
    R.place(bus,x,round(e['t']*SR),e.get('pan',0),.3,s['loop'])
   level=LEVELS[v][inst]
   if s['id']=='home-evening' and inst=='cello_chamber':level=-20 if v=='a' else -18
   if s['id']=='home-night':level=-30 if inst=='violin_solo' else -32
   gain0=R.rms(piano)*10**(level/20)/max(R.rms(bus),1e-12)
   bus*=gain0*expr[:,None];gains[inst]={'relativeActiveRmsDb':level,'linearGain':gain0}
   wet=R.convolve_loop(R.eq(bus,[('hp',180)],s['loop']),R.room_ir(s['room'][0]),s['loop'])
   mix+=bus+wet*s['room'][1]*.65
  tmp=R.AUDIO/(s['id']+'.tmp.wav');sf.write(tmp,mix,SR,subtype='FLOAT')
  gain=10**((s['targetLUFS']-float(R.loudness(tmp)['input_i']))/20);mix*=gain
  if np.abs(mix).max()>10**(-1.3/20):raise ValueError('Peak exceeds safe range; revise mix, no limiter')
  sf.write(tmp,mix,SR,subtype='FLOAT')
  for ext,args in [('flac',['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']),('m4a',['-c:a','aac','-b:a','192k','-movflags','+faststart','-movie_timescale',str(SR)])]:
   subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(tmp),*args,str(out[ext])],check=True)
  tmp.unlink()
 rec=R.verify(s,out,mix,{'version':7,'variant':v,'sourceFingerprint':fp,'syntheticLoops':lib.synthetic_loops,'samplesUsed':lib.uses,'stringGains':gains,'pianoGlobalGain':gain,'limiterMaxGainReductionDb':0,'pianoReconstruction':json.loads((ROOT/'piano-preservation.json').read_text())[s['id']],'v7':s['v7']})
 if s['id']=='home-night':
  original,_=sf.read(V6/'audio/home-night.flac');first=round(s['period']/2*SR);fl,_=sf.read(out['flac'])
  rec['firstHalfPianoRelativeErrorDb']=float(10*np.log10(np.mean((fl[:first]-original[:first]*gain)**2)/(np.mean(original[:first]**2)+1e-30)+1e-30))
 (R.REC/(s['id']+'.json')).write_text(json.dumps(rec,ensure_ascii=False,indent=1)+'\n')
 print(v,s['id'],rec['integratedLUFS'],rec['truePeakDbtp'],rec['monoLossDb'],rec['problems'],flush=True)
 if rec['problems']:raise ValueError(rec['problems'])
if __name__=='__main__':
 for v in ('a','b'):
  for s in json.loads((ROOT/f'scores-{v}.json').read_text())[:4]:render(s,v)
