import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_321.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-321-20260927.json'


class MixedAudit321Tests(unittest.TestCase):
    def test_four_current_opportunities(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual('mandatory_egg_exchange', rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual(['response-pass'], rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual('normal_action', rows['probe-02-b-first']['next_opportunity'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
