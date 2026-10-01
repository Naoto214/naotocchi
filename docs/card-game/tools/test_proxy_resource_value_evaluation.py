"""Counts are hand-derived: stopped suffixes and resolutions aren't plays."""
import copy
import unittest
import proxy_resource_value_evaluation as e

def route(policy='old', completed=False):
    board=dict(main=None,companions=[],partner=None,partner_stage=None,world=None,prepared=[])
    game=dict(round=1,turn_player='A',phase='normal_action',cards={},players={p:dict(board=copy.deepcopy(board),growth=20,time=1,reservations=[]) for p in 'AB'})
    return dict(run_id=policy+':p',path_id='p',policy_id=policy,completed=completed,status='completed' if completed else 'stopped',
        result=dict(winner='A' if completed else None,growth=dict(A=30,B=20)),
        stop_reason_code=None if completed else 'legality_not_confirmed',stop_evidence=None if completed else dict(stage='normal_candidate_or_comparison_proof'),
        final_continuation_state=dict(game_state=game),last_valid_event_seq=0,events=[],snapshots=[dict(event_seq=0,game_state=game)],decisions=[],independent_balance_sample_count=0)

def decision(kind='normal_action', mode='priority_unique', unresolved=False):
    return dict(decision_kind=kind,resolution_mode=mode,strategic_unresolved=unresolved,legal_candidates=['a','b'],selected_candidate='a',seed_context=None)

class EvaluationTests(unittest.TestCase):
    def test_counts_and_denominators_are_separate(self):
        r=route();r['decisions']=[decision(),decision(mode='seeded_fallback',unresolved=True),decision('response_action','seeded_fallback',True)]
        out=e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['routes'][0]
        self.assertEqual(out['normal']['true_stop'],dict(count=1,denominator=3,rate=1/3))
        self.assertEqual(out['normal']['strategic_unresolved'],dict(count=1,denominator=2,rate=.5))
        self.assertEqual(out['normal']['fallback'],dict(count=1,denominator=2,rate=.5))
        self.assertEqual(out['response']['fallback']['denominator'],1)
    def test_equal_tie_break_success_is_not_unresolved(self):
        r=route(completed=True);r['decisions']=[decision(mode='priority_tie_break')]
        out=e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['routes'][0]
        self.assertEqual(out['normal']['strategic_unresolved']['count'],0)
        self.assertIsNone(out['mandatory']['fallback']['rate'])
    def test_one_side_stopped_is_missing_not_zero(self):
        a,b=route(),route('new',True)
        out=e.evaluate_trajectories(dict(planned_ids=['old:p','new:p']),[a,b])
        self.assertIsNone(out['routes'][0]['final_growth'])
        self.assertIsNone(out['routes'][0]['winner'])
        self.assertEqual(out['routes'][1]['final_growth'],dict(A=30,B=20))
        self.assertEqual(out['pairs'][0]['common_completed_turns'],[])
    def test_activation_resolution_not_double_play(self):
        r=route();r['events']=[dict(seq=1,action_type='use_item'),dict(seq=2,action_type='resolve_item'),dict(seq=3,action_type='activate_board_ability')]
        out=e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['routes'][0]['card_use']
        self.assertEqual(out['hand_plays'],1);self.assertEqual(out['effect_resolutions'],1);self.assertEqual(out['board_activations'],1)
    def test_seed_context_and_candidate_changes_are_separate(self):
        r=dict(shadow_id='s',path_id='p',status='compared',reason=None,choice_changed=False,
            legacy=decision(mode='seeded_fallback',unresolved=True),pilot=dict(decision_record=decision(mode='seeded_fallback',unresolved=True)),
            problem=dict(legal_candidate_ids=['a','b']),fresh_inventory=dict(candidate_ids=['a','b']))
        r['pilot']['decision_record']['seed_context']=dict(contract_version='v1',order_id='o',actor='A',actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
        out=e.evaluate_shadow(dict(planned_ids=['s']),[r])
        self.assertEqual(out['seed_context_changes']['count'],1);self.assertEqual(out['candidate_set_changes']['count'],0)
    def test_shadow_not_counted_as_matches(self):
        r=dict(shadow_id='s',path_id='p',status='unsupported',reason='missing proof')
        out=e.evaluate_shadow(dict(planned_ids=['s']),[r])
        self.assertEqual(out['new_matches'],0);self.assertEqual(out['unsupported']['count'],1)
        self.assertIsNone(out['choice_changes']['rate'])
        self.assertEqual(out['policies']['pilot']['true_stop'],dict(count=1,denominator=1,rate=1))
    def test_missing_inventory_comparison_is_missing_not_equal(self):
        r=dict(shadow_id='s',path_id='p',status='compared',reason=None,choice_changed=False,legacy=decision(),pilot=dict(decision_record=decision()),problem=dict(legal_candidate_ids=['a','b']))
        out=e.evaluate_shadow(dict(planned_ids=['s']),[r])
        self.assertIsNone(out['candidate_set_changes']['rate']);self.assertEqual(out['candidate_comparison_missing'],1)
    def test_seeded_routes_excluded_from_balance(self):
        r=route(completed=True);r['decisions']=[decision(mode='seeded_fallback',unresolved=True)]
        self.assertEqual(e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['independent_balance_sample_count'],0)
    def test_missing_or_duplicate_planned_ids_are_rejected(self):
        for rows in ([],[route(),route()]):
            with self.assertRaises(ValueError):e.evaluate_trajectories(dict(planned_ids=['old:p']),rows)
    def test_direct_frontier_selection_counts_as_valid_without_fallback(self):
        r=route(completed=True);r['decisions']=[dict(decision_kind='normal_action',selection=dict(decision_record=None,selected_candidate='a',selection_basis='frontier_unique'))]
        out=e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['routes'][0]['normal']
        self.assertEqual(out['valid'],1);self.assertEqual(out['fallback']['count'],0)
    def test_response_activation_uses_public_source_zone_and_hand_movement(self):
        r=route();g=r['snapshots'][0]['game_state'];g['players']['A']['hand']=['i']
        a=copy.deepcopy(g);a['players']['A']['hand']=[]
        r['snapshots'].append(dict(event_seq=1,game_state=a))
        r['events']=[dict(seq=1,actor='A',action_type='activate_response',source_instance_id='i'),dict(seq=2,actor='A',action_type='activate_response',source_zone='board')]
        out=e.evaluate_trajectories(dict(planned_ids=['old:p']),[r])['routes'][0]['card_use']
        self.assertEqual(out['hand_plays'],1);self.assertEqual(out['board_activations'],1)

if __name__=='__main__':unittest.main()
