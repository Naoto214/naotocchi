import unittest
import proxy_new_seed_turn_end_proof_251 as subject


class TurnEndProof251Test(unittest.TestCase):
    def test_three_current_turn_ends_and_one_held_normal_action(self):
        rows = subject.build_report()['results']
        self.assertEqual(3, sum(row['turn_end_set_complete'] for row in rows))
        self.assertEqual(1, sum(not row['turn_end_set_complete'] for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
