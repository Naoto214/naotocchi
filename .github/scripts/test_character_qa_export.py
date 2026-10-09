import importlib.util,io,json,unittest,zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('exporter',Path(__file__).with_name('character_qa_export.py'))
class ExportTests(unittest.TestCase):
 def load(self):
  self.assertTrue(Path(spec.origin).exists(),'reusable exporter exists');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def zip(self,files):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   for name,data in files.items():z.writestr(name,data)
  return b.getvalue()
 def test_selects_original_bytes_and_metadata_without_other_families(self):
  m=self.load();raw=self.zip({'mythic/phoenix-1-front.jpg':b'original','mythic/god-3-front.jpg':b'other','mythic/evidence.json':json.dumps({'source':'a'*40}).encode()});r=m.select_files(raw,['phoenix'],'a'*40);self.assertEqual(r['mythic/phoenix-1-front.jpg'],b'original');self.assertNotIn('mythic/god-3-front.jpg',r);self.assertIn('mythic/evidence.json',r)
 def test_rejects_traversal_duplicate_and_wrong_source(self):
  m=self.load()
  for files in [{'../phoenix-1-front.jpg':b'x'},{'evidence.json':json.dumps({'source':'b'*40}).encode()}]:
   with self.assertRaises(ValueError):m.select_files(self.zip(files),['phoenix'],'a'*40)
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:z.writestr('phoenix-1-front.jpg',b'a');z.writestr('phoenix-1-front.jpg',b'b')
  with self.assertRaises(ValueError):m.select_files(b.getvalue(),['phoenix'],'a'*40)
 def test_rejects_same_image_basename_in_different_directories(self):
  m=self.load()
  with self.assertRaises(ValueError):m.select_files(self.zip({'a/phoenix-1-front.jpg':b'a','b/phoenix-1-front.jpg':b'b'}),['phoenix'],'a'*40)
 def test_required_counts_fail_closed(self):
  m=self.load()
  with self.assertRaises(ValueError):m.validate_counts({'phoenix-1-front.jpg':b'x'},[{'pattern':'phoenix-[1-8]-front.jpg','count':8}])
 def test_gallery_and_zip_keep_evidence_without_approval_claim(self):
  m=self.load();files={'mythic/phoenix-stages.jpg':b'board','mythic-motion/phoenix-1-motion.jpg':b'states','mythic/phoenix-1-front.jpg':b'raw','mythic/evidence.json':b'{}'};out=m.package_files(files,{'id':12,'digest':'sha256:abc'},'a'*40,'wave');self.assertIn('raw-evidence.zip',out);self.assertEqual(out['mythic/phoenix-stages.jpg'],b'board');self.assertEqual(out['mythic/phoenix-1-front.jpg'],b'raw')
  with zipfile.ZipFile(io.BytesIO(out['raw-evidence.zip'])) as z:self.assertEqual(z.read('mythic/phoenix-1-front.jpg'),b'raw')
  self.assertIn(b'PENDING_VISUAL_REVIEW',out['README.md']);manifest=json.loads(out['manifest.json']);self.assertEqual(len(manifest['files']),4)
if __name__=='__main__':unittest.main()
