import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_388.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-388-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-388-20260929.json'
class Replay388Tests(unittest.TestCase):
 def test_four_canonical_decisions(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']};proof={x['path_id']:x for x in a['results']}
  self.assertEqual('pass',proof['probe-01-b-first']['selected_candidate'])
  self.assertEqual([107,114,116],proof['probe-01-b-first']['evaluated_contracts'])
  self.assertEqual('candidate-place-companion-A-015#1',proof['probe-02-b-first']['selected_candidate'])
  self.assertEqual('safe_free_development',proof['probe-02-b-first']['resolution_mode'])
  self.assertEqual(4,r['new_events']);self.assertEqual(4,r['new_snapshots'])
  self.assertEqual(['egg_exchange_bottom','normal_pass_end_request','place_companion','egg_exchange_bottom'],[x['new_events'][0]['action_type'] for x in r['results']])
  self.assertEqual((json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),AUDIT.read_bytes())
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
