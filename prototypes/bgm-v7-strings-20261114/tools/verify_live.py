"""TLS-validated live byte check; local browser tests use these exact served assets."""
import pathlib,urllib.request,hashlib,json,concurrent.futures,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114';BASE='https://naoto214.github.io/naotocchi-playtest/'
items=[('bgm-v7-strings/'+p.name,p) for p in (ROOT/'compare').iterdir() if p.is_file()]
items += [('audio/v7-strings/'+v+'/'+p.name,p) for v in ('b1','b2') for p in (ROOT/'audio'/v).glob('*.m4a')]
items += [('audio/v7-strings/dry/'+v+'/'+p.name,p) for v in ('a','b1','b2') for p in (ROOT/'diagnostics'/v).glob('*.m4a')]
items += [('audio/v7/b/'+p.name,p) for p in (V7/'audio/b').glob('*.m4a')]
items += [('bgm-v7/'+p.name,p) for p in (V7/'compare').iterdir() if p.is_file()]
def check(item):
 path,p=item;req=urllib.request.Request(BASE+path,headers={'Cache-Control':'no-cache'});response=urllib.request.urlopen(req,timeout=45);data=response.read();actual=hashlib.sha256(data).hexdigest();expected=hashlib.sha256(p.read_bytes()).hexdigest()
 if actual!=expected:raise ValueError('Live differs: '+path)
 return {'path':path,'status':response.status,'bytes':len(data),'sha256':actual}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:results=list(pool.map(check,items))
(ROOT/'verification/live.json').write_text(json.dumps({'checkedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tlsValidation':True,'files':results},indent=1)+'\n')
print('PASS live TLS+SHA256:',len(results),'files including24AAC; old V7 page and originalB unchanged')
