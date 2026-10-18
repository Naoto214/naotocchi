import copy
import unittest

import proxy_new_seed_start_opportunity_audit_187 as subject


class StartOpportunityAudit187Test(unittest.TestCase):
    def test_four_complete_current_opportunities(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
            self.assertIn('response-pass',row['candidate_ids'])
        self.assertEqual(1,sum(len(row['board_candidate_details']) for row in report['results']))

    def test_modified_candidate_set_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['candidate_ids'].append('unexpected')
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
