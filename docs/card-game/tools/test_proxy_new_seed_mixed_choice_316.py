import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_316.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-316-20260927.json'


class MixedChoice316Tests(unittest.TestCase):
    def test_three_unique_passes_and_seeded_egg(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        report = json.loads(OUTPUT.read_bytes())
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('seeded_fallback', rows['probe-01-b-first']['resolution_mode'])
        self.assertTrue(all(x['selected_candidate'] == 'response-pass' for path, x in rows.items() if path != 'probe-01-b-first'))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), OUTPUT.read_bytes())
