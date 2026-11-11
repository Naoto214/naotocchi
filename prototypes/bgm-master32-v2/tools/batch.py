"""Run exactly one group, one subprocess per song. Push the group before the next.
python tools/batch.py --group 1
python tools/batch.py --group 1 --verify-only
A completed song is immutable and skipped only after every hash matches.
"""
import argparse,copy,hashlib,json,math,os,pathlib,shutil,subprocess,sys
from checkpoint import digest,valid,atomic_json
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1';REPO=R.parents[1]
SOURCE='9e76a71546882233b499e80391613868ae947612'
CAT=json.loads((V1/'catalog.json').read_text())['tracks']
def recipe():
 paths=[R/'tools'/n for n in ['batch.py','render.py','analyze.py','checkpoint.py']]+[V1/n for n in ['scores.json','home-scores-original.json','catalog.json']]+[R/'samples/piano-manifest.json']
 return hashlib.sha256(''.join(digest(p) for p in paths).encode()).hexdigest()
def source_score(t):
 home=json.loads((V1/'home-scores-original.json').read_text())
 if t['number']<=4:
  s=home[t['number']-1];s.update(id=t['id'],family='home',loop=True,duration=t['duration'],targetLUFS=t['integratedLUFS'])
 else:s=next(s for s in json.loads((V1/'scores.json').read_text()) if s['id']==t['id'])
 return s

def worker(key):
 import analyze
 t=next(t for t in CAT if t['id']==key);rec=recipe();dest=R/'checkpoints'/f'{key}.json'
 if dest.exists():valid(R,json.loads(dest.read_text()),rec);print('SKIP verified '+key,flush=True);return
 work=R/'.work'/key;(work/'audio').mkdir(parents=True,exist_ok=True)
 v1path=work/'v1.json'
 if not v1path.exists():atomic_json(v1path,[analyze.inspect((t,V1,e)) for e in ['flac','m4a']])
 original=json.loads(v1path.read_text());m=original[0];s=source_score(t);before=copy.deepcopy(s)
 b=m['bands'];low=b['body']+b['lowMid'];soft=s['family'] in ['sleep','farewell','memory'] or key in ['lullaby-a','bgm-farewell','home-night','board-b','poyo-2']
 p=dict(id=key,family=s['family'],lowMidShare=low,accompanimentCutDb=round(-min(4.5,max(1.,(low-.32)*10+1.3)),2),cutHz=320 if b['body']>b['lowMid'] else 480,roomWet=.07 if soft else .045,roomLowpassHz=4600 if soft else 6200,soft=soft,reason='伴奏の中低域と残響の低域を整理。録音サンプルのアタックを保ち、主旋律との重なりを軽減。'+('静かな用途では弱音の柔らかさを維持。' if soft else 'ピアノは強弱別の実録音を使い分け。'))
 for e in s['events']:
  e['vel']*=1+.035*math.sin(2*math.pi*e['t']/(60/s['bpm']*s['meter']*4))
  if e['role']!='melody':
   if e['instrument']=='strings':e['vel']*=.74
   if e['instrument']=='piano' and e['midi']<60:e['vel']*=.84
   e['pan']=max(-.42,min(.42,e.get('pan',0)*1.18))
 notes=lambda s:[(e['midi'],e['t'],e['dur']) for e in s['events'] if e['role']=='melody']
 assert notes(s)==notes(before) and s['bpm']==before['bpm'] and s['meter']==before['meter']
 stage=work/'rendered.json'
 if stage.exists():
  staged=json.loads(stage.read_text());valid(work,staged,rec);rm=staged['metrics']
 else:
  import render
  render.R=work;rm=render.render(s,p)
  atomic_json(stage,dict(recipe=rec,files={f'audio/{key}.{e}':digest(work/'audio'/f'{key}.{e}') for e in ['flac','m4a']},metrics=rm))
 measured=[analyze.inspect((t,work,e)) for e in ['flac','m4a']]
 for a in measured:
  assert a['clipSamples']==0 and a['truePeakDbTP']<=-1.0,(key,'peak',a)
  assert a['monoRatio']>=.85,(key,'mono',a['monoRatio'])
  assert abs(a['duration']-t['duration'])<=2/44100
  assert abs(a['LUFS']-s['targetLUFS'])<=3.0,(key,'loudness',a['LUFS'],s['targetLUFS'])
  if s['loop']:assert a['joinJump']<=.05,(key,'loop',a['joinJump'])
 # Codec comparison is computed one pair at a time, with zero alignment shift.
 import numpy as np
 sr,fl=analyze.decode(work/'audio'/f'{key}.flac');_,aa=analyze.decode(work/'audio'/f'{key}.m4a');n=min(len(fl),len(aa));delta=aa[:n]-fl[:n]
 codec=dict(snrDb=float(10*np.log10(np.mean(fl[:n]**2)/(np.mean(delta**2)+1e-20))),correlation=float(np.corrcoef(fl[:n].reshape(-1),aa[:n].reshape(-1))[0,1]))
 assert codec['correlation']>.98,(key,codec)
 del fl,aa,delta
 for sub in ['audio','midi','track-data']:(R/sub).mkdir(exist_ok=True)
 for e in ['flac','m4a']:shutil.copyfile(work/'audio'/f'{key}.{e}',R/'audio'/f'{key}.{e}')
 shutil.copyfile(V1/'midi'/f'{key}.mid',R/'midi'/f'{key}.mid')
 atomic_json(R/'track-data'/f'{key}.json',dict(score=s,plan=p,v1=original,v2=measured,render=rm,codec=codec))
 names=[f'audio/{key}.{e}' for e in ['flac','m4a']]+[f'midi/{key}.mid',f'track-data/{key}.json']
 atomic_json(dest,dict(id=key,recipe=rec,sourceCommit=SOURCE,melodyNotes=len(notes(s)),files={name:digest(R/name) for name in names}))
 shutil.rmtree(work);print('VERIFIED '+key,flush=True)

