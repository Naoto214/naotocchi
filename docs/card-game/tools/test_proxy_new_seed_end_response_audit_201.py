import copy
import unittest

import proxy_new_seed_end_response_audit_201 as subject


class EndResponse201Test(unittest.TestCase):
    def test_two_pass_only_end_responses(self):
        report=subject.build_report()
        end=[x for x in report['results'] if x['next_opportunity']=='turn_end_response']
        self.assertEqual(2,len(end))
        self.assertTrue(all(x['candidate_ids']==['response-pass'] and x['candidate_set_complete'] for x in end))
        for row in report['results']:self.assertEqual([],subject.validate_result(row))

    def test_changed_exclusion_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['board_exclusions']=[]
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
