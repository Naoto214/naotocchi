import copy
import unittest

import proxy_hit_blow_response_142 as response


class HitBlowResponse142Tests(unittest.TestCase):
    def test_protected_source_and_declaration_link(self):
        source = response.load_source()
        self.assertEqual(len(source['results']), 4)
        result = response.build_report()
        self.assertEqual(result['planned'], 4)
        row = next(x for x in result['results'] if x['path_id'] == 'probe-02-a-first')
        self.assertEqual(row['new_events'][0]['action_type'], 'activate_response')
        link = row['new_snapshots'][0]['continuation_state']['activation_zone'][0]
        self.assertEqual(link['candidate_variant'], 'partner')
        self.assertEqual(link['payment'], {'time': 1})
        self.assertEqual(row['new_decisions'][0]['selected_candidate'], 'response-pass')
        self.assertEqual([x['action_type'] for x in row['new_events']],
                         ['activate_response', 'response_pass', 'response_pass', 'resolve_play'])
        self.assertEqual(response.validate_result(row), [])
        corrupt = copy.deepcopy(source['results'][2])
        corrupt['final_game_state_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            response.run_route(corrupt)

    def test_resolution_matches_and_misses_using_revealed_top_only(self):
        source = response.load_source()['results'][2]
        before, decision = response.opening_state_and_choice(source)
        activated, _ = response.activate(before, decision)
        link = activated['activation_zone'][0]
        for match in (True, False):
            state = copy.deepcopy(activated)
            actor = link['actor']; player = state['game_state']['players'][actor]
            deck = player['deck']; index = next(i for i, instance in enumerate(deck)
                              if (state['game_state']['cards'][instance]['card_id'].startswith('P-')) == match)
            deck[0], deck[index] = deck[index], deck[0]
            state['continuation_state_sha256'] = response.start._hash(state)
            top = deck[0]
            result = response.apply_hit_blow_effect(state, link)
            self.assertEqual(result['revealed_instance_id'], top)
            self.assertEqual(result['declaration_matched'], match)
            self.assertIn(result['drawn_instance_id'], player['hand'])
            self.assertEqual(result['growth_added'], 5 if match else 0)
        state = copy.deepcopy(activated)
        player = state['game_state']['players'][link['actor']]
        player['deck'] = [next(instance for instance in player['deck']
                          if not state['game_state']['cards'][instance]['card_id'].startswith('P-'))]
        sole = player['deck'][0]
        result = response.apply_hit_blow_effect(state, link)
        self.assertEqual(result['revealed_instance_id'], sole)
        self.assertEqual(result['drawn_instance_id'], sole)
        self.assertEqual(player['deck'], [])

    def test_all_saved_paths_and_canonical_bytes(self):
        report = response.build_report()
        self.assertEqual(report['completed'], 0)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        self.assertEqual(report['new_events'], 4)
        for row in report['results']:
            if row['path_id'] != 'probe-02-a-first':
                self.assertEqual(row['new_events'], [])
                self.assertEqual(response.validate_result(row), [])
        self.assertEqual(response.OUTPUT.read_bytes(), response.canonical_bytes(report))


if __name__ == '__main__':
    unittest.main()
