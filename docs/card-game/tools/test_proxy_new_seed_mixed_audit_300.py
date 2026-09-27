import unittest
import proxy_new_seed_mixed_audit_300 as subject


class MixedAudit300Tests(unittest.TestCase):
    def test_four_response_inventories_and_board_ability_id(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertIn('response-activate-ability-A-015#1', rows['probe-01-a-first']['candidate_ids'])
        self.assertTrue(all(x['candidate_set_complete'] for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
