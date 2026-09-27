import unittest

import proxy_new_seed_mixed_choice_310 as subject


class MixedChoice310Tests(unittest.TestCase):
    def test_two_mandatory_and_two_unique_choices(self):
        report = subject.build_report()
        chosen = {x['path_id']: x['selected_candidate'] for x in report['results']}
        self.assertEqual({'probe-01-a-first': 'resolve_board_ability',
                          'probe-01-b-first': 'response-pass',
                          'probe-02-a-first': 'response-pass',
                          'probe-02-b-first': 'turn_end'}, chosen)
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
