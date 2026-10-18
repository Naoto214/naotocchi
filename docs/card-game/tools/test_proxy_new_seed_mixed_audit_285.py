import unittest
import proxy_new_seed_mixed_audit_285 as subject


class MixedAudit285Tests(unittest.TestCase):
    def test_two_unique_responses_and_two_normal_sets(self):
        rows = {x['path_id']: x for x in subject.build_report()['results']}
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual('normal_action', rows['probe-02-a-first']['next_opportunity'])
        self.assertEqual('normal_action', rows['probe-02-b-first']['next_opportunity'])
        self.assertTrue(all(x['candidate_set_complete'] for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())
