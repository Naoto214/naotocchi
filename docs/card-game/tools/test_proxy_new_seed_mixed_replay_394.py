import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_394.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-394-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-394-20260929.json'
class Replay394Tests(unittest.TestCase):
 def test_four_routes(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']};v={x['path_id']:x for x in r['results']}
  self.assertEqual(['candidate-place_world-A-021#1','candidate-set_item-A-034#1','pass'],p['probe-01-a-first']['candidate_ids'])
  self.assertEqual(['response-pass'],p['probe-01-b-first']['candidate_ids'])
  self.assertEqual(['response-pass'],p['probe-02-a-first']['candidate_ids'])
  self.assertTrue(p['probe-02-b-first']['turn_end_set_complete'])
  self.assertEqual(['normal_pass_end_request'],[x['action_type'] for x in v['probe-01-a-first']['new_events']])
  for path,data in ((AUDIT,a),(OUTPUT,r)):self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
if __name__=='__main__':unittest.main()
