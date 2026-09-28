import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_327.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-327-20260928.json'


class MixedAudit327Tests(unittest.TestCase):
    def test_three_responses_and_proved_end(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first', 'probe-02-a-first'):
            self.assertEqual(['response-pass'], rows[path]['candidate_ids'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertTrue(rows['probe-02-b-first']['turn_end_set_complete'])
        self.assertTrue(all(rows['probe-02-b-first']['completeness_checks'].values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
