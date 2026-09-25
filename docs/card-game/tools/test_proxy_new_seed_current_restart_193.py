import copy
import unittest

import proxy_new_seed_current_restart_193 as subject


class CurrentRestart193Test(unittest.TestCase):
    def test_four_proven_current_choices_applied(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual(0,row['balance_sample_count'])
        self.assertEqual(1,sum(x['new_events'][0]['action_type']=='place_partner'
                               for x in report['results']))

    def test_tampered_snapshot_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_snapshots'][0]['game_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
