import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_392.py');OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-392-20260929.json'
class Replay392Tests(unittest.TestCase):
 def test_chain_resolution_and_end_response(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  data=json.loads(OUTPUT.read_bytes());rows={x['path_id']:x for x in data['results']}
  self.assertEqual(2,data['new_events']);self.assertEqual(2,data['new_snapshots'])
  self.assertEqual(['resolve_board_ability'],[e['action_type'] for e in rows['probe-01-a-first']['new_events']])
  self.assertEqual(['response_pass'],[e['action_type'] for e in rows['probe-02-b-first']['new_events']])
  for path in ('probe-01-b-first','probe-02-a-first'):
   self.assertEqual([],rows[path]['new_events'])
  self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),OUTPUT.read_bytes())
if __name__=='__main__':unittest.main()
