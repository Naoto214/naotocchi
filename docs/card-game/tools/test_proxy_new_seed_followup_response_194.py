import copy
import unittest

import proxy_new_seed_followup_response_194 as subject


class FollowupResponse194Test(unittest.TestCase):
    def test_four_current_response_candidates_unique_pass(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual(['response-pass'],row['candidate_ids'])

    def test_modified_exclusion_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['board_exclusions'].append({'invalid':True})
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
