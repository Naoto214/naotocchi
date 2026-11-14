"""Fail closed on any preview delta outside the authorized audio/catalog/page scope."""
import pathlib,sys,json,hashlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(sys.argv[1]);base='e01d84bcb891847c8918daa263b96f01ebef069b'
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
receipts={r.stem:json.loads(r.read_text()) for r in (ROOT/'receipts').glob('*.json')};assert len(receipts)==32
for sid,r in receipts.items():
 for target in ('assets/bgm','audio/v7-complete'):assert sha(p/target/(sid+'.m4a'))==r['aacSha256']
 old=json.loads((ROOT.parent/'bgm-v6-20261114/receipts'/(sid+'.json')).read_text());assert sha(p/'audio/v6'/(sid+'.m4a'))==old['aacSha256']
 if sid.startswith('home-'):assert sha(p/'audio/v7-final'/(sid+'.m4a'))==r['aacSha256']
cat=(p/'assets/bgm/catalog.js').read_text();oldcat=subprocess.check_output(['git','show',base+':assets/bgm/catalog.js'],cwd=p,text=True)
for sid,r in receipts.items():assert r['aacSha256'] in cat and sid+'.m4a?v='+r['aacSha256'][:12] in cat
norm=lambda t:re.sub(r'"sha256": "[a-f0-9]+"','"sha256": "HASH"',re.sub(r'\.m4a\?v=[a-f0-9]+','.m4a',t)).replace('VERSION 7','VERSION 6')
assert norm(cat)==norm(oldcat),'catalog behavior changed'
files=set(subprocess.check_output(['git','diff','--name-only',base],cwd=p,text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=p,text=True).splitlines())
for f in files:
 if f=='assets/bgm/catalog.js' or f in {'assets/bgm/'+i+'.m4a' for i in receipts}:continue
 if f.startswith(('audio/v7-complete/','bgm-v7-complete/')):continue
 assert f.endswith('.html'),f
 old=subprocess.check_output(['git','show',base+':'+f],cwd=p,text=True);new=(p/f).read_text()
 normalize=lambda t:re.sub(r'(assets/bgm/catalog\.js)(?:\?v=[a-f0-9]+)?',r'\1',t)
 assert normalize(old)==normalize(new),'non-BGM change '+f
for f in (ROOT/'compare').iterdir():assert sha(f)==sha(p/'bgm-v7-complete'/f.name)
report={'passed':True,'base':base,'runtimeFiles':32,'comparisonFiles':32,'homeArchiveExact':4,'v6ArchiveExact':32,'changedFiles':sorted(files),'gameCodeAndSaveCode':'unchanged','catalogFields':'only audio SHA/cache and version comment'}
(ROOT/'verification/playtest-scope.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n')
print('PASS preview32, archives preserved, game/save/runtime conditions unchanged; '+str(len(files))+' scoped files')
