import importlib.util,pathlib,tempfile,unittest,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Resume(unittest.TestCase):
 def module(self):
  p=ROOT/'tools/checkpoint.py';self.assertTrue(p.exists(),'checkpoint module is missing')
  spec=importlib.util.spec_from_file_location('checkpoint',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def test_verified_files_skip_and_corruption_stops(self):
  m=self.module()
  with tempfile.TemporaryDirectory() as d:
   r=pathlib.Path(d);(r/'audio').mkdir();p=r/'audio/a.flac';p.write_bytes(b'finished');state={'files':{'audio/a.flac':m.digest(p)},'recipe':'one'}
   self.assertTrue(m.valid(r,state,'one'))
   p.write_bytes(b'corrupt')
   with self.assertRaises(ValueError):m.valid(r,state,'one')
 def test_changed_recipe_does_not_overwrite_completed_audio(self):
  m=self.module()
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):m.valid(pathlib.Path(d),{'files':{},'recipe':'old'},'new')
 def test_partial_or_missing_file_is_not_complete(self):
  m=self.module()
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):m.valid(pathlib.Path(d),{'files':{'missing':'x'},'recipe':'r'},'r')
if __name__=='__main__':unittest.main()
