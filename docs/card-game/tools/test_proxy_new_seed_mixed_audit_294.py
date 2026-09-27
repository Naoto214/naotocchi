import unittest
import proxy_new_seed_mixed_audit_294 as subject


class MixedAudit294Tests(unittest.TestCase):
    def test_two_proved_ends_and_two_complete_egg_inventories(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['next_opportunity'] == 'turn_end' and x['turn_end_set_complete'] for x in rows))
        self.assertEqual(2, sum(x['next_opportunity'] == 'mandatory_egg_exchange' and x['candidate_set_complete'] for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
