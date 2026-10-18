import unittest

import proxy_new_seed_mixed_choice_304 as subject


class MixedChoice304Tests(unittest.TestCase):
    def test_response_pass_and_normal_choice(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('response-pass', rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('response-pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('candidate-place-companion-B-013#1', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
