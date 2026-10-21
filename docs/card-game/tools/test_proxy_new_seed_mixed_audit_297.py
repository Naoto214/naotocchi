import unittest
import proxy_new_seed_mixed_audit_297 as subject


class MixedAudit297Tests(unittest.TestCase):
    def test_two_egg_inventories_and_two_start_response_inventories(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['next_opportunity'] == 'mandatory_egg_exchange' for x in rows))
        self.assertEqual(2, sum(x['next_opportunity'] == 'response_window' for x in rows))
        self.assertTrue(all(x['candidate_set_complete'] for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
