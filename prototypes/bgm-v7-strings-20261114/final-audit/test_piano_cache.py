import unittest,pathlib,sys,os,tempfile,json,hashlib
import numpy as np
BASE=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));import render_v6 as V
L=V.L
if os.environ.get('TEST_BASELINE')=='1':Library=L.Library
else:
 from piano_cache import PianoLibrary as Library
class PianoCache(unittest.TestCase):
 def test_short_then_long_equals_fresh_long(self):
  lib=Library();lib.note('piano',78,.74,.65,3);long=lib.note('piano',78,3.1979,.65,3)
  fresh=Library().note('piano',78,3.1979,.65,3)
  self.assertEqual(len(long),round((3.1979+.6)*L.SR))
  np.testing.assert_allclose(long,fresh,atol=1e-7,rtol=1e-5)
 def test_short_preserved_and_release_zero(self):
  lib=Library();fixed=lib.note('piano',78,.74,.65,3);old=L.Library().note('piano',78,.74,.65,3)
  np.testing.assert_allclose(fixed,old,atol=1e-7,rtol=1e-5)
  self.assertLess(np.abs(fixed[-1]).max(),1e-7)
 def test_changed_frozen_dependency_rejected(self):
  import render_candidate as C
  saved=C.ROOT
  try:
   with tempfile.TemporaryDirectory() as d:
    root=pathlib.Path(d);dep=root/'dependency.py';dep.write_text('original')
    (root/'frozen-inputs.json').write_text(json.dumps({str(dep):hashlib.sha256(dep.read_bytes()).hexdigest()}));C.ROOT=root
    C.check_pins();dep.write_text('changed')
    with self.assertRaisesRegex(ValueError,'Changed frozen rendering dependency'):C.check_pins()
  finally:C.ROOT=saved
if __name__=='__main__':unittest.main()
