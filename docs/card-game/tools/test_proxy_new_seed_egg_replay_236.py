import unittest
import proxy_new_seed_egg_replay_236 as subject
class EggReplay236Test(unittest.TestCase):
    def test_three_eggs_one_held_normal(self):
        rows=subject.build_report()['results']
        self.assertEqual(3,sum(len(x['new_events']) for x in rows))
        self.assertTrue(all(not subject.validate_result(x) for x in rows))
        self.assertEqual(1,sum(x['stop_reason_code']=='unproved_current_normal_action_candidates'
                               for x in rows))
if __name__=='__main__':unittest.main()
