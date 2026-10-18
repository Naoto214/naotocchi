import unittest
import proxy_new_seed_mixed_choice_298 as subject


class MixedChoice298Tests(unittest.TestCase):
    def test_two_seeded_eggs_and_two_unique_passes(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['resolution_mode'] == 'seeded_fallback' for x in rows))
        self.assertEqual(2, sum(x['selected_candidate'] == 'response-pass' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
