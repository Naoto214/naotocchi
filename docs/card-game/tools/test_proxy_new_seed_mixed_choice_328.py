import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_328.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-328-20260928.json'


class MixedChoice328Tests(unittest.TestCase):
    def test_one_proved_end_and_three_unique_passes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-02-b-first',):
            self.assertEqual('turn_end', rows[path]['selected_candidate'])
            self.assertTrue(all(rows[path]['six_stage_checks'].values()))
        for path in ('probe-01-a-first', 'probe-01-b-first', 'probe-02-a-first'):
            self.assertEqual('response-pass', rows[path]['selected_candidate'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
