"""Verify published HTTPS bytes against approved/source hashes; normal TLS verification."""
import pathlib,json,hashlib,urllib.request,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1];HOST='https://naoto214.github.io/naotocchi-playtest/'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
jobs=[]
for r in (ROOT/'receipts').glob('*.json'):
 d=json.loads(r.read_text());sid=r.stem
 for folder in ('audio/v7-complete','assets/bgm'):jobs.append((folder+'/'+sid+'.m4a?v='+d['aacSha256'][:12],d['aacSha256']))
 if sid.startswith('home-'):jobs.append(('audio/v7-final/'+sid+'.m4a',d['aacSha256']))
for p in (ROOT/'compare').iterdir():jobs.append(('bgm-v7-complete/'+p.name,sha(p)))
jobs.append(('assets/bgm/catalog.js?v=655704994b32',sha(pathlib.Path('/workspace/work/playtest/assets/bgm/catalog.js'))))
def verify(job):
 rel,expected=job
 with urllib.request.urlopen(HOST+rel,timeout=90) as res:
  data=res.read();actual=hashlib.sha256(data).hexdigest();assert actual==expected,(rel,actual,expected)
  return {'path':rel,'status':res.status,'bytes':len(data),'sha256':actual,'contentType':res.headers.get('Content-Type')}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(verify,jobs))
(ROOT/'verification/live-hashes.json').write_text(json.dumps({'url':HOST+'bgm-v7-complete/','passed':True,'files':results},indent=1)+'\n')
print('PASS',len(results),'published HTTPS files match saved hashes, including32 runtime +32 comparison +4 approved home archives')
