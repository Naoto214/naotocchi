import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_324.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-324-20260928.json'


class MixedAudit324Tests(unittest.TestCase):
    def test_three_response_windows_and_one_normal_action(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual(['response-pass'], rows[path]['candidate_ids'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual('normal_action', rows['probe-01-b-first']['next_opportunity'])
        self.assertEqual(3, len(rows['probe-01-b-first']['candidate_ids']))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
