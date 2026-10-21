import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_395.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-395-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-395-20260929.json'
class Replay395Tests(unittest.TestCase):
 def test_four_reached_decisions(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']};v={x['path_id']:x for x in r['results']}
  self.assertEqual(['response-pass'],p['probe-01-a-first']['candidate_ids'])
  self.assertEqual(['response-pass'],p['probe-01-b-first']['candidate_ids'])
  self.assertEqual(11,len(p['probe-02-b-first']['candidate_ids']))
  self.assertEqual(['candidate-attach_item-A-032#1-target-A-016#1','candidate-place_world-A-020#1','candidate-play-main-A-009#1-birth','pass'],p['probe-02-a-first']['candidate_ids'])
  self.assertEqual(['response_pass','response_pass','egg_exchange_bottom','normal_pass_end_request'],[v[x]['new_events'][0]['action_type'] for x in ('probe-01-a-first','probe-01-b-first','probe-02-b-first','probe-02-a-first')])
  self.assertEqual((4,4),(r['new_events'],r['new_snapshots']))
  for path,data in ((AUDIT,a),(OUTPUT,r)):self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
if __name__=='__main__':unittest.main()
