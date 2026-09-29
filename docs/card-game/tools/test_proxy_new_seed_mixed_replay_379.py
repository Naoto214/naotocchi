import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = Path(__file__).with_name('proxy_new_seed_mixed_audit_379.py')
REPLAY = Path(__file__).with_name('proxy_new_seed_mixed_replay_379.py')

class Replay379Tests(unittest.TestCase):
    def test_four_response_passes(self):
        for script in (AUDIT, REPLAY):
            subprocess.run([sys.executable, str(script), '--check'], check=True)
        raw = (ROOT / 'data/proxy-new-seed-mixed-replay-379-20260929.json').read_bytes()
        report = json.loads(raw)
        self.assertEqual(4, len(report['results']))
        self.assertTrue(all([e['action_type'] for e in row['new_events']] == ['response_pass']
                            for row in report['results']))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)

if __name__ == '__main__': unittest.main()
