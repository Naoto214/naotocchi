import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_318.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-318-20260927.json'


class MixedAudit318Tests(unittest.TestCase):
    def test_current_four_opportunities(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual(4, len(report['results']))
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertTrue(rows[path]['turn_end_set_complete'])
            self.assertTrue(all(rows[path]['completeness_checks'].values()))
        for path in ('probe-01-b-first', 'probe-02-b-first'):
            self.assertEqual(['response-pass'], rows[path]['candidate_ids'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual(0, report['independent_balance_sample_count'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
