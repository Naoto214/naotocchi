import unittest
import proxy_new_seed_mixed_audit_303 as subject


class MixedAudit303Tests(unittest.TestCase):
    def test_two_responses_and_two_complete_normal_inventories(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(['response-pass'], rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual(2, sum(x['next_opportunity'] == 'normal_action' for x in rows.values()))
        self.assertTrue(all(x['candidate_set_complete'] for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
