import copy
import unittest

import proxy_new_seed_choice_audit_211 as subject


class ChoiceAudit211Test(unittest.TestCase):
    def test_saved_states_prove_all_four_choices(self):
        report = subject.build_report()
        selected = {r['path_id']: r['selected_candidate'] for r in report['results']}
        self.assertEqual({
            'probe-01-a-first': 'response-pass',
            'probe-01-b-first': 'pass',
            'probe-02-a-first': 'candidate-place-partner-B-018#1',
            'probe-02-b-first': 'pass',
        }, selected)
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_choice_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['selected_candidate'] = 'pass'
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__':
    unittest.main()
