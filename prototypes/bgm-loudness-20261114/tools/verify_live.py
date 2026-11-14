"""Read-only HTTPS verification of deployed preview code and all32 AAC assets."""
import pathlib,json,hashlib,urllib.request,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1];P=pathlib.Path('/workspace/work/playtest');BASE='https://naoto214.github.io/naotocchi-playtest/'
files=['bgm-subapps.js','audio.js','bgm-v2.js','index.html','assets/bgm/catalog.js','assets/bgm/placement.js','prototypes/card-game/index.html','prototypes/life-sugoroku/index.html','prototypes/naopoyo-time-hand-chapter1/index.html']
files += ['bgm-v7-complete/'+p.name for p in (P/'bgm-v7-complete').iterdir() if p.is_file()]
tracks=json.loads((ROOT/'analysis/detailed32.json').read_text())['tracks']
files += [folder+r['id']+'.m4a' for folder in ['assets/bgm/','audio/v7-complete/'] for r in tracks]
def check(path):
 req=urllib.request.Request(BASE+path+'?loudness=caa8335',headers={'User-Agent':'BGM-loudness-read-only-verification'})
 with urllib.request.urlopen(req,timeout=90) as response:payload=response.read();status=response.status
 actual=hashlib.sha256(payload).hexdigest();expected=hashlib.sha256((P/path).read_bytes()).hexdigest();assert actual==expected,(path,actual,expected)
 return {'path':path,'status':status,'sha256':actual}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,files))
out={'passed':True,'previewCommit':'caa8335fefd0f2b66c4ea736e057804f1515c6d4','url':BASE,'tlsCertificateValidation':True,'files':results,'physicalSpeakerAudibility':'not measured'}
(ROOT/'verification/live-https.json').write_text(json.dumps(out,indent=1)+'\n');print('PASS live HTTPS SHA256:',len(results),'files including32 runtime +32 comparison AAC, patched JS/3 cache references and unchanged player/output/core')
