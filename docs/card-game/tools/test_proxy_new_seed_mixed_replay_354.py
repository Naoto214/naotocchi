import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_354.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-354-20260929.json'
class MixedReplay354Tests(unittest.TestCase):
    def test_date_growth_draw_and_three_passes_are_replayed(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
        self.assertEqual((4,4,4),(r['new_decisions'],r['new_events'],r['new_snapshots']))
        first=rows['probe-01-a-first'];self.assertEqual('resolve_event',first['new_events'][0]['action_type'])
        self.assertEqual(5,first['new_events'][0]['result']['growth_added'])
        self.assertEqual(1,len(first['new_events'][0]['result']['drawn_instance_ids']))
        self.assertEqual(0,first['final_continuation_state']['game_state']['players']['A']['board']['partner_stage'])
        self.assertEqual('turn_end_response',rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('turn_end',rows[p]['final_continuation_state']['game_state']['phase'])
        self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
