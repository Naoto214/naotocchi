import concurrent.futures,urllib.request,json,hashlib,time,os
manifest=json.load(open(os.environ.get('PACKAGE_REPORT','/tmp/naopoyo-package-release.json')))
base='https://naoto214.github.io/naotocchi/'
sha=os.environ.get('RELEASE_SHA',manifest['source_head'])
def check(item):
 p,expected=item
 for attempt in range(3):
  try:
   req=urllib.request.Request(base+p+'?release='+sha,headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(req,timeout=40) as response:
    body=response.read();actual=hashlib.sha256(body).hexdigest()
    if actual==expected:return None
    error={'path':p,'expected':expected,'actual':actual,'bytes':len(body)}
  except Exception as e:error={'path':p,'error':str(e)}
 return error
started=time.time();failures=[];total=0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 for result in pool.map(check,manifest['sha256'].items()):
  total+=1
  if result:failures.append(result)
  if total%500==0:print('verified',total,'failures',len(failures),flush=True)
result={'url':base,'release_sha':sha,'manifest_source_head':manifest['source_head'],'files':total,'matching':total-len(failures),'failures':failures,'seconds':round(time.time()-started,2),'status':'passed' if not failures else 'failed'}
json.dump(result,open(os.environ.get('HTTP_OUT','/tmp/naopoyo-production-http.json'),'w'),indent=2);print(json.dumps(result));raise SystemExit(bool(failures))
