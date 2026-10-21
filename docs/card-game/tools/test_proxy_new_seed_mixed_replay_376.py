import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_376.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-376-20260929.json'
class Replay376Tests(unittest.TestCase):
 def test_egg_resolution_and_two_ends(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();d=json.loads(raw);r={x['path_id']:x for x in d['results']}
  self.assertEqual((6,6),(d['new_events'],d['new_snapshots']))
  self.assertEqual('egg_exchange_bottom',r['probe-01-a-first']['new_events'][0]['action_type'])
  self.assertEqual('resolve_event',r['probe-01-b-first']['new_events'][0]['action_type'])
  for p in ('probe-02-a-first','probe-02-b-first'):
   self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in r[p]['new_events']])
  self.assertEqual((json.dumps(d,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
