import copy
import unittest

import proxy_new_seed_current_choices_192 as subject


class CurrentChoices192Test(unittest.TestCase):
    def test_four_current_decisions_are_proved(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        self.assertEqual(1,sum(row['selected_candidate'].startswith('candidate-place-partner-')
                               for row in report['results']))
        self.assertEqual(3,sum(row['selected_candidate'] in ('pass','response-pass')
                               for row in report['results']))

    def test_modified_selection_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['selected_candidate']='invalid'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
