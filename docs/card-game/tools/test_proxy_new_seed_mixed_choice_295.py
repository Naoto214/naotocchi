import unittest
import proxy_new_seed_mixed_choice_295 as subject


class MixedChoice295Tests(unittest.TestCase):
    def test_two_proved_ends_and_two_seeded_eggs(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['selected_candidate'] == 'turn_end' for x in rows))
        self.assertEqual(2, sum(x['resolution_mode'] == 'seeded_fallback' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
