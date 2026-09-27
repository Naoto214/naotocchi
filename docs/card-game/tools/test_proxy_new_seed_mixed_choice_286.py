import unittest
import proxy_new_seed_mixed_choice_286 as subject


class MixedChoice286Tests(unittest.TestCase):
    def test_two_responses_and_two_paid_comparisons(self):
        rows = {x['path_id']: x for x in subject.build_report()['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual(2, sum(x['selected_candidate'] == 'response-pass' for x in rows.values()))
        self.assertEqual(2, len(rows['probe-02-a-first']['paid_comparisons']))
        self.assertEqual(4, len(rows['probe-02-b-first']['paid_comparisons']))
        self.assertEqual('pass', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())
