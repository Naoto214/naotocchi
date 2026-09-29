import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_380.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-380-20260929.json'

class Replay380Tests(unittest.TestCase):
    def test_safe_free_chicken_and_three_passes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {r['path_id']:r for r in report['results']}
        self.assertEqual('place_companion', rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual('candidate-place-companion-B-015#1',
                         rows['probe-01-a-first']['new_decisions'][0]['selected_candidate'])
        self.assertTrue(all(rows[p]['new_events'][0]['action_type'] == 'response_pass' for p in
                            ('probe-01-b-first','probe-02-a-first','probe-02-b-first')))
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)

if __name__ == '__main__': unittest.main()
