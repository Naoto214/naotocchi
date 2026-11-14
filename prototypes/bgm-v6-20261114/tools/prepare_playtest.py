"""Prepare only BGM assets, fixed comparison archives and catalog cache references.
Does not push or deploy. Run verify_v6.py and verify_playtest.py before publishing.
"""
import pathlib,json,hashlib,shutil,sys,re
ROOT=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(sys.argv[1]).resolve()
assert p.name=='playtest' and (p/'bgm-v5/index.html').is_file()
receipts=list((ROOT/'receipts').glob('*.json'));assert len(receipts)==32
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
for r in receipts:
 d=json.loads(r.read_text());old=json.loads((ROOT.parent/'bgm-v5-20261115/receipts'/r.name).read_text());sid=r.stem
 assert not d['problems'];assert sha(ROOT/'audio'/f'{sid}.m4a')==d['aacSha256'];assert sha(ROOT.parent/'bgm-v5-20261115/audio'/f'{sid}.m4a')==old['aacSha256']
 current=sha(p/'assets/bgm'/f'{sid}.m4a');assert current in (old['aacSha256'],d['aacSha256']),sid+' unexpected playtest audio'
for v in ('v5','v6'):(p/'audio'/v).mkdir(parents=True,exist_ok=True)
for r in receipts:
 sid=r.stem
 shutil.copy2(ROOT.parent/'bgm-v5-20261115/audio'/f'{sid}.m4a',p/'audio/v5'/f'{sid}.m4a')
 for target in ('audio/v6','assets/bgm'):shutil.copy2(ROOT/'audio'/f'{sid}.m4a',p/target/f'{sid}.m4a')
shutil.copytree(ROOT/'compare',p/'bgm-v6',dirs_exist_ok=True)
f=p/'bgm-v5/index.html';t=f.read_text();t=t.replace("5: '../assets/bgm/'","5: '../audio/v5/'");assert "5: '../audio/v5/'" in t;f.write_text(t)
f=p/'assets/bgm/catalog.js';t=f.read_text().replace('VERSION 5','VERSION 6')
for r in receipts:
 sid=r.stem;d=json.loads(r.read_text());old=json.loads((ROOT.parent/'bgm-v5-20261115/receipts'/r.name).read_text());t=t.replace(old['aacSha256'],d['aacSha256']);t=re.sub(re.escape(sid)+r'\.m4a\?v=[a-f0-9]+',sid+'.m4a?v='+d['aacSha256'][:12],t)
f.write_text(t);h=sha(f)[:12]
for f in p.rglob('*.html'):
 if '.git' in f.parts:continue
 t=f.read_text();new=re.sub(r'(assets/bgm/catalog\.js)(?:\?v=[a-f0-9]+)?',lambda m:m[1]+'?v='+h,t)
 if new!=t:f.write_text(new)
print('Prepared V5 archive, V6 fixed comparison and 32 runtime audio files; catalog cache',h)
