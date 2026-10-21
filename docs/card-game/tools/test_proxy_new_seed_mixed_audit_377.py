import json
import hashlib
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_377.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-377-20260929.json'

class Audit377Tests(unittest.TestCase):
    def test_four_reached_opportunities(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('28d83e00893ff02e4785b4a07a1527e18480911e9a6c2faa41ea0538586dbfd2', report['source_raw_sha256'])
        self.assertEqual(report['source_raw_sha256'], hashlib.sha256((ROOT / 'data/proxy-new-seed-mixed-replay-376-20260929.json').read_bytes()).hexdigest())
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual('normal_action', rows['probe-01-b-first']['next_opportunity'])
        self.assertEqual(['candidate-place-companion-A-012#1', 'candidate-place_world-A-021#1',
                          'candidate-set_item-A-034#1', 'pass'], rows['probe-01-b-first']['candidate_ids'])
        self.assertIn({'card_id': 'C-chicken', 'reason_code': 'turn_start_opportunity_elapsed',
                       'source_instance_id': 'A-015#1'}, rows['probe-01-b-first']['board_exclusions'])
        for path in ('probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual('mandatory_egg_exchange', rows[path]['next_opportunity'])
        self.assertTrue(all(row['candidate_set_complete'] for row in rows.values()))
        self.assertTrue(all(row['new_events'] == 0 for row in rows.values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)

if __name__ == '__main__': unittest.main()
