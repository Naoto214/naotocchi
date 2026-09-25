import copy
import unittest
import proxy_new_seed_egg_replay_221 as subject

class EggReplay221Test(unittest.TestCase):
    def test_two_seeded_egg_exchanges_and_two_held_routes(self):
        report=subject.build_report()
        self.assertEqual(2,report['new_events'])
        self.assertEqual(2,report['new_decisions'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_seeded_choice_rejected(self):
        row=next(copy.deepcopy(r) for r in subject.build_report()['results'] if r['new_decisions'])
        row['new_decisions'][0]['selected_candidate']='invalid'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
