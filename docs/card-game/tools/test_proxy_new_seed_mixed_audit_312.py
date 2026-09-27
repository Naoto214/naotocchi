import unittest
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_312.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-312-20260927.json'


class MixedAudit312Tests(unittest.TestCase):
    def test_two_normal_one_end_one_egg(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        report = json.loads(OUTPUT.read_bytes())
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertTrue(rows['probe-01-b-first']['turn_end_set_complete'])
        self.assertEqual('mandatory_egg_exchange', rows['probe-02-b-first']['next_opportunity'])
        self.assertEqual(2, sum(x['next_opportunity'] == 'normal_action' for x in rows.values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), OUTPUT.read_bytes())
