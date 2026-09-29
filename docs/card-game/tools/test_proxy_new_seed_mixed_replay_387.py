import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_387.py');OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-387-20260929.json'
class Replay387Tests(unittest.TestCase):
 def test_two_ends_two_responses(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  self.assertEqual(6,r['new_events']);self.assertEqual(6,r['new_snapshots'])
  for path in ('probe-01-a-first','probe-02-a-first'):self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in rows[path]['new_events']])
  for path in ('probe-01-b-first','probe-02-b-first'):self.assertEqual(['response_pass'],[e['action_type'] for e in rows[path]['new_events']])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
