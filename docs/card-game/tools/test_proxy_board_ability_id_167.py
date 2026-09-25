import copy
import unittest

import proxy_board_ability_id_167 as subject


class BoardAbilityID167Test(unittest.TestCase):
    def test_general_single_board_ability_response_namespace(self):
        self.assertEqual('response-activate-ability-X-010#1',
                         subject.board_ability_response_id('X-010#1',1))
        self.assertNotEqual('candidate-activate-ability-X-010#1',
                            subject.board_ability_response_id('X-010#1',1))
        for count in (0,2):
            with self.assertRaises(ValueError):
                subject.board_ability_response_id('X-010#1',count)

    def test_saved_start_opportunities_are_independently_verified(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(0,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        first=next(x for x in report['results'] if x['path_id']=='probe-01-a-first')
        self.assertEqual(['response-activate-ability-A-015#1','response-pass'],
                         first['candidate_ids'])
        altered=copy.deepcopy(first)
        altered['candidate_ids'].append('candidate-activate-ability-A-015#1')
        self.assertTrue(subject.validate_result(altered))


if __name__=='__main__':unittest.main()
