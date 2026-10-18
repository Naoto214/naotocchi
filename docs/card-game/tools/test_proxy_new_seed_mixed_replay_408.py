import copy
import importlib
import json
import unittest
from unittest.mock import patch
from pathlib import Path

class Replay408Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script=Path(__file__).with_name('proxy_new_seed_mixed_replay_408.py')
        if not script.exists():raise AssertionError('408 continuation adapter is missing')
        cls.m=importlib.import_module(script.stem)
        cls.audit,cls.report=cls.m.build_reports()

    def test_four_terminal_routes_and_saved_completed_paths_unchanged(self):
        m=self.m
        self.assertEqual(4,self.report['completed'])
        self.assertEqual(0,self.report['independent_balance_sample_count'])
        for initial,final in zip(m.load_rows(),self.report['results']):
            m.contracts.validate_chain(initial,final)
            self.assertTrue(final['completed'])
            self.assertEqual('A',final['result']['winner'])
            self.assertEqual({'A':25,'B':20},final['result']['final_growth'])
            if initial['completed']:
                self.assertEqual([],final['new_events'])
                self.assertEqual(initial['final_continuation_state'],final['final_continuation_state'])
                self.assertEqual(initial['result'],final['result'])
            else:
                self.assertEqual(('egg_exchange_bottom','B'),(final['new_events'][0]['action_type'],final['new_events'][0]['actor']))
                self.assertEqual('r10_final_comparison',final['new_events'][-1]['action_type'])
            self.assertNotIn('turn_start_and_egg_draw',[e['action_type'] for e in final['new_events']])

    def test_canonical_saved_reports_and_source_default_unchanged(self):
        for path,data in ((self.m.AUDIT,self.audit),(self.m.OUTPUT,self.report)):
            self.assertEqual(path.read_bytes(),self.m.canonical_bytes(data))
        self.assertEqual(self.m.source.OUTPUT.read_bytes(),self.m.canonical_bytes(self.m.source.build_reports()[1]))

    def test_source_raw_pin_and_new_history_actor_binding(self):
        m=self.m
        final=next(x for x in self.report['results'] if x['new_events'])
        base,history,_=m.saved_history(final['path_id'])
        history+=list(zip(final['new_events'],final['new_snapshots']))
        m.source.verify_history(final,base,history)
        index=next(i for i,(e,s) in enumerate(history) if e['seq']>m.load_rows()[0]['last_valid_event_seq'] and e['action_type']=='response_pass')
        broken=copy.deepcopy(history)
        broken[index][0]['actor']='A' if history[index][0]['actor']=='B' else 'B'
        with self.assertRaises(ValueError):m.source.verify_history(final,base,broken)

    def test_complete_response_variants_reverse_resolution_and_target_ids(self):
        m=self.m;final=self.report['results'][0];proof=self.audit['results'][0]
        step=next(s for s in proof['steps'] if s['selection'] and s['selection']['selected_candidate']=='response-use-play-A-001#1-variant-companion')
        expected=['response-pass']+['response-use-play-A-001#1-variant-'+v for v in ['companion','event','item','main','partner','play','world']]
        self.assertEqual(expected,step['audit']['candidate_ids'])
        kinds=[e['action_type'] for e in final['new_events']]
        self.assertLess(kinds.index('resolve_play'),kinds.index('resolve_board_ability'))
        resolution=next(e for e in final['new_events'] if e['action_type']=='resolve_play')
        self.assertFalse(resolution['result']['declaration_matched'])
        self.assertEqual(0,resolution['result']['growth_added'])
        shot=next(s for s in final['new_snapshots'] if s['event_seq']==173)
        row={'path_id':final['path_id'],'last_valid_event_seq':173,'final_game_state_sha256':shot['game_state_sha256'],'final_continuation_state_sha256':shot['continuation_state_sha256'],'final_continuation_state':copy.deepcopy(shot['continuation_state'])}
        baseline,history,_=m.saved_history(row['path_id'])
        history+=list(zip(final['new_events'][:3],final['new_snapshots'][:3]))
        bad=copy.deepcopy(step['audit']);bad['candidate_ids'].pop()
        with self.assertRaises(ValueError):m.source.choose_response(row,bad,baseline,history)
        normal=next(s['audit'] for s in self.audit['results'][3]['steps'] if s['audit'].get('next_opportunity')=='normal_action')
        self.assertEqual(['candidate-attach_item-B-032#1-target-'+i for i in ['B-012#1','B-013#1','B-014#1','B-018#1']], [d['candidate_id'] for d in normal['actual_board_attachment_inventory']])
        for d in normal['actual_board_attachment_inventory']:self.assertIn(d['candidate_id'],normal['candidate_ids'])

    def test_source_raw_rewrite_is_rejected(self):
        with patch.object(self.m.source,'OUTPUT') as output:
            output.read_bytes.return_value=self.m.source.canonical_bytes({'results':[]})
            with self.assertRaises(ValueError):self.m.load_rows()

if __name__=='__main__':unittest.main()
