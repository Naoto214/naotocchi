import unittest

import proxy_new_seed_mixed_replay_269 as subject


class MixedReplay269Tests(unittest.TestCase):
    def test_two_turn_transitions_and_two_unique_passes(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual(2, len(rows[path]['new_events']))
            self.assertEqual('unproved_current_egg_exchange_choice', rows[path]['stop_reason_code'])
        self.assertEqual('A', rows['probe-01-b-first']['final_continuation_state']['response_context']['priority_actor'])
        self.assertEqual('normal_action', rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual(2, rows['probe-01-b-first']['final_continuation_state']['response_context']['consecutive_passes'])
        chain = rows['probe-02-b-first']['final_continuation_state']
        self.assertEqual('B', chain['response_context']['priority_actor'])
        self.assertEqual('building', chain['response_context']['chain_status'])
        self.assertEqual(1, chain['response_context']['consecutive_passes'])
        self.assertEqual('I-c_coin2', chain['activation_zone'][0]['card_id'])
        self.assertEqual(6, report['new_events'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
