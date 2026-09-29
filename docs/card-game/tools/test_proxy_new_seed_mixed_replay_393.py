import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_393.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-393-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-393-20260929.json'
class Replay393Tests(unittest.TestCase):
 def test_response_pipeline_and_hashes(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());proof={x['path_id']:x for x in a['results']};rows={x['path_id']:x for x in r['results']}
  self.assertEqual(['response-activate-ability-A-015#1','response-pass'],proof['probe-01-b-first']['candidate_ids'])
  self.assertEqual(['response-pass'],proof['probe-02-a-first']['candidate_ids'])
  self.assertEqual('response-activate-ability-A-015#1',rows['probe-01-b-first']['new_events'][0]['selected_candidate'])
  self.assertEqual('response_pass',rows['probe-02-a-first']['new_events'][0]['action_type'])
  self.assertEqual((2,2),(r['new_events'],r['new_snapshots']))
  for path,value in ((AUDIT,a),(OUTPUT,r)):self.assertEqual((json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
if __name__=='__main__':unittest.main()
