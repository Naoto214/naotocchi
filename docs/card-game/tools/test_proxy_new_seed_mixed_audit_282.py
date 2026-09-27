import unittest
import proxy_new_seed_mixed_audit_282 as subject


class MixedAudit282Tests(unittest.TestCase):
    def test_four_current_opportunities(self):
        rows = {x['path_id']: x for x in subject.build_report()['results']}
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertIn('response-activate-ability-A-015#1', rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual('resolve_item', rows['probe-02-a-first']['next_opportunity'])
        self.assertEqual(['response-pass'], rows['probe-02-b-first']['candidate_ids'])
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())
