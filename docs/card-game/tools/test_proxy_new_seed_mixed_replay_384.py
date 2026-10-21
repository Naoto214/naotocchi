import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_384.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-384-20260929.json'
class Replay384Tests(unittest.TestCase):
 def test_three_unique_routes_and_preserved_multi_choice(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();report=json.loads(raw);rows={r['path_id']:r for r in report['results']}
  self.assertEqual(5,report['new_events']);self.assertEqual(5,report['new_snapshots'])
  self.assertEqual([],rows['probe-01-a-first']['new_events'])
  self.assertEqual(['response_pass'],[e['action_type'] for e in rows['probe-02-a-first']['new_events']])
  for path in ('probe-01-b-first','probe-02-b-first'):
   self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in rows[path]['new_events']])
  self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
