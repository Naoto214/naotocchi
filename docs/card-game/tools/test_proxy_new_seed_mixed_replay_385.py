import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_385.py')
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-385-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-385-20260929.json'
class Replay385Tests(unittest.TestCase):
 def test_canonical_pipeline_and_four_routes(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());raw=OUTPUT.read_bytes();v=json.loads(raw)
  d=next(x for x in a['results'] if x['path_id']=='probe-01-a-first')['decision_pipeline']
  self.assertEqual('pass',d['selected_candidate'])
  self.assertEqual('priority_unique',d['resolution_mode'])
  self.assertEqual([107,114,116],d['evaluated_contracts'])
  self.assertFalse(d['fallback_applied'])
  self.assertEqual(3,len(d['paid_comparisons']))
  self.assertEqual(4,v['new_events']);self.assertEqual(4,v['new_snapshots'])
  self.assertEqual((json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
  self.assertEqual((json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),AUDIT.read_bytes())
if __name__=='__main__':unittest.main()
