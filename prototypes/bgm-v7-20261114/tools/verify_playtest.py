"""Verify additive deployment against git objects (works with sparse checkouts)."""
import pathlib,subprocess,json,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];repo=pathlib.Path(sys.argv[1]);base='9020b5f3e6763e4eb980db73c3450894a43f01d2'
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
def blob(p):return git('show','HEAD:'+p)
changes=git('diff',base,'HEAD','--name-status').decode().splitlines();assert len(changes)==12
for row in changes:
 status,name=row.split('\t');assert status=='A' and name.startswith(('bgm-v7/','audio/v7/'))
for v in ('a','b'):
 for f in (ROOT/'audio'/v).glob('*.m4a'):assert f.read_bytes()==blob('audio/v7/'+v+'/'+f.name)
for f in (ROOT/'compare').iterdir():assert f.read_bytes()==blob('bgm-v7/'+f.name)
for i in ('home-morning','home-day','home-evening','home-night'):assert blob('audio/v6/'+i+'.m4a')==(ROOT.parent/'bgm-v6-20261114/audio'/(i+'.m4a')).read_bytes()
(ROOT/'verification/playtest-scope.json').write_text(json.dumps({'baseline':base,'publishedCommit':git('rev-parse','HEAD').decode().strip(),'changes':changes,'allChangesAdditions':True,'existingGameAndArchivesChanged':False,'matchingNewFiles':12,'matchingV6HomeArchives':4},indent=1)+'\n')
print('PASS12 additions only, all new files exact, V6 home archives exact; no existing game/runtime/archive changes')
