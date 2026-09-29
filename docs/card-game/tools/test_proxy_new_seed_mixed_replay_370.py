import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_370.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-370-20260929.json'


class MixedReplay370Tests(unittest.TestCase):
    def test_four_selected_passes_replay_with_hashes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual((4, 4, 4), (report['new_decisions'], report['new_events'], report['new_snapshots']))
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('turn_end', rows['probe-01-a-first']['final_continuation_state']['game_state']['phase'])
        first = rows['probe-01-b-first']['final_continuation_state']
        self.assertEqual(('building', 'turn_start', 'B', 1),
                         (first['response_context']['chain_status'], first['response_context']['window_kind'],
                          first['response_context']['priority_actor'], first['response_context']['consecutive_passes']))
        self.assertEqual('E-first-date', first['activation_zone'][0]['card_id'])
        for path in ('probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual('normal_pass_end_request', rows[path]['new_events'][0]['action_type'])
            self.assertEqual('turn_end_response', rows[path]['final_continuation_state']['game_state']['phase'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)


if __name__ == '__main__':
    unittest.main()
