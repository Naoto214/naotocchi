import unittest,pathlib,tempfile,hashlib
class SampleIntegrity(unittest.TestCase):
 def test_changed_sample_rejected(self):
  path=pathlib.Path(__file__).with_name('check_samples.py');self.assertTrue(path.exists(),'sample checks required before cache or rendering')
  from check_samples import verify_files
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d);(p/'sample.wav').write_bytes(b'original');manifest=[{'path':'sample.wav','sha256':hashlib.sha256(b'original').hexdigest()}]
   self.assertEqual(verify_files(p,manifest),1)
   (p/'sample.wav').write_bytes(b'changed')
   with self.assertRaises(ValueError):verify_files(p,manifest)
if __name__=='__main__':unittest.main()
