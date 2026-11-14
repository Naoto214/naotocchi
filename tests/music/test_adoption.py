import unittest,pathlib,sys,json,tempfile,shutil
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/music'))
from library import Library,sha,digest,read_json,atomic
import test_library as fixtures
class AdoptionTests(unittest.TestCase):
 def test_original32_identity_melody_assets_and50_rows(self):
  L=Library(ROOT);L.preserve();d=L.read();self.assertEqual(len(d['tracks']),32);self.assertEqual(sum(t['melody']['notes'] for t in d['tracks']),3158);self.assertEqual(len(read_json(L.music/'placements.json')),50)
  scores={s['id']:s for s in read_json(L.music/'provenance/scores-v7.json')}
  for t in d['tracks']:
   notes=[e for e in scores[t['id']]['events'] if e['role']=='melody'];self.assertEqual(digest([[e['t'],e['midi'],e['dur']] for e in notes]),t['melody']['sha256']);self.assertEqual(t['individualGainDb'],0)
 def test_add33_resume_approval_deployment_and_original32_unchanged(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);shutil.copytree(ROOT/'music',root/'music',ignore=shutil.ignore_patterns('.writer.lock','__pycache__'));shutil.copytree(ROOT/'assets/bgm',root/'assets/bgm')
   L=Library(root);original={p:sha(root/p) for p in read_json(L.music/'approved32.lock.json')['files']}
   license=root/'music/mock-license.txt';license.write_text('Generated sine fixture; CC0-1.0; never a production song')
   sources=read_json(L.music/'sources.json');sources['test-source']={'license':'CC0-1.0','reviewed':True,'reference':'https://creativecommons.org/publicdomain/zero/1.0/','licenseFile':'music/mock-license.txt','licenseSha256':sha(license)};atomic(L.music/'sources.json',sources)
   fixture=fixtures.MusicLibraryTests();fixture.root=root;t=fixture.candidate();L.register(t)
   self.assertEqual(len(L.read()['tracks']),33);r=L.verify();self.assertEqual(r['analyzed'],0);self.assertEqual(r['skipped'],33)
   self.assertNotIn(t['id'],L.build()['approvedIds']);self.assertNotIn(t['assets']['aac']['path'],L.build()['runtimeFiles'])
   L.approve(t['id'],'automated mock approval only, never production')
   atomic(L.music/'extensions.json',{'rows':[{'rowId':'mock-51','game':'test only','scene':'mock new game','songs':[t['id']]}],'gameSongs':{'mock-new-game':t['id']}})
   result=L.build();self.assertEqual(len(result['approvedIds']),33);self.assertIn(t['assets']['aac']['path'],result['runtimeFiles']);self.assertEqual(original,{p:sha(root/p) for p in original})
   # Adding an independently reviewed source must not invalidate the original32.
   sources=read_json(L.music/'sources.json');sources['additional-reviewed-source']=dict(sources['vsco']);atomic(L.music/'sources.json',sources);L.preserve()
  self.assertEqual(len(Library(ROOT).read()['tracks']),32)
if __name__=='__main__':unittest.main()
