"""Preview-only assets/catalog/cache refs; preserve runtime conditions and save code."""
import pathlib,json,hashlib,shutil,sys,re
ROOT=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(sys.argv[1]).resolve()
assert p.name=='playtest' and (p/'bgm-v7-final/index.html').is_file()
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
scores=json.loads((ROOT/'scores-v7.json').read_text());receipts={s['id']:json.loads((ROOT/'receipts'/(s['id']+'.json')).read_text()) for s in scores}
for sid,r in receipts.items():
 old=json.loads((ROOT.parent/'bgm-v6-20261114/receipts'/(sid+'.json')).read_text());assert not r['problems']
 assert sha(ROOT/'audio'/(sid+'.m4a'))==r['aacSha256']
 assert sha(p/'assets/bgm'/(sid+'.m4a')) in (old['aacSha256'],r['aacSha256']),sid+' unexpected runtime'
 assert sha(p/'audio/v6'/(sid+'.m4a'))==old['aacSha256'],sid+' V6 archive changed'
(p/'audio/v7-complete').mkdir(exist_ok=True,parents=True)
for sid in receipts:
 for target in ('audio/v7-complete','assets/bgm'):shutil.copy2(ROOT/'audio'/(sid+'.m4a'),p/target/(sid+'.m4a'))
shutil.copytree(ROOT/'compare',p/'bgm-v7-complete',dirs_exist_ok=True)
f=p/'assets/bgm/catalog.js';t=f.read_text().replace('VERSION 6','VERSION 7')
for sid,r in receipts.items():
 old=json.loads((ROOT.parent/'bgm-v6-20261114/receipts'/(sid+'.json')).read_text());t=t.replace(old['aacSha256'],r['aacSha256']);t=re.sub(re.escape(sid)+r'\.m4a\?v=[a-f0-9]+',sid+'.m4a?v='+r['aacSha256'][:12],t)
f.write_text(t);h=sha(f)[:12]
for f in p.rglob('*.html'):
 if '.git' in f.parts:continue
 t=f.read_text();n=re.sub(r'(assets/bgm/catalog\.js)(?:\?v=[a-f0-9]+)?',lambda m:m[1]+'?v='+h,t)
 if n!=t:f.write_text(n)
print('Prepared preview32 audio; catalog cache',h)
