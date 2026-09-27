import unittest
import proxy_new_seed_mixed_choice_283 as subject


class MixedChoice283Tests(unittest.TestCase):
    def test_three_passes_and_mandatory_resolution(self):
        rows = {x['path_id']: x for x in subject.build_report()['results']}
        self.assertEqual('response_seeded_fallback', rows['probe-01-b-first']['resolution_mode'])
        self.assertEqual('response-pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('resolve_item', rows['probe-02-a-first']['selected_processing'])
        self.assertEqual('response-pass', rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('response-pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())
