import unittest

import proxy_new_seed_normal_restart_147 as restart


class NewSeedNormalRestart147Tests(unittest.TestCase):
    def test_three_normal_choices_and_held_turn_end(self):
        report = restart.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_decisions'], 3)
        self.assertEqual(report['new_events'], 3)
        self.assertEqual(report['completed'], 0)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            row = rows[path]
            self.assertEqual(row['last_valid_event_seq'], 8)
            self.assertEqual(row['new_decisions'][0]['selected_candidate'], 'pass')
            self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'turn_end_response')
        row = rows['probe-02-a-first']
        self.assertEqual(row['last_valid_event_seq'], 7)
        self.assertEqual(row['new_decisions'][0]['resolution_mode'], 'seeded_fallback')
        self.assertEqual(row['new_decisions'][0]['selected_action']['action_type'], 'place_partner')
        self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'post_placement_response')
        self.assertEqual(rows['probe-02-b-first']['new_events'], [])

    def test_source_and_canonical_bytes(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
