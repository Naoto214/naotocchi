import pathlib,json,sys,fnmatch,concurrent.futures,urllib.request,hashlib,time
repo=pathlib.Path(__file__).resolve().parents[3];sys.path.insert(0,str(repo/'prototypes/bgm-v2-20261112/tools'))
import library
scores=json.loads((repo/'prototypes/bgm-v5-20261115/scores-v5.json').read_text());used={e['instrument'] for s in scores for e in s['events']};patterns=[library.SPEC[i]['glob'] for i in used if i in library.SPEC]
manifest=json.loads((repo/'prototypes/bgm-v2-20261112/samples-manifest.json').read_text())
files=[f for f in manifest['files'] if f['path']=='Readme.txt' or any(fnmatch.fnmatch(f['path'],p) for p in patterns)]
root=pathlib.Path(__import__('os').environ['VSCO_DIR']);root.mkdir(exist_ok=True)
def fetch(f):
 p=root/f['path'];p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256']:return
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(f['url'],timeout=90).read();assert hashlib.sha256(data).hexdigest()==f['sha256'];p.write_bytes(data);return
  except Exception:
   if attempt==2:raise
   time.sleep(1)
print('Downloading',len(files),'verified samples, MB',round(sum(f['bytes'] for f in files)/1e6),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 for i,_ in enumerate(ex.map(fetch,files)):
  if i%30==0:print(i+1,'/',len(files),flush=True)
print('Complete; every sample SHA-256 verified',flush=True)
