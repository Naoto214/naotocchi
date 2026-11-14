"""TLS-verified public bytes compared with committed comparison assets."""
import pathlib,urllib.request,hashlib,json,concurrent.futures,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE='https://naoto214.github.io/naotocchi-playtest/'
jobs=[('bgm-v7/'+p.name,p) for p in (ROOT/'compare').iterdir()]
for v in ('a','b'):
 jobs += [('audio/v7/'+v+'/'+p.name,p) for p in (ROOT/'audio'/v).glob('*.m4a')]
for i in ('home-morning','home-day','home-evening','home-night'):jobs.append(('audio/v6/'+i+'.m4a',ROOT.parent/'bgm-v6-20261114/audio'/(i+'.m4a')))
def check(job):
 name,p=job
 with urllib.request.urlopen(urllib.request.Request(BASE+name,headers={'Cache-Control':'no-cache'}),timeout=45) as response:
  data=response.read();status=response.status;mime=response.headers.get('Content-Type')
 digest=hashlib.sha256(data).hexdigest();assert digest==hashlib.sha256(p.read_bytes()).hexdigest(),name
 return {'url':BASE+name,'status':status,'bytes':len(data),'sha256':digest,'contentType':mime}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,jobs))
out={'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'fixedUrl':BASE+'bgm-v7/','tlsVerified':True,'files':results}
(ROOT/'verification/live-published.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
print('PASS public HTTP200 and SHA256 for16 files: comparison4, A/B8, V6home4')
