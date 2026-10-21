import unittest
import proxy_new_seed_normal_replay_230 as subject
class NormalReplay230Test(unittest.TestCase):
    def test_four_saved_replays(self):
        rows=subject.build_report()['results']
        self.assertEqual(4,sum(len(r['new_events']) for r in rows))
        self.assertTrue(all(not subject.validate_result(r) for r in rows))
        self.assertEqual(3,sum(r['final_continuation_state']['game_state']['phase']=='turn_end_response'
                               for r in rows))
if __name__=='__main__':unittest.main()
