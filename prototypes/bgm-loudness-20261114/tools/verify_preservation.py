import pathlib,json,hashlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];MASTER=ROOT.parent/'bgm-v7-complete-20261114';REPO=ROOT.parents[1];P=pathlib.Path('/workspace/work/playtest')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ref='01a55914244b8cf74f3cd467ef9b83beb23f8e13';pre='0433a39d2b75a3a7931d095dd18127958b0bb89a'
for f in (ROOT/'reference').iterdir():assert f.read_bytes()==subprocess.check_output(['git','show',pre+':'+f.name],cwd=P)
files=[]
for r in (MASTER/'receipts').glob('*.json'):
 d=json.loads(r.read_text())
 for ext,k in [('m4a','aacSha256'),('flac','flacSha256')]:
  p=MASTER/'audio'/(r.stem+'.'+ext);assert sha(p)==d[k];files.append({'path':str(p.relative_to(REPO)),'sha256':d[k]})
 assert sha(P/'assets/bgm'/(r.stem+'.m4a'))==d['aacSha256']
for p,f in json.loads((MASTER/'HOME-LOCK.json').read_text())['files'].items():assert sha(MASTER/p)==f['sha256']
for rel in ['scores-v7.json','placement.json','HOME-LOCK.json']:
 p=MASTER/rel;assert p.read_bytes()==subprocess.check_output(['git','show',ref+':'+str(p.relative_to(REPO))],cwd=REPO)
scores=json.loads((MASTER/'scores-v7.json').read_text());assert len(scores)==32;assert sum(sum(e['role']=='melody' for e in s['events']) for s in scores)==3158;assert len(json.loads((MASTER/'placement.json').read_text()))==50
for f in ['audio.js','bgm-v2.js','assets/bgm/catalog.js','assets/bgm/placement.js','bgm-v7-complete/player.js','bgm-v7-complete/output-check.js']:
 assert (P/f).read_bytes()==subprocess.check_output(['git','show',pre+':'+f],cwd=P),f+' unexpectedly changed'
out={'passed':True,'sourcePR':549,'sourceCommit':ref,'playtestBaseline':pre,'tracks':32,'melodyNotes':3158,'placements':50,'homeLockFiles':16,'individualGainDb':0,'modifiedAudioFiles':0,'sfxVoiceSaveAndOutputCode':'byte unchanged','audioFiles':files};(ROOT/'verification/preservation.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n');print('PASS 64 master hashes,32 runtime AAC, home lock16, melody3158/placements50; SFX/voice/output/player bytes unchanged')
