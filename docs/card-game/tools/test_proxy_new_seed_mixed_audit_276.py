import unittest

import proxy_new_seed_mixed_audit_276 as subject


class MixedAudit276Tests(unittest.TestCase):
    def test_end_response_normal_and_chain(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertTrue(rows['probe-01-b-first']['turn_end_set_complete'])
        self.assertTrue(all(rows['probe-01-b-first']['completeness_checks'].values()))
        self.assertTrue(rows['probe-02-b-first']['candidate_set_complete'])
        self.assertEqual('normal_action', rows['probe-02-b-first']['next_opportunity'])
        self.assertEqual(['response-pass'], rows['probe-02-a-first']['candidate_ids'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
