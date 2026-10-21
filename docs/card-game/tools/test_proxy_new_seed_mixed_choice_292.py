import unittest
import proxy_new_seed_mixed_choice_292 as subject


class MixedChoice292Tests(unittest.TestCase):
    def test_two_unique_responses_and_two_proved_ends(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['selected_candidate'] == 'response-pass' for x in rows))
        self.assertEqual(2, sum(x['selected_candidate'] == 'turn_end' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
