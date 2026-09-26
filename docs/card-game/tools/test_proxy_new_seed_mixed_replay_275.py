import unittest

import proxy_new_seed_mixed_replay_275 as subject


class MixedReplay275Tests(unittest.TestCase):
    def test_passes_coin_activation_and_main_reveal(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('response_pass', rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual('turn_end', rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual('activate_response', rows['probe-02-a-first']['new_events'][0]['action_type'])
        coin = rows['probe-02-b-first']
        self.assertEqual('resolve_item', coin['new_events'][0]['action_type'])
        self.assertEqual('main', coin['new_events'][0]['result']['revealed_card_type'])
        self.assertEqual(5, coin['new_events'][0]['result']['growth_added'])
        self.assertEqual(4, report['new_events'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
