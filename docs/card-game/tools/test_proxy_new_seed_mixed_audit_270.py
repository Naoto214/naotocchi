import unittest

import proxy_new_seed_mixed_audit_270 as subject


class MixedAudit270Tests(unittest.TestCase):
    def test_egg_normal_and_chain_opportunities(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual('mandatory_egg_exchange', rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual(['candidate-place_world-B-022#1',
                          'candidate-play-main-B-001#1-birth', 'pass'],
                         rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-02-b-first']['candidate_ids'])
        self.assertIn('G-beach-volley', [x['card_id'] for x in rows['probe-02-b-first']['hand_exclusions']])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