def group(number,verify=False):
 assert 1<=number<=4
 if number>1:
  # Fetch actual remote state; local completion alone is insufficient.
  subprocess.run(['git','fetch','origin','experiment/bgm-master32-v2-20261110'],cwd=REPO,check=True,stdout=subprocess.DEVNULL)
  prev=R/'checkpoints'/f'group-{number-1}.json';rel=str(prev.relative_to(REPO))
  saved=subprocess.check_output(['git','show','FETCH_HEAD:'+rel],cwd=REPO)
  assert saved==prev.read_bytes(),'Previous group has not been saved to remote'
  for name,h in json.loads(saved)['files'].items():
   blob=subprocess.check_output(['git','show','FETCH_HEAD:'+str((R/name).relative_to(REPO))],cwd=REPO)
   assert hashlib.sha256(blob).hexdigest()==h,'Previous remote file hash mismatch: '+name
 tracks=CAT[(number-1)*8:number*8]
 for t in tracks:
  if not verify:subprocess.run([sys.executable,__file__,'--track',t['id']],check=True,env={**os.environ,'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'})
  valid(R,json.loads((R/'checkpoints'/f'{t["id"]}.json').read_text()),recipe())
 files={}
 for t in tracks:
  cp=R/'checkpoints'/f'{t["id"]}.json';files.update(json.loads(cp.read_text())['files']);files[str(cp.relative_to(R))]=digest(cp)
 out=dict(group=number,ids=[t['id'] for t in tracks],sourceCommit=SOURCE,files=files)
 atomic_json(R/'checkpoints'/f'group-{number}.json',out);print(f'GROUP {number}: 8 verified; commit and push before next group',flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--track');p.add_argument('--group',type=int);p.add_argument('--verify-only',action='store_true');a=p.parse_args()
 if a.track:worker(a.track)
 elif a.group:group(a.group,a.verify_only)
 else:p.error('--group or --track required')
