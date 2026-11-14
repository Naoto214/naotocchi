import unittest,pathlib,importlib.util
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Resume(unittest.TestCase):
 def test_score_and_renderer_invalidate_receipt(self):
  path=ROOT/'tools/provenance.py';self.assertTrue(path.exists(),'fingerprinting must exist before rendering')
  spec=importlib.util.spec_from_file_location('provenance',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  a=m.fingerprint({'id':'home-night','events':[{'vel':.1}]})
  b=m.fingerprint({'id':'home-night','events':[{'vel':.2}]})
  self.assertNotEqual(a,b);self.assertEqual(a,m.fingerprint({'id':'home-night','events':[{'vel':.1}]}))
if __name__=='__main__':unittest.main()
