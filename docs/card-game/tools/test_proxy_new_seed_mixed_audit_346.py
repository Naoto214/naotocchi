import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_346.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-346-20260928.json'

class MixedAudit346Tests(unittest.TestCase):
    def test_saved_four_response_opportunities_are_complete(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertTrue(all(row['candidate_set_complete'] for row in rows.values()))
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-02-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-02-b-first']['candidate_ids'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
