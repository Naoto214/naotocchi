import unittest
import proxy_new_seed_mixed_replay_234 as subject
class MixedReplay234Test(unittest.TestCase):
    def test_three_turns_and_one_board_resolution(self):
        rows=subject.build_report()['results']
        self.assertEqual(7,sum(len(x['new_events']) for x in rows))
        self.assertEqual(3,sum(x['stop_reason_code']=='unproved_current_egg_exchange_choice' for x in rows))
        self.assertTrue(all(not subject.validate_result(x) for x in rows))
if __name__=='__main__':unittest.main()
