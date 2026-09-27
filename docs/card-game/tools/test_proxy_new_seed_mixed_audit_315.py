import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_315.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-315-20260927.json'


class MixedAudit315Tests(unittest.TestCase):
    def test_three_unique_responses_and_egg_inventory(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        report = json.loads(OUTPUT.read_bytes())
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(9, len(rows['probe-01-b-first']['candidate_ids']))
        self.assertTrue(all(x['candidate_ids'] == ['response-pass'] for path, x in rows.items() if path != 'probe-01-b-first'))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), OUTPUT.read_bytes())
