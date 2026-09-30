import importlib
import copy
import json
import unittest
from pathlib import Path


class Replay407Tests(unittest.TestCase):
    def saved(self):
        m=importlib.import_module('proxy_new_seed_mixed_replay_407')
        return m,json.loads(m.OUTPUT.read_bytes())

    def test_four_a_egg_choices_and_contiguous_restart(self):
        script = Path(__file__).with_name('proxy_new_seed_mixed_replay_407.py')
        self.assertTrue(script.exists(), '407 continuation adapter is missing')
        m = importlib.import_module(script.stem)
        audit, report = m.build_reports()
        self.assertEqual(4, len(report['results']))
        self.assertGreaterEqual(report['new_events'], 4)
        for initial, final in zip(m.load_rows(), report['results']):
            m.contracts.validate_chain(initial, final)
            self.assertEqual('egg_exchange_bottom', final['new_events'][0]['action_type'])
            self.assertEqual('A', final['new_events'][0]['actor'])
            self.assertEqual(0, final['balance_sample_count'])
        for p, value in ((m.AUDIT, audit), (m.OUTPUT, report)):
            self.assertEqual(p.read_bytes(), m.canonical_bytes(value))

    def test_completed_paths_compare_growth_and_do_not_create_future_turns(self):
        m,data=self.saved()
        self.assertEqual(45,data['new_events']);self.assertEqual(2,data['completed'])
        for row in data['results']:
            if row['path_id'].endswith('b-first'):
                self.assertTrue(row['completed'])
                self.assertEqual({'A':25,'B':20},row['result']['final_growth'])
                self.assertEqual('A',row['result']['winner'])
                self.assertEqual('r10_final_comparison',row['new_events'][-1]['action_type'])
                self.assertNotIn('turn_start_and_egg_draw',[e['action_type'] for e in row['new_events']])
            else:
                game=row['final_continuation_state']['game_state']
                self.assertEqual((10,'B','egg_exchange_choice'),(game['round'],game['turn_player'],game['phase']))

    def test_reverse_resolutions_and_actual_board_attachment_targets(self):
        m,data=self.saved();audit=json.loads(m.AUDIT.read_bytes())
        first=data['results'][0]
        kinds=[e['action_type'] for e in first['new_events']]
        self.assertLess(kinds.index('resolve_event'),kinds.index('resolve_board_ability'))
        second=data['results'][1]
        kinds=[e['action_type'] for e in second['new_events']]
        self.assertLess(kinds.index('resolve_play'),kinds.index('resolve_board_ability'))
        proof=next(s['audit'] for s in audit['results'][0]['steps'] if s['audit']['next_opportunity']=='normal_action')
        ids=proof['candidate_ids']
        self.assertIn('candidate-attach_item-A-031#1-target-A-015#1',ids)
        for detail in proof['actual_board_attachment_inventory']:
            self.assertIn(detail['candidate_id'],ids)
        for row in data['results']:
            if row['path_id'].startswith('probe-02'):
                placement=next(e for e in row['new_events'] if e['action_type']=='place_companion')
                self.assertEqual('candidate-place-companion-A-013#1',placement['selected_candidate'])

    def test_new_activation_headers_and_complete_candidate_proofs_are_bound(self):
        m,data=self.saved();final=data['results'][0];index=next(i for i,e in enumerate(final['new_events']) if e['action_type']=='response_pass')
        shot=final['new_snapshots'][index]
        row={'path_id':final['path_id'],'last_valid_event_seq':shot['event_seq'],'final_game_state_sha256':shot['game_state_sha256'],'final_continuation_state_sha256':shot['continuation_state_sha256'],'final_continuation_state':copy.deepcopy(shot['continuation_state'])}
        b,h,_=m.saved_history(row['path_id']);h+=list(zip(final['new_events'][:index+1],final['new_snapshots'][:index+1]))
        proof=m.audit_response(row,b,h)
        bad=copy.deepcopy(proof);bad['candidate_ids'].pop()
        with self.assertRaises(ValueError):m.choose_response(row,bad,b,h)
        for field,value in [('actor','B'),('payment',{'time':1}),('source_instance_id','B-039#1'),('chain_link_id','wrong'),('action_type','response_pass')]:
            broken=copy.deepcopy(h);event=next(e for e,s in broken if e['seq']==162);event[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):m.audit_response(row,b,broken)

    def test_historical_defaults_remain_canonical(self):
        m,data=self.saved()
        self.assertEqual(m.source.OUTPUT.read_bytes(),m.canonical_bytes(m.source.build_reports()[1]))


if __name__ == '__main__':
    unittest.main()
