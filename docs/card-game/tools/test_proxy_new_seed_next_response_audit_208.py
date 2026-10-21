import copy
import unittest

import proxy_new_seed_next_response_audit_208 as subject


class NextResponse208Test(unittest.TestCase):
    def test_three_pass_only_next_priorities_and_ability_boundary(self):
        report=subject.build_report()
        self.assertEqual(4,len(report['results']))
        for row in report['results']:self.assertEqual([],subject.validate_result(row))
        self.assertEqual(1,sum(x['next_opportunity']=='selected_board_ability_activation'
                               for x in report['results']))
        self.assertTrue(all(x['candidate_ids']==['response-pass'] for x in report['results']
                            if x['next_opportunity']=='response_window'))

    def test_modified_candidate_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][2]);row['candidate_ids']=[]
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
