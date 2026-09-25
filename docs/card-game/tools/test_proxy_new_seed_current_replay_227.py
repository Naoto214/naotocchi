import unittest
import proxy_new_seed_current_replay_227 as subject
class CurrentReplay227Test(unittest.TestCase):
    def test_four_events_and_hashes(self):
        rows=subject.build_report()['results']
        self.assertEqual(4,sum(len(r['new_events']) for r in rows))
        self.assertTrue(all(not subject.validate_result(r) for r in rows))
        self.assertEqual({'activate_response','response_pass'},
                         {r['new_events'][0]['action_type'] for r in rows})
if __name__=='__main__':unittest.main()
