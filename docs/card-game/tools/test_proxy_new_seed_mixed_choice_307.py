import unittest

import proxy_new_seed_mixed_choice_307 as subject


class MixedChoice307Tests(unittest.TestCase):
    def test_three_unique_responses_and_one_normal_choice(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertTrue(all(x['selected_candidate'] == 'response-pass' for key, x in rows.items() if key != 'probe-01-b-first'))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
