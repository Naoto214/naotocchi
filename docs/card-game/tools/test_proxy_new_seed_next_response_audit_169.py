import copy
import unittest

import proxy_new_seed_next_response_audit_169 as subject


class NextResponseAudit169Test(unittest.TestCase):
    def test_three_pass_opportunities_and_one_held_item(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['next_opportunity']=='response_window':
                self.assertEqual(['response-pass'],row['candidate_ids'])
                self.assertTrue(row['candidate_set_complete'])
            else:
                self.assertEqual('selected_quick_item_activation',row['next_opportunity'])

    def test_modified_exclusion_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['board_exclusions'].clear()
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
