import unittest

import proxy_new_seed_mixed_choice_274 as subject


class MixedChoice274Tests(unittest.TestCase):
    def test_response_selection_and_coin_resolution_boundary(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            self.assertEqual('response-pass', rows[path]['selected_candidate'])
        self.assertEqual('response-use-item-A-033#1', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('response_seeded_fallback', rows['probe-02-a-first']['resolution_mode'])
        self.assertEqual('resolve_item', rows['probe-02-b-first']['selected_processing'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
