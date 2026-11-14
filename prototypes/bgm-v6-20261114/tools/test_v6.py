import unittest,json,pathlib,sys,copy
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Preservation(unittest.TestCase):
 def test_arrangement_contract(self):
  self.assertTrue((ROOT/'scores-v6.json').exists(),'V6 score must be built')
  old=json.loads((ROOT.parent/'bgm-v5-20261115/scores-v5.json').read_text());new=json.loads((ROOT/'scores-v6.json').read_text())
  self.assertEqual([s['id'] for s in old],[s['id'] for s in new]);total=0
  for a,b in zip(old,new):
   for k in ('title','bpm','meter','bars','repeats','loop','period','duration','room'):
    self.assertEqual(a.get(k),b.get(k),(a['id'],k))
   melody=lambda s:[{k:v for k,v in e.items() if k not in ('vel','expressionDb')} for e in s['events'] if e['role']=='melody']
   self.assertEqual(melody(a),melody(b),a['id']);total+=len(melody(b))
   self.assertEqual(len(a['events']),len(b['events']))
   for e,f in zip(a['events'],b['events']):
    self.assertEqual({k:v for k,v in e.items() if k!='vel'},{k:v for k,v in f.items() if k not in ('vel','expressionDb')})
    self.assertGreater(f['vel'],0);self.assertLessEqual(abs(f['expressionDb']),12)
    if f['instrument']=='clarinet' and f['role']=='doubling':self.assertLessEqual(f['midi'],81)
   self.assertIn('v6',b)
   self.assertGreater(max(e['expressionDb'] for e in b['events'] if e['role']=='melody')-min(e['expressionDb'] for e in b['events'] if e['role']=='melody'),.3)
  self.assertEqual(total,3158)
  self.assertEqual(len(json.loads((ROOT.parent/'bgm-master32-v1/placement.json').read_text())),50)
 def test_profiles_are_explicit_and_loop_continuous(self):
  self.assertTrue((ROOT/'profiles.json').exists(),'32 explicit musical profiles required')
  p=json.loads((ROOT/'profiles.json').read_text());self.assertEqual(len(p),32)
  for sid,c in p.items():
   self.assertEqual(len(c['analysis']),9,sid)
   if c['loop']:self.assertEqual(c['arc'][0][1],c['arc'][-1][1],sid)
if __name__=='__main__':unittest.main()
