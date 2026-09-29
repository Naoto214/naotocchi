import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_396.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-396-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-396-20260929.json'
class Replay396Tests(unittest.TestCase):
 def test_four_paths(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']};v={x['path_id']:x for x in r['results']}
  self.assertTrue(p['probe-01-a-first']['turn_end_set_complete'])
  self.assertEqual(['response-pass'],p['probe-02-b-first']['candidate_ids'])
  self.assertEqual(['response-pass'],p['probe-02-a-first']['candidate_ids'])
  self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in v['probe-01-a-first']['new_events']])
  self.assertEqual('resolve_board_ability',v['probe-01-b-first']['new_events'][0]['action_type'])
  self.assertEqual((5,5),(r['new_events'],r['new_snapshots']))
  for path,data in ((AUDIT,a),(OUTPUT,r)):self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
if __name__=='__main__':unittest.main()
