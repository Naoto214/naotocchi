import sys,json,hashlib,pathlib,urllib.request,urllib.error,concurrent.futures,termios
if sys.stdin.isatty():
 attrs=termios.tcgetattr(sys.stdin.fileno());attrs[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,attrs)
print('Ready for verification JSON on stdin (hidden).',flush=True);cfg=json.loads(sys.stdin.readline());root=pathlib.Path(cfg.get('dist','/workspace/sites/naopoyo-time-hand-20261031/dist'));base=cfg['url'].rstrip('/');token=cfg['token']
def check(p):
 rel=p.relative_to(root).as_posix();expected=hashlib.sha256(p.read_bytes()).hexdigest()
 try:
  req=urllib.request.Request(base+'/'+rel,headers={'OAI-Sites-Authorization':'Bearer '+token})
  with urllib.request.urlopen(req,timeout=30) as r:body=r.read();status=r.status
  actual=hashlib.sha256(body).hexdigest();return {'path':rel,'status':status,'expected':expected,'actual':actual,'match':expected==actual}
 except Exception as e:return {'path':rel,'match':False,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:rows=list(ex.map(check,sorted(p for p in root.rglob('*') if p.is_file())))
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
try:
 with urllib.request.build_opener(NoRedirect).open(base+'/prototypes/naopoyo-time-hand/engine.mjs',timeout=30) as r:anonymous=r.status
except urllib.error.HTTPError as e:anonymous=e.code
report={'url':base,'files':rows,'matched':sum(r['match'] for r in rows),'total':len(rows),'anonymousModuleStatus':anonymous,'audience':{'owners':1,'external':0,'groups':0},'browserQA':'unverified: Connection closed'}
p=pathlib.Path(__file__).with_name('deployed-files.json');p.write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)
