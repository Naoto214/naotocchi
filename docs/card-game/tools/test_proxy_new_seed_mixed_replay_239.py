import unittest
import proxy_new_seed_mixed_replay_239 as subject
class MixedReplay239Test(unittest.TestCase):
    def test_three_start_passes_and_one_partner(self):
        rows=subject.build_report()['results']
        self.assertEqual(4,sum(len(x['new_events']) for x in rows))
        self.assertEqual(1,sum(x['new_events'][0]['action_type']=='place_partner' for x in rows))
        self.assertTrue(all(not subject.validate_result(x) for x in rows))
if __name__=='__main__':unittest.main()
