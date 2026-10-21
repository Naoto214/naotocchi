import unittest

import proxy_new_seed_mixed_choice_271 as subject


class MixedChoice271Tests(unittest.TestCase):
    def test_seeded_eggs_paid_comparison_and_unique_pass(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual('seeded_fallback', rows[path]['resolution_mode'])
            self.assertIn(rows[path]['selected_candidate'], rows[path]['candidate_ids'])
        self.assertEqual('pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual(2, len(rows['probe-01-b-first']['comparison_evidence']['paid_actions']))
        self.assertEqual('response-pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
