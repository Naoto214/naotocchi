import unittest,pathlib,sys,json,tempfile,shutil
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/music'))
from library import Library,sha,digest,read_json,atomic
import test_library as fixtures
class AdoptionTests(unittest.TestCase):
 def test_original32_identity_melody_assets_and50_rows(self):
  L=Library(ROOT);L.preserve();d=L.read();frozen=read_json(L.music/'approved32.lock.json')['tracks'];original=[t for t in d['tracks'] if t['id'] in frozen];self.assertEqual(len(original),32);self.assertEqual(sum(t['melody']['notes'] for t in original),3158);self.assertEqual(len(read_json(L.music/'placements.json')),50)
  scores={s['id']:s for s in read_json(L.music/'provenance/scores-v7.json')}
  for t in original:
   notes=[e for e in scores[t['id']]['events'] if e['role']=='melody'];self.assertEqual(digest([[e['t'],e['midi'],e['dur']] for e in notes]),t['melody']['sha256']);self.assertEqual(t['individualGainDb'],0)
 def test_home4_assets_match_original_b2plus_lock(self):
  lock=read_json(ROOT/'music/provenance/HOME-LOCK.json')['files']
  for t in Library(ROOT).read()['tracks']:
   if t['id'] not in ['home-morning','home-day','home-evening','home-night']:continue
   for kind,ext,folder in [('aac','m4a','audio'),('flac','flac','audio'),('midi','mid','midi')]:self.assertEqual(sha(ROOT/t['assets'][kind]['path']),lock[folder+'/'+t['id']+'.'+ext]['sha256'])
 def test_add33_resume_approval_deployment_and_original32_unchanged(self):
  initial=len(Library(ROOT).read()['tracks']);approved=sum(t['status']=='approved' for t in Library(ROOT).read()['tracks'])
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);shutil.copytree(ROOT/'music',root/'music',ignore=shutil.ignore_patterns('.writer.lock','__pycache__'));shutil.copytree(ROOT/'assets/bgm',root/'assets/bgm')
   L=Library(root);original={p:sha(root/p) for p in read_json(L.music/'approved32.lock.json')['files']}
   source_id='test-source-'+str(initial+1);license=root/('music/'+source_id+'.txt');license.write_text('Generated sine fixture; CC0-1.0; never a production song')
   sources=read_json(L.music/'sources.json');sources[source_id]={'license':'CC0-1.0','reviewed':True,'reference':'https://creativecommons.org/publicdomain/zero/1.0/','licenseFile':str(license.relative_to(root)),'licenseSha256':sha(license)};atomic(L.music/'sources.json',sources)
   fixture=fixtures.MusicLibraryTests();fixture.root=root;t=fixture.candidate('test-additional-'+str(initial+1));t['sources']=[source_id];L.register(t)
   self.assertEqual(len(L.read()['tracks']),initial+1);r=L.verify();self.assertEqual(r['analyzed'],0);self.assertEqual(r['skipped'],initial+1)
   self.assertNotIn(t['id'],L.build()['approvedIds']);self.assertNotIn(t['assets']['aac']['path'],L.build()['runtimeFiles'])
   L.approve(t['id'],'automated mock approval only, never production')
   extensions=read_json(L.music/'extensions.json');extensions['rows'].append({'rowId':'mock-add-'+str(initial+1),'game':'test only','scene':'mock new game','songs':[t['id']]});extensions['gameSongs']['mock-game-'+str(initial+1)]=t['id'];atomic(L.music/'extensions.json',extensions)
   result=L.build();self.assertEqual(len(result['approvedIds']),approved+1);self.assertIn(t['assets']['aac']['path'],result['runtimeFiles']);self.assertEqual(original,{p:sha(root/p) for p in original})
   # Adding an independently reviewed source must not invalidate the original32.
   sources=read_json(L.music/'sources.json');sources['additional-reviewed-source']=dict(sources['vsco']);atomic(L.music/'sources.json',sources);L.preserve()
  self.assertEqual(len(Library(ROOT).read()['tracks']),initial)
if __name__=='__main__':unittest.main()
