import copy,unittest
import proxy_resource_value_trajectory as t

class NormalBoardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initial=next(x for x in t.load_initial_routes() if x['path_id']=='probe-02-a-first')
        result=t.run_route(cls.initial,t.POLICIES[1])
        shot=next(s for s in result['snapshots'] if s['event_seq']==9)
        cls.state=t._current(shot['continuation_state'],9)
        cls.history=dict(normal_challenge_losses_by_actor=[],last_valid_event_seq=9,source_refs=[])
    def test_end_trigger_is_not_a_normal_action_and_registry_is_restored(self):
        before=copy.deepcopy(self.state);registry=copy.deepcopy(t.candidates.BOARD_ABILITY_REGISTRY)
        proof=t.audit_opportunity(self.state,self.history)
        self.assertTrue(proof['candidate_set_complete'])
        self.assertTrue(all(proof['completeness_checks'].values()))
        self.assertFalse(any(d['source_zone']=='board' for d in proof['legal_candidate_details']))
        self.assertEqual(self.state,before);self.assertEqual(t.candidates.BOARD_ABILITY_REGISTRY,registry)
    def test_partner_end_ability_is_blocked_while_owner_is_egg(self):
        result=t.run_route(self.initial,t.POLICIES[1]);shot=next(s for s in result['snapshots'] if s['event_seq']==11)
        state=t._current(shot['continuation_state'],11)
        events=[e for e in result['events'] if e['seq']<=11];shots=[s for s in result['snapshots'] if s['event_seq']<=11]
        before=copy.deepcopy(state)
        outcome=t._end_transition(state,self.initial['path_id'],events,shots)
        self.assertEqual(outcome['new_events'][0]['action_type'],'turn_end_completed')
        self.assertFalse(any(e.get('source_instance_id')=='A-019#1' for e in outcome['new_events']))
        self.assertEqual(state,before)

    def test_end_only_partner_is_retained_across_next_start_draw(self):
        result=t.run_route(self.initial,t.POLICIES[1]);shot=next(s for s in result['snapshots'] if s['event_seq']==20)
        state=t._current(shot['continuation_state'],20)
        outcome=t._end_transition(state,self.initial['path_id'],[e for e in result['events'] if e['seq']<=20],[s for s in result['snapshots'] if s['event_seq']<=20])
        self.assertEqual(outcome['final_continuation_state']['game_state']['players']['A']['board']['partner'],'A-019#1')
        self.assertEqual(outcome['new_events'][-1]['action_type'],'turn_start_and_egg_draw')
        self.assertFalse(any(e.get('source_instance_id')=='A-019#1' for e in outcome['new_events']))

    def test_non_egg_partner_end_trigger_is_not_suppressed(self):
        state=copy.deepcopy(self.state);state['game_state']['players']['A']['board']['main']='A-001#1'
        registry=copy.deepcopy(t.reached.board_end.board.turn_end.BOARD_REGISTRY)
        with self.assertRaisesRegex(ValueError,'active scorpion end trigger'):
            with t.egg_partner_end_scope(state):self.fail('active trigger was silently suppressed')
        self.assertEqual(t.reached.board_end.board.turn_end.BOARD_REGISTRY,registry)

    def test_unknown_board_source_is_not_classified_as_passive(self):
        state=copy.deepcopy(self.state);state['game_state']['cards']['A-019#1']['card_id']='unknown'
        with self.assertRaises(ValueError):t.audit_opportunity(state,self.history)

if __name__=='__main__':unittest.main()
