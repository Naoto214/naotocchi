import pathlib,json,unittest
R=pathlib.Path(__file__).resolve().parents[1]; V1=R.parent/'bgm-master32-v1'
class Contract(unittest.TestCase):
 def test_32_melodies_and_timing(self):
  self.assertTrue((R/'scores.json').exists(),'V2 scores not created')
  a=json.loads((V1/'scores.json').read_text());h=json.loads((V1/'home-scores-original.json').read_text())
  for s,t in zip(h,['home-morning','home-day','home-evening','home-night']):s['id']=t
  a+=h;b=json.loads((R/'scores.json').read_text());self.assertEqual(len(b),32)
  for s in a:
   t=next(x for x in b if x['id']==s['id']);self.assertEqual(t['bpm'],s['bpm']);self.assertEqual(t['meter'],s['meter'])
   f=lambda x:[(e['midi'],round(e['t'],9),round(e['dur'],9)) for e in x['events'] if e['role']=='melody']
   self.assertEqual(f(s),f(t),s['id'])
 def test_midi_and_placement_untouched(self):
  self.assertTrue((R/'placement.json').exists(),'V2 placement missing')
  self.assertEqual((R/'placement.json').read_bytes(),(V1/'placement.json').read_bytes())
  for p in (V1/'midi').glob('*.mid'):self.assertEqual(p.read_bytes(),(R/'midi'/p.name).read_bytes())
if __name__=='__main__':unittest.main()
