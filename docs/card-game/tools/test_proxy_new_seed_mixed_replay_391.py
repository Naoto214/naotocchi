import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_391.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-391-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-391-20260929.json'
class Replay391Tests(unittest.TestCase):
 def test_four_contract_decisions(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']}
  self.assertEqual(['response-pass'],p['probe-01-a-first']['candidate_ids'])
  self.assertEqual('candidate-place-companion-A-015#1',next(x for x in r['results'] if x['path_id']=='probe-02-a-first')['new_decisions'][0]['selected_candidate'])
  self.assertEqual('pass',next(x for x in r['results'] if x['path_id']=='probe-02-b-first')['new_decisions'][0]['selected_candidate'])
  self.assertEqual(4,r['new_events']);self.assertEqual(4,r['new_snapshots'])
  self.assertEqual(['response_pass','egg_exchange_bottom','normal_pass_end_request','place_companion'],[x['new_events'][0]['action_type'] for x in r['results']])
  self.assertEqual((json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),AUDIT.read_bytes())
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),OUTPUT.read_bytes())
if __name__=='__main__':unittest.main()
