import unittest

import proxy_new_seed_mixed_replay_272 as subject


class MixedReplay272Tests(unittest.TestCase):
    def test_four_selected_steps_and_chain_resolution_boundary(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual('response_window', rows[path]['final_continuation_state']['game_state']['phase'])
            self.assertEqual('egg_exchange_bottom', rows[path]['new_events'][0]['action_type'])
        self.assertEqual('turn_end_response', rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        chain = rows['probe-02-b-first']['final_continuation_state']
        self.assertEqual('resolving', chain['response_context']['chain_status'])
        self.assertEqual('I-c_coin2', chain['activation_zone'][0]['card_id'])
        self.assertEqual(4, report['new_events'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
