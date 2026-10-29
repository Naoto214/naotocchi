"""Packaging must reject gzip JS and missing derivatives instead of hiding mismatches."""
import importlib.util, pathlib, tempfile, unittest, gzip
spec=importlib.util.spec_from_file_location('package',pathlib.Path(__file__).parents[1]/'tools/home-v8-package.py')
class PackageTest(unittest.TestCase):
 def test_no_gzip_javascript(self):
  mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'game.js';p.write_bytes(gzip.compress(b'const ok=true;'))
   with self.assertRaisesRegex(ValueError,'gzip'):mod.validate_javascript(pathlib.Path(root))
 def test_plain_javascript_keeps_exact_bytes(self):
  mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'game.js';data=b'// comment\nconst ok=true;\n';p.write_bytes(data)
   mod.validate_javascript(pathlib.Path(root));self.assertEqual(data,p.read_bytes())
if __name__=='__main__':unittest.main()
