import unittest
import proxy_new_seed_mixed_choice_301 as subject


class MixedChoice301Tests(unittest.TestCase):
    def test_full_response_choice_and_three_unique_passes(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(2, len(rows['probe-01-a-first']['candidate_ids']))
        self.assertEqual(3, sum(x['resolution_mode'] == 'response_unique' for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
