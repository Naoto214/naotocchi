import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_398.py');AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-398-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-398-20260929.json'
class Replay398Tests(unittest.TestCase):
 def test_four_decisions(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  a=json.loads(AUDIT.read_bytes());r=json.loads(OUTPUT.read_bytes());p={x['path_id']:x for x in a['results']};v={x['path_id']:x for x in r['results']}
  self.assertEqual(['response-activate-ability-B-015#1','response-pass'],p['probe-01-a-first']['candidate_ids'])
  self.assertEqual('response-pass',v['probe-01-a-first']['new_decisions'][0]['selected_candidate'])
  self.assertEqual('candidate-place-companion-B-014#1',v['probe-02-b-first']['new_decisions'][0]['selected_candidate'])
  self.assertEqual(10,len(p['probe-02-a-first']['candidate_ids']))
  self.assertEqual((4,4),(r['new_events'],r['new_snapshots']))
  for path,data in ((AUDIT,a),(OUTPUT,r)):self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
if __name__=='__main__':unittest.main()
