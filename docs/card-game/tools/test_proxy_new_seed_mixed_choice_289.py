import unittest
import proxy_new_seed_mixed_choice_289 as subject


class MixedChoice289Tests(unittest.TestCase):
    def test_two_paid_pass_comparisons_and_two_unique_responses(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['selected_candidate'] == 'pass' for x in rows))
        self.assertEqual(2, sum(x['selected_candidate'] == 'response-pass' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
