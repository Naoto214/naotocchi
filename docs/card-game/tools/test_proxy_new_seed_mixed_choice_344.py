import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_344.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-344-20260928.json'


class MixedChoice344Tests(unittest.TestCase):
    def test_two_seeded_eggs_unique_response_and_free_companion(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('response-use-event-A-040#1-target-A-017#1', rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('candidate-place-companion-B-015#1', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual(3, len(rows['probe-01-b-first']['paid_comparisons']))
        for path in ('probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual('response-pass', rows[path]['selected_candidate'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
