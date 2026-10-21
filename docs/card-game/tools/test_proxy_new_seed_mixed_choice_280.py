import unittest
import proxy_new_seed_mixed_choice_280 as subject


class MixedChoice280Tests(unittest.TestCase):
    def test_four_selections_from_complete_candidate_sets(self):
        rows = {x['path_id']: x for x in subject.build_report()['results']}
        self.assertEqual('candidate-place-companion-B-013#1', rows['probe-01-a-first']['selected_candidate'])
        self.assertIn(rows['probe-01-b-first']['selected_candidate'], rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual('response-pass', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('response-pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(subject.canonical_bytes(subject.build_report()), subject.OUTPUT.read_bytes())
