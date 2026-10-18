import unittest
import proxy_new_seed_mixed_audit_288 as subject


class MixedAudit288Tests(unittest.TestCase):
    def test_two_normal_and_two_turn_end_response_inventories(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(2, sum(x['next_opportunity'] == 'normal_action' for x in rows.values()))
        self.assertEqual(2, sum(x['next_opportunity'] == 'turn_end_response' for x in rows.values()))
        self.assertTrue(all(x['candidate_set_complete'] for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
