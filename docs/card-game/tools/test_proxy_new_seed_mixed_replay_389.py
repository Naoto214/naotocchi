import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_389.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-389-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-389-20260929.json'
class Replay389Tests(unittest.TestCase):
 def test_start_chicken_and_three_other_responses(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());proof={x['path_id']:x for x in a['results']}
  self.assertEqual(['response-activate-ability-A-015#1','response-pass'],proof['probe-01-a-first']['candidate_ids'])
  for p in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):self.assertEqual(['response-pass'],proof[p]['candidate_ids'])
  self.assertEqual(4,r['new_events']);self.assertEqual(4,r['new_snapshots'])
  self.assertEqual((json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),AUDIT.read_bytes())
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),OUTPUT.read_bytes())
if __name__=='__main__':unittest.main()
