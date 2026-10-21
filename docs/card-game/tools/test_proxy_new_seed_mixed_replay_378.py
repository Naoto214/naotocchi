import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_378.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-378-20260929.json'

class Replay378Tests(unittest.TestCase):
    def test_four_transitions_and_hashes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('response_pass', rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual('place_companion', rows['probe-01-b-first']['new_events'][0]['action_type'])
        for path in ('probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual('egg_exchange_bottom', rows[path]['new_events'][0]['action_type'])
        self.assertTrue(all(len(row['new_events']) == len(row['new_snapshots']) == 1 for row in rows.values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)

if __name__ == '__main__': unittest.main()
