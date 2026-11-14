import pathlib,sys,unittest,os,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));import render_v6 as V
if os.environ.get('TEST_LEGACY')=='1':Library=V.L.Library
else:
 sys.path.insert(0,str(ROOT/'tools'));from native import Library
class NativeTests(unittest.TestCase):
 def test_flute_uses_nearby_register(self):
  lib=Library();lib.load('flute');root,_,_,_=lib.pick('flute',71,2);self.assertLessEqual(abs(root-71),2)
 def test_cached_piano_long_note_keeps_tail(self):
  lib=Library();lib.note('piano',78,.74,.65,3);x=lib.note('piano',78,3.1979,.65,3)
  self.assertEqual(len(x),round(3.7979*V.L.SR))
 def test_short_note_not_suppressed(self):
  lib=Library();x=lib.note('flute',77,.17,.65,1);self.assertGreater(float(np.sqrt(np.mean(x[:round(.1*V.L.SR)]**2))),.0001)
class GuardTests(unittest.TestCase):
 def test_home_refused(self):
  from render import permitted
  with self.assertRaises(ValueError):permitted(['poyo-1','home-night'])
 def test_polyphonic_boundary_does_not_retime_notes(self):
  from native import Library
  ev=[dict(instrument='violas',midi=m,role='pad',t=t,dur=1.9) for t in (0,2) for m in (60,64,67)]
  lib=Library({'id':'event-2','events':ev})
  values=[lib.articulation(e,'violas',e['dur']) for e in ev[:3]]
  self.assertEqual(values[0],values[1]);self.assertLessEqual(values[0][1],.1250001)
 def test_bass_rest_not_filled(self):
  from native import Library
  e=dict(instrument='cellos',midi=48,role='bass',t=0,dur=1)
  lib=Library({'id':'bgm-farewell','events':[e,{**e,'t':3.2}]})
  self.assertLess(lib.articulation(e,'cellos',1)[1],.5)
if __name__=='__main__':unittest.main()
