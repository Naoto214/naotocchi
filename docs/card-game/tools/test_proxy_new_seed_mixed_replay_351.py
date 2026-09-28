import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_351.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-351-20260929.json'
class MixedReplay351Tests(unittest.TestCase):
    def test_four_choices_replay_to_chain_resolution_normal_and_end_responses(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        self.assertEqual((4,4,4),(report['new_decisions'],report['new_events'],report['new_snapshots']))
        rows={x['path_id']:x for x in report['results']}
        self.assertEqual('resolving',rows['probe-01-a-first']['final_continuation_state']['response_context']['chain_status'])
        self.assertEqual('normal_action',rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('turn_end_response',rows[p]['final_continuation_state']['game_state']['phase'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
