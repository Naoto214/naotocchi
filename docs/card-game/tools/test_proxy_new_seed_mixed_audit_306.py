import unittest

import proxy_new_seed_mixed_audit_306 as subject


class MixedAudit306Tests(unittest.TestCase):
    def test_four_reached_opportunities(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('normal_action', rows['probe-01-b-first']['next_opportunity'])
        self.assertTrue(all(x['candidate_set_complete'] for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
