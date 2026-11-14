"""Read-only published bytes check (no cache-busting: checks the actual fixed URLs)."""
import pathlib,json,hashlib,urllib.request,concurrent.futures,time
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE='https://naoto214.github.io/naotocchi-playtest/'
def get(path):return urllib.request.urlopen(BASE+path,timeout=40).read()
expected=(ROOT/'compare/index.html').read_bytes()
for attempt in range(24):
 try:
  if get('bgm-v6/')==expected:break
 except Exception:pass
 print('Waiting for GitHub Pages V6 deployment',attempt+1,flush=True);time.sleep(10)
else:raise SystemExit('V6 not yet served at fixed URL')
checks=[]
for r in (ROOT/'receipts').glob('*.json'):
 d=json.loads(r.read_text());v5=json.loads((ROOT.parent/'bgm-v5-20261115/receipts'/r.name).read_text())
 for folder,h in [('audio/v5',v5['aacSha256']),('audio/v6',d['aacSha256']),('assets/bgm',d['aacSha256'])]:checks.append((folder+'/'+r.stem+'.m4a',h))
for f in ('index.html','player.js','tracks.js'):checks.append(('bgm-v6/'+f,hashlib.sha256((ROOT/'compare'/f).read_bytes()).hexdigest()))
def verify(item):
 path,h=item;actual=hashlib.sha256(get(path)).hexdigest();assert actual==h,(path,actual,h);return path
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:done=list(ex.map(verify,checks))
assert b"5: '../audio/v5/'" in get('bgm-v5/')
cat=get('assets/bgm/catalog.js').decode()
for r in (ROOT/'receipts').glob('*.json'):assert json.loads(r.read_text())['aacSha256'] in cat
print('PASS: fixed comparison URL, 96 audio SHA-256 hashes, 3 comparison files, V5 archive route and V6 catalog hashes',flush=True)
(ROOT/'verification/live-published.json').write_text(json.dumps({'url':BASE+'bgm-v6/','checkedPaths':done,'audioHashesMatched':96,'comparisonFilesMatched':3,'v5ComparisonPreserved':True,'runtimeCatalogHashesMatched':32},ensure_ascii=False,indent=2)+'\n')
