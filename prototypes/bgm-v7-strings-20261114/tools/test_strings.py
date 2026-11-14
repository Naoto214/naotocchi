import unittest,pathlib,json,sys
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114'
class StringsQuality(unittest.TestCase):
 def test_native_join_and_release(self):
  from sampler import NativeStrings
  from performance import build
  s=json.loads((V7/'scores-b.json').read_text())[0];rows=[e for e in build(s) if e['instrument']=='violin_solo']
  lib=NativeStrings('b1');e=rows[0];x=lib.note(e,.65);y=lib.note(rows[1],.65)
  # Incoming tone should already be established during the overlap, unlike the old 0.5s bow delay.
  rms=lambda z:np.sqrt(np.mean(z*z))
  self.assertGreater(rms(y[round(.08*44100):round(.16*44100)]),rms(y[44100:round(1.3*44100)])*.25)
  self.assertLess(np.max(np.abs(x[-1])),1e-7)
  with self.assertRaises(ValueError):lib.note({**e,'sustain':60},.65)
 def test_score_and_explicit_phrase_rest_preservation(self):
  from performance import build
  scores=json.loads((V7/'scores-b.json').read_text());count=0
  for s in scores[:4]:
   rows=build(s);count+=len(rows)
   for e in rows:
    original=s['events'][e['eventIndex']]
    self.assertEqual((e['t'],e['midi'],e['writtenDuration']),(original['t'],original['midi'],original['dur']))
    if not e['connectedOut']:self.assertEqual(e['sustain'],original['dur'])
   if s['id']=='home-night':self.assertTrue(all(e['t']>=s['period']/2 for e in rows))
  self.assertEqual(count,104)
  self.assertEqual(sum(e['role']=='melody' for s in scores for e in s['events']),3158)
 def test_continuous_tied_source_is_order_independent(self):
  from sampler import NativeStrings
  from performance import build
  s=json.loads((V7/'scores-b.json').read_text())[2];rows=[e for e in build(s) if e['instrument']=='cello_chamber'];a,b=rows[:2]
  self.assertTrue(b['samePitchIn']);lib=NativeStrings('b2');lib.note(a,.65);after=lib.note(b,.65);fresh=NativeStrings('b2').note(b,.65)
  np.testing.assert_array_equal(after,fresh)
if __name__=='__main__':unittest.main()
