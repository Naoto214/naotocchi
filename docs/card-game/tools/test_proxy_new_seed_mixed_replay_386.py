import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_386.py');OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-386-20260929.json'
class Replay386Tests(unittest.TestCase):
 def test_seeded_board_response_and_three_passes(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  self.assertEqual(4,r['new_events']);self.assertEqual(4,r['new_snapshots'])
  self.assertEqual('response_seeded_fallback',rows['probe-01-b-first']['new_decisions'][0]['resolution_mode'])
  self.assertEqual('response-pass',rows['probe-01-b-first']['new_decisions'][0]['selected_candidate'])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
