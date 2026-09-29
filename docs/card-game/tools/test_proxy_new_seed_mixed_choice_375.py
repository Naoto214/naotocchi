import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_375.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-375-20260929.json'
class Choice375Tests(unittest.TestCase):
 def test_egg_resolution_and_two_ends(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();d=json.loads(raw);r={x['path_id']:x for x in d['results']}
  self.assertEqual(4,len(r));self.assertEqual('seeded_fallback',r['probe-01-a-first']['resolution_mode'])
  self.assertIn(r['probe-01-a-first']['selected_candidate'],r['probe-01-a-first']['candidate_ids'])
  self.assertEqual('resolve_event',r['probe-01-b-first']['selected_candidate'])
  for p in ('probe-02-a-first','probe-02-b-first'):
   self.assertEqual('turn_end',r[p]['selected_candidate'])
  self.assertEqual((json.dumps(d,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
