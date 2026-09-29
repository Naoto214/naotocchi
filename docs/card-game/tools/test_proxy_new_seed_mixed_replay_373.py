import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_373.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-373-20260929.json'
class Replay373Tests(unittest.TestCase):
 def test_proved_end_chain_and_two_end_responses(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  self.assertEqual((3,5,5),(r['new_decisions'],r['new_events'],r['new_snapshots']))
  self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],
                   [x['action_type'] for x in rows['probe-01-a-first']['new_events']])
  c=rows['probe-01-b-first']['final_continuation_state']
  self.assertEqual(('resolving','turn_start',2),
                   (c['response_context']['chain_status'],c['response_context']['window_kind'],c['response_context']['consecutive_passes']))
  self.assertEqual('E-first-date',c['activation_zone'][0]['card_id'])
  for path in ('probe-02-a-first','probe-02-b-first'):
   self.assertEqual('turn_end',rows[path]['final_continuation_state']['game_state']['phase'])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
