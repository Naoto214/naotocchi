import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_390.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-390-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-390-20260929.json'
class Replay390Tests(unittest.TestCase):
 def test_chain_end_and_responses(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']}
  self.assertEqual(['response-pass'],p['probe-01-a-first']['candidate_ids'])
  self.assertTrue(p['probe-01-b-first']['turn_end_set_complete'])
  self.assertEqual([],p['probe-01-b-first']['contract_stop_codes'])
  for path in ('probe-02-a-first','probe-02-b-first'):self.assertEqual(['response-pass'],p[path]['candidate_ids'])
  self.assertEqual(5,r['new_events']);self.assertEqual(5,r['new_snapshots'])
  self.assertEqual((json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),AUDIT.read_bytes())
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),OUTPUT.read_bytes())
if __name__=='__main__':unittest.main()
