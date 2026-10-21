import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_343.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-343-20260928.json'


class MixedAudit343Tests(unittest.TestCase):
    def test_four_current_opportunities(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual(['response-activate-ability-A-015#1', 'response-pass',
                          'response-use-event-A-040#1-target-A-017#1'],
                         rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(5, len(rows['probe-01-b-first']['candidate_ids']))
        self.assertEqual('normal_action', rows['probe-01-b-first']['next_opportunity'])
        for path in ('probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual(['response-pass'], rows[path]['candidate_ids'])
        self.assertTrue(all(row['candidate_set_complete'] for row in rows.values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
