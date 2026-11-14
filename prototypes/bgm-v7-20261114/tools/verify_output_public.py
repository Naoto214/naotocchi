"""Public byte/range checks for speaker-check-1; never proves speaker audibility."""
import pathlib,urllib.request,hashlib,json,concurrent.futures,subprocess,sys,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE='https://naoto214.github.io/naotocchi-playtest/';OUT=ROOT/'verification/output-20261114'
repo=pathlib.Path(sys.argv[1]);previous='c6bfd8e984f7d51f483967c238aff54dabbef97c'
changes=subprocess.check_output(['git','diff',previous,'HEAD','--name-status'],cwd=repo,text=True).splitlines()
assert set(changes)=={'M\tbgm-v7/index.html','M\tbgm-v7/player.js','A\tbgm-v7/output-check.html','A\tbgm-v7/output-check.js'},changes
jobs=[('bgm-v7/'+p.name,p) for p in (ROOT/'compare').iterdir()]
for v in ('a','b'):jobs += [('audio/v7/'+v+'/'+p.name,p) for p in (ROOT/'audio'/v).glob('*.m4a')]
for i in ('home-morning','home-day','home-evening','home-night'):jobs.append(('audio/v6/'+i+'.m4a',ROOT.parent/'bgm-v6-20261114/audio'/(i+'.m4a')))
def check(job):
 name,p=job
 with urllib.request.urlopen(urllib.request.Request(BASE+name+'?output=speaker-check-1',headers={'Cache-Control':'no-cache'}),timeout=45) as response:
  data=response.read();status=response.status
 digest=hashlib.sha256(data).hexdigest();assert digest==hashlib.sha256(p.read_bytes()).hexdigest(),name
 return {'path':name,'httpStatus':status,'bytes':len(data),'sha256':digest}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:files=list(pool.map(check,jobs))
req=urllib.request.Request(BASE+'audio/v7/b/home-morning.m4a?output=range-check-1',headers={'Range':'bytes=0-99'})
with urllib.request.urlopen(req,timeout=45) as response:
 data=response.read();assert response.status==206 and len(data)==100;assert data==(ROOT/'audio/b/home-morning.m4a').read_bytes()[:100]
 ranged={'status':response.status,'contentRange':response.headers.get('Content-Range'),'bytes':len(data)}
report={'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'playtestPrevious':previous,'playtestCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'changes':changes,'unchangedAudioAndGameTree':True,'files':files,'range':ranged,'physicalIPhoneSpeakerVerified':False,'status':'candidate published; physical speaker confirmation pending'}
(OUT/'public-verification.json').write_text(json.dumps(report,indent=1)+'\n');print('PASS',len(files),'public file hashes; AAC206 range; only4 output/diagnostic files changed. PhysicaliPhone pending.')
