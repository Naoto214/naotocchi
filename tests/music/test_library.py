"""Behavioral boundaries for candidate registration and approved-only publication."""
import unittest,pathlib,tempfile,json,shutil,subprocess,sys,importlib.util
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/music'))
class MusicLibraryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  assert (ROOT/'tools/music/library.py').exists(),'incremental library CLI must exist'
  import library
  cls.libmod=library
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=pathlib.Path(self.tmp.name)
  (self.root/'music').mkdir();(self.root/'assets/bgm').mkdir(parents=True)
  self.write('music/library.json',{'version':1,'tracks':[]})
  self.write('music/approved32.lock.json',{'version':1,'tracks':{},'files':{}})
  self.write('music/placements.json',[]);self.write('music/game-songs.json',{});self.write('music/extensions.json',{'rows':[],'gameSongs':{}})
  (self.root/'music/cc0.txt').write_text('CC0 fixture rights statement')
  self.write('music/sources.json',{'test-source':{'license':'CC0-1.0','reviewed':True,'reference':'https://example.com/cc0','licenseFile':'music/cc0.txt','licenseSha256':self.libmod.sha(self.root/'music/cc0.txt')}})
  shutil.copy(ROOT/'music/policy.json',self.root/'music/policy.json')
  self.L=self.libmod.Library(self.root)
 def write(self,p,v):
  f=self.root/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(json.dumps(v));return f
 def candidate(self,sid='test-new-33'):
  import mido
  folder=self.root/'music/candidates'/sid;folder.mkdir(parents=True)
  subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=4','-ac','2','-ar','44100',str(folder/'master.flac')],check=True)
  subprocess.run(['ffmpeg','-v','error','-i',str(folder/'master.flac'),'-c:a','aac','-b:a','192k',str(self.root/'assets/bgm'/f'{sid}.m4a')],check=True)
  mf=mido.MidiFile();tr=mido.MidiTrack();mf.tracks.append(tr);tr.append(mido.Message('note_on',note=69,velocity=40));tr.append(mido.Message('note_off',note=69,time=3840));mf.save(folder/'score.mid')
  score=self.write(f'music/candidates/{sid}/score.json',{'events':[{'t':0,'midi':69,'dur':4,'role':'melody'}]})
  return {'id':sid,'title':'試験専用・正式一覧に残さない','uses':[],'kind':'bgm','bpm':120,'meter':'4/4','key':{'declared':'A','basis':'test fixture'},'duration':4,'frames':176400,'sampleRate':44100,'loop':{'enabled':True,'start':0,'end':4},'assets':{'aac':{'path':f'assets/bgm/{sid}.m4a'},'flac':{'path':str((folder/'master.flac').relative_to(self.root))},'midi':{'path':str((folder/'score.mid').relative_to(self.root))}},'score':{'path':str(score.relative_to(self.root))},'instruments':['test sine'],'sources':['test-source'],'individualGainDb':0,'status':'candidate','history':[]}
 def test_duplicate_and_invalid_ids_cannot_overwrite_registry(self):
  t=self.candidate();self.L.register(t);before=(self.root/'music/library.json').read_bytes()
  with self.assertRaisesRegex(ValueError,'duplicate'):self.L.register(t)
  self.assertEqual(before,(self.root/'music/library.json').read_bytes())
  for bad in ['../home-day','A B','', 'x/evil']:
   with self.assertRaises(ValueError):self.L.register({**t,'id':bad})
 def test_unknown_license_and_path_escape_rejected_before_registration(self):
  t=self.candidate();t['sources']=['unknown']
  with self.assertRaisesRegex(ValueError,'source|license'):self.L.register(t)
  t['sources']=['test-source'];t['assets']['aac']['path']='../outside.m4a'
  with self.assertRaisesRegex(ValueError,'path'):self.L.register(t)
  self.assertEqual(self.L.read()['tracks'],[])
 def test_candidate_requires_revision_bound_approval_and_excluded_from_payload(self):
  t=self.candidate();self.L.register(t);result=self.L.build()
  self.assertEqual(result['approvedIds'],[]);self.assertEqual(result['runtimeFiles'],['assets/bgm/catalog.js','assets/bgm/placement.js'])
  preview=self.L.preview(self.root/'trial');self.assertEqual(preview['ids'],['test-new-33'])
  self.L.approve(t['id'],'explicit user fixture approval');result=self.L.build();self.assertIn('assets/bgm/test-new-33.m4a',result['runtimeFiles'])
  d=self.L.read();d['tracks'][0]['bpm']=121;self.write('music/library.json',d)
  with self.assertRaisesRegex(ValueError,'approval|fingerprint'):self.L.build()
 def test_successful_receipt_skips_analysis_and_corrupt_cache_rechecks(self):
  self.L.register(self.candidate());r=self.L.verify();self.assertEqual(r['analyzed'],0);self.assertEqual(r['skipped'],1)
  (self.root/'music/verification/tracks/test-new-33.json').write_text('{partial')
  r=self.L.verify();self.assertEqual(r['analyzed'],1);self.assertEqual(r['skipped'],0)
 def test_bad_loop_missing_file_and_empty_title_are_rejected(self):
  t=self.candidate()
  for mutate in [lambda x:x.update(title=' '),lambda x:x['loop'].update(end=5),lambda x:x['assets']['aac'].update(path='assets/bgm/missing.m4a')]:
   x=json.loads(json.dumps(t));mutate(x)
   with self.assertRaises(ValueError):self.L.register(x)
 def test_wrong_aac_content_is_not_accepted_as_matching_flac(self):
  t=self.candidate();p=self.root/t['assets']['aac']['path']
  subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','sine=frequency=880:duration=4','-ac','2','-c:a','aac',str(p)],check=True)
  with self.assertRaisesRegex(ValueError,'correlation|integrity'):self.L.register(t)
 def test_export_check_detects_tampering_without_rewriting_it(self):
  self.L.register(self.candidate());self.L.approve('test-new-33','fixture approval');self.L.build();p=self.root/'assets/bgm/catalog.js';p.write_text('tampered')
  with self.assertRaisesRegex(ValueError,'generated|export'):self.L.build(check=True)
  self.assertEqual(p.read_text(),'tampered')
 def test_candidate_revision_revalidates_without_overwriting_approved_music(self):
  t=self.candidate();self.L.register(t);t['bpm']=121
  self.assertTrue(hasattr(self.L,'revise'),'candidate revisions need a validated update path')
  self.L.revise(t);self.assertEqual(self.L.read()['tracks'][0]['bpm'],121)
  self.L.approve(t['id'],'fixture approval')
  with self.assertRaisesRegex(ValueError,'approved|frozen'):self.L.revise(t)
 def test_midi_notes_must_match_declared_score(self):
  import mido
  t=self.candidate();p=self.root/t['assets']['midi']['path'];m=mido.MidiFile(p)
  for tr in m.tracks:
   for e in tr:
    if e.type in ['note_on','note_off']:e.note=70
  m.save(p)
  with self.assertRaisesRegex(ValueError,'MIDI.*score'):self.L.register(t)
 def test_changed_frozen_metadata_is_rejected(self):
  t=self.candidate();self.L.register(t);self.L.approve(t['id'],'fixture approval');d=self.L.read()
  self.write('music/approved32.lock.json',{'version':1,'tracks':{t['id']:self.libmod.digest(d['tracks'][0])},'files':{}})
  d['tracks'][0]['title']='changed';self.write('music/library.json',d)
  with self.assertRaisesRegex(ValueError,'frozen|protected'):self.L.verify()
if __name__=='__main__':unittest.main()
