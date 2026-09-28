import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_345.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-345-20260928.json'


class MixedReplay345Tests(unittest.TestCase):
    def test_event_activation_free_companion_and_two_passes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual((4, 4), (report['new_events'], report['new_snapshots']))
        self.assertEqual(0, report['independent_balance_sample_count'])
        route = next(x for x in report['results'] if x['path_id'] == 'probe-02-b-first')
        self.assertEqual('post_placement_response', route['final_continuation_state']['game_state']['phase'])
        first = next(x for x in report['results'] if x['path_id'] == 'probe-01-a-first')
        self.assertEqual('activate_response', first['new_events'][0]['action_type'])
        self.assertEqual('building', first['final_continuation_state']['response_context']['chain_status'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
