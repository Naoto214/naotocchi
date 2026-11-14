import unittest,pathlib,json,sys,os,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
class V7(unittest.TestCase):
 def test_full_sample_cache_is_request_order_independent(self):
  self.assertTrue((ROOT/'tools/strings.py').exists(),'recorded string sampler required')
  from strings import Strings
  lib=Strings();short=lib.note('violin_solo',69,.4,.7);after=lib.note('violin_solo',69,2.8,.7);fresh=Strings().note('violin_solo',69,2.8,.7)
  np.testing.assert_array_equal(after,fresh);self.assertEqual(lib.synthetic_loops,0)
  self.assertGreater(np.sqrt(np.mean(after[44100:88200]**2)),.0001)
 def test_recordings_fail_closed_instead_of_looping(self):
  self.assertTrue((ROOT/'tools/strings.py').exists(),'recorded string sampler required')
  from strings import Strings
  with self.assertRaises(ValueError):Strings().note('violin_solo',69,60,.7)
 def test_scores_preserve_all_piano_and_nonhome(self):
  v6=json.loads((ROOT.parent/'bgm-v6-20261114/scores-v6.json').read_text())
  for variant in ('a','b'):
   p=ROOT/f'scores-{variant}.json';self.assertTrue(p.exists(),'A/B score required');sc=json.loads(p.read_text());self.assertEqual(len(sc),32)
   total=0
   for i,(s,t) in enumerate(zip(v6,sc)):
    for k in ('id','title','bpm','meter','bars','repeats','duration','period','loop','room'):self.assertEqual(s.get(k),t.get(k))
    mel=lambda x:[e for e in x['events'] if e['role']=='melody']
    self.assertEqual(mel(s),mel(t));total+=len(mel(t))
    if i>=4:self.assertEqual(s,t);continue
    piano=lambda x:[e for e in x['events'] if e['instrument']=='piano']
    self.assertEqual(piano(s),piano(t))
    self.assertTrue(all(e['instrument'] in ('piano','violin_solo','cello_chamber') for e in t['events']))
    if i==3:
     for e in t['events']:
      if e['instrument']!='piano':self.assertGreaterEqual(e['t'],s['period']/2)
   self.assertEqual(total,3158)
  self.assertEqual(len(json.loads((ROOT.parent/'bgm-master32-v1/placement.json').read_text())),50)
if __name__=='__main__':unittest.main()
