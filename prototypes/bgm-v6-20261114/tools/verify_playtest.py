"""Verify the prepared playtest delta is confined to audio and its comparisons/cache keys."""
import pathlib,sys,json,hashlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(sys.argv[1]);base='f891b81478eb8f4425ac3dab11077d2df0e17540'
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
assert len(list((ROOT/'receipts').glob('*.json')))==32
assert (p/'bgm-v6/index.html').exists(),'V6 comparison must be present'
for r in (ROOT/'receipts').glob('*.json'):
 d=json.loads(r.read_text());sid=r.stem;old=json.loads((ROOT.parent/'bgm-v5-20261115/receipts'/r.name).read_text())
 assert sha(p/'audio/v5'/f'{sid}.m4a')==old['aacSha256']
 assert sha(p/'audio/v6'/f'{sid}.m4a')==d['aacSha256']
 assert sha(p/'assets/bgm'/f'{sid}.m4a')==d['aacSha256']
cat=(p/'assets/bgm/catalog.js').read_text();oldcat=subprocess.check_output(['git','show',base+':assets/bgm/catalog.js'],cwd=p,text=True)
normalize=lambda t:re.sub(r'\.m4a\?v=[a-f0-9]+','.m4a',t).replace('VERSION 6','VERSION 5')
assert normalize(cat)==normalize(oldcat),'catalog fields changed beyond audio cache key'
assert "5: '../audio/v5/'" in (p/'bgm-v5/index.html').read_text(),'V5 comparison must remain V5'
files=subprocess.check_output(['git','diff','--name-only',base],cwd=p,text=True).splitlines()
for f in files:
 if f.startswith(('assets/bgm/','audio/v5/','audio/v6/','bgm-v6/')) or f=='bgm-v5/index.html':continue
 assert f.endswith('.html'),f
 old=subprocess.check_output(['git','show',base+':'+f],cwd=p,text=True);new=(p/f).read_text()
 norm=lambda t:re.sub(r'(assets/bgm/catalog\.js)(?:\?v=[a-f0-9]+)?',r'\1',t)
 assert norm(old)==norm(new),'non-BGM change '+f
print('PASS: 32 V6 runtime files, 32 V5 archive files, 32 V6 comparison files; game behavior/catalog fields unchanged')
