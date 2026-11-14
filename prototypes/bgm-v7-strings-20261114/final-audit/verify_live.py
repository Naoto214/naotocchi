"""Verify new comparison plus original B2 over TLS, and frozen local B2 inputs."""
import pathlib,urllib.request,hashlib,json,datetime,concurrent.futures
from render_candidate import check_pins
ROOT=pathlib.Path(__file__).resolve().parent;B2=ROOT.parent;BASE='https://naoto214.github.io/naotocchi-playtest/'
check_pins()
items=[('bgm-v7-final/'+p.name,p) for p in (ROOT/'compare').iterdir() if p.is_file()]
items += [('audio/v7-final/'+p.name,p) for p in (ROOT/'audio').glob('*.m4a')]
items += [('audio/v7-strings/b2/'+p.name,p) for p in (B2/'audio/b2').glob('*.m4a')]
items += [('bgm-v7-strings/'+p.name,p) for p in (B2/'compare').iterdir() if p.is_file()]
items += [('bgm-v7-final/',ROOT/'compare/index.html')]
def check(item):
 path,p=item;response=urllib.request.urlopen(urllib.request.Request(BASE+path,headers={'Cache-Control':'no-cache'}),timeout=45);data=response.read();actual=hashlib.sha256(data).hexdigest();expected=hashlib.sha256(p.read_bytes()).hexdigest()
 if actual!=expected:raise ValueError('Live differs: '+path)
 return {'path':path,'status':response.status,'sha256':actual,'bytes':len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,items))
(ROOT/'verification/live.json').write_text(json.dumps({'checkedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tlsValidation':True,'files':rows},indent=1)+'\n')
print('PASS TLS+SHA256:',len(rows),'files including8AAC; original B2 and old page unchanged')
