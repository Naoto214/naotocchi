import unittest

import proxy_new_seed_mixed_audit_279 as subject


class MixedAudit279Tests(unittest.TestCase):
    def test_four_reached_opportunities_have_complete_candidates(self):
        rows = {row['path_id']: row for row in subject.build_report()['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('normal_action', rows['probe-01-a-first']['next_opportunity'])
        self.assertEqual('mandatory_egg_exchange', rows['probe-01-b-first']['next_opportunity'])
        self.assertEqual(['response-pass'], rows['probe-02-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-02-b-first']['candidate_ids'])
        self.assertTrue(all(row['candidate_set_complete'] for row in rows.values()))
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
