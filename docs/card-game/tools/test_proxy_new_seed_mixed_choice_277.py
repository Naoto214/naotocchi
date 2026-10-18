import unittest
import proxy_new_seed_mixed_choice_277 as subject

class MixedChoice277Tests(unittest.TestCase):
    def test_four_selections_and_canonical_bytes(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('turn_end', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('candidate-place-companion-A-012#1', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual('safe_free_development', rows['probe-02-b-first']['resolution_mode'])
        self.assertEqual(['response-pass', 'response-pass'], [rows[x]['selected_candidate'] for x in ('probe-01-a-first','probe-02-a-first')])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())

if __name__ == '__main__': unittest.main()
