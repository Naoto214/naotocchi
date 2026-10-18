import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_audit_380.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-380-20260929.json'

class Audit380Tests(unittest.TestCase):
    def test_four_opportunities_and_source_hashes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {r['path_id']: r for r in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('normal_action', rows['probe-01-a-first']['next_opportunity'])
        self.assertEqual(['candidate-place-companion-B-015#1', 'candidate-place_world-B-020#1',
                          'candidate-place_world-B-022#1', 'candidate-play-main-B-001#1-birth', 'pass'],
                         rows['probe-01-a-first']['candidate_ids'])
        self.assertNotIn('candidate-place-partner-B-016#1', rows['probe-01-a-first']['candidate_ids'])
        self.assertTrue(all(rows[path]['candidate_ids'] == ['response-pass'] for path in
                            ('probe-01-b-first','probe-02-a-first','probe-02-b-first')))
        self.assertTrue(all(r['candidate_set_complete'] for r in rows.values()))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2)+'\n').encode(), raw)

if __name__ == '__main__': unittest.main()
