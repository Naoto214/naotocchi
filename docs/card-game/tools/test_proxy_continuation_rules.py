import copy
import unittest
import proxy_continuation_state as state
import proxy_resource_value_integration as saved
try:
    import proxy_continuation_rules as rules
    import proxy_continuation_candidates as candidates
except ImportError:
    rules = candidates = None


class RulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = saved.load_saved()['paired']['results']

    def setUp(self):
        self.assertIsNotNone(rules, 'shared classification/lineage not implemented')
        self.assertIsNotNone(candidates, 'shared candidate/evidence adapter not implemented')

    def envelope(self, path='probe-01-a-first'):
        row = next(r for r in self.rows if r['path_id']==path and r['policy_id']=='resource_value_pilot_v1')
        return state.create(row['final_continuation_state'], row['last_valid_event_seq'])

    def test_lineage_forward_same_species_and_transform_cost(self):
        allowed = {'M-antlion-01','M-antlion-06','M-beetle-02'}
        cases = [(None,'M-antlion-06','birth',6,True,6),
            ('M-antlion-01','M-antlion-06','time_skip',5,True,5),
            ('M-antlion-06','M-antlion-01','time_skip',8,False,0),
            ('M-antlion-01','M-antlion-01','time_skip',8,False,0),
            ('M-antlion-01','M-beetle-02','transform',2,True,2),
            ('M-antlion-01','M-antlion-06','transform',8,False,0),
            ('M-antlion-01','M-antlion-06','time_skip',4,False,5)]
        for source,target,variant,time,legal,cost in cases:
            with self.subTest(source=source,target=target,variant=variant,time=time):
                result=rules.main_transition(source,target,variant,time,allowed)
                self.assertEqual(result['legal'],legal)
                self.assertEqual(result['payment_time'],cost)
        with self.assertRaises(ValueError): rules.main_transition(None,'M-cat-99','birth',100,allowed)
        with self.assertRaises(ValueError): rules.main_transition(None,'M-antlion-06','birth',6,set())

    def test_cost_modifier_is_optional_per_instance_per_turn(self):
        e=self.envelope();e['legacy_continuation']['game_state']['players']['B']['time']=2
        action=dict(action_type='set_item',source_instance_id='unused')
        options=rules.cost_options(e,action,1)
        self.assertEqual([x['payment_time'] for x in options],[1,0])
        self.assertEqual(options[0]['cost_modifiers'],[])
        e['runtime']['ability_uses']=[dict(source_instance_id='B-001#1',ability_key='set_discount',turn_player='B',round=1,count=1)]
        self.assertEqual(len(rules.cost_options(e,action,1)),1)
        e['legacy_continuation']['game_state']['round']=2
        self.assertEqual(len(rules.cost_options(e,action,1)),2)
        self.assertEqual(len(rules.cost_options(e,dict(action_type='attach_item'),2)),1)

    def test_classification_binds_text_and_does_not_invent_unknown_effects(self):
        self.assertEqual(rules.classification('M-antlion-01')['kind'],'cost_modifier')
        self.assertEqual(rules.classification('I-bowtie')['timing'],'own_turn_start')
        with self.assertRaises(ValueError): rules.classification('M-antlion-06')

    def test_main_present_time_zero_proves_pass_without_lineage_stop(self):
        e=self.envelope();inv=candidates.audit(e,[])
        self.assertEqual(inv['legal_candidate_ids'],['pass'])
        self.assertTrue(inv['candidate_set_complete'])
        problem=candidates.problem(e,inv,self.context(e))
        self.assertEqual(problem['candidates'][0]['certain_growth_difference'],0)
        self.assertEqual(problem['view_sha256'],state.canonical_sha256(state.visible(e,'B')))

    def context(self,e):
        g=e['legacy_continuation']['game_state']
        return dict(contract_version='naotocchi.card_game.proxy_normal_decision_fallback.v1',
            order_id='probe-01',actor=g['turn_player'],actor_turn_index=g['round'],round=g['round'],
            phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')

    def test_attachment_targets_use_full_actual_board(self):
        e=self.envelope('probe-02-a-first'); inv=candidates.audit(e,[])
        attach=[x for x in inv['legal_candidate_details'] if x['action_type']=='attach_item']
        self.assertEqual([(x['card_id'],x['target_instance_ids']) for x in attach],[('I-bowtie',['A-019#1'])])
        e['legacy_continuation']['game_state']['players']['A']['time']=0
        self.assertFalse(any(x['action_type']=='attach_item' for x in candidates.audit(e,[])['legal_candidate_details']))

    def test_unknown_certain_effect_is_not_zero_scored(self):
        e=self.envelope();e['legacy_continuation']['game_state']['players']['B']['time']=6
        inv=candidates.audit(e,[])
        self.assertTrue(any(x['candidate_variant']=='time_skip' for x in inv['legal_candidate_details']))
        with self.assertRaises(ValueError): candidates.problem(e,inv,self.context(e))

    def test_hidden_order_does_not_change_inventory_or_comparison(self):
        e=self.envelope();other=copy.deepcopy(e)
        for p in other['legacy_continuation']['game_state']['players'].values(): p['deck'].reverse()
        a=candidates.audit(e,[]);b=candidates.audit(other,[])
        self.assertEqual(a,b)
        self.assertEqual(candidates.problem(e,a,self.context(e)),candidates.problem(other,b,self.context(other)))

    def test_existing_public_evidence_is_reused_with_new_view_hash(self):
        import proxy_resource_value_trajectory as old
        initial=old.load_initial_routes()[0]
        boundary=next(b for b in initial['inputs']['boundaries'] if b['path_id']==initial['path_id'] and b['event_seq']==4)
        e=state.create(boundary['continuation'],4)
        inv=candidates.audit(e,[])
        prior=old._normal_selection(state.current(e),initial,old.POLICIES[1],boundary['public_history'])
        current=candidates.select(e,inv,prior['problem']['seed_context'],old.POLICIES[1],initial['inputs'])
        self.assertEqual(current['selected_candidate'],prior['selected_candidate'])
        self.assertEqual(current['problem']['view_sha256'],state.canonical_sha256(state.visible(e,boundary['actor'])))
        hidden=copy.deepcopy(e)
        hidden['legacy_continuation']['game_state']['players']['B']['deck'].reverse()
        second=candidates.select(hidden,candidates.audit(hidden,[]),prior['problem']['seed_context'],old.POLICIES[1],initial['inputs'])
        self.assertEqual(current,second)

    def test_post_main_partner_trigger_cannot_receive_safe_certificate(self):
        e=self.envelope();g=e['legacy_continuation']['game_state'];p=g['players']['B']
        source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='P-cat_ceo')
        p['deck'].remove(source);p['hand'].append(source);p['person_placed']=False
        before=copy.deepcopy(e);inv=candidates.audit(e,[])
        self.assertIn('candidate-place-partner-'+source,inv['legal_candidate_ids'])
        with self.assertRaisesRegex(ValueError,'placement trigger'):
            candidates.select(e,inv,self.context(e),'resource_value_pilot_v1')
        self.assertEqual(e,before)
        # The same handler classification is valid while actually in egg state.
        main=p['board']['main'];p['board']['main']=None;p['discard'].append(main)
        action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['candidate_id']=='candidate-place-partner-'+source)
        self.assertEqual(candidates.placement_certificate(e,action)['candidate_id'],action['candidate_id'])

    def test_inventory_tampering_rejected_before_scoring(self):
        e=self.envelope(); inv=candidates.audit(e,[])
        inv['legal_candidate_details'][0]['action_type']='attach_item'
        with self.assertRaises(ValueError): candidates.problem(e,inv,self.context(e))


if __name__=='__main__': unittest.main()
