"""Unit-only historical inputs and fixed synthetic roots; no population run."""
import copy
import unittest
from test_proxy_mandatory_population_input import bundle
try:
    import proxy_population_opening as api
except ImportError:
    api=None


class LoaderTests(unittest.TestCase):
    def setUp(self):self.assertIsNotNone(api,'source-bound planned initial loader missing')

    def test_initial_state_retains_owner_decks_and_five_card_hands(self):
        b=bundle();before=copy.deepcopy(b)
        loaded=api.load_match(b,'test-1A');g=loaded['initial_game_state']
        self.assertEqual(b,before)
        self.assertEqual((g['round'],g['turn_player'],g['phase']),(0,None,'before_match'))
        self.assertEqual(len(g['cards']),80)
        for owner in 'AB':
            p=g['players'][owner];rows=b['groups'][0]['full_order_'+owner]
            self.assertEqual(p['hand'],[r['initial_instance_id'] for r in rows[:5]])
            self.assertEqual(p['deck'],[r['initial_instance_id'] for r in rows[5:]])
            self.assertEqual((p['time'],p['growth'],p['board']['main']),(0,20,None))
        self.assertFalse(loaded['input_lock_verified']);self.assertIsNone(loaded['balance_admitted'])

    def test_mirror_changes_first_player_without_swapping_owner_identities(self):
        b=bundle();a=api.load_match(b,'test-1A');other=api.load_match(b,'test-1B')
        self.assertEqual(a['initial_game_state'],other['initial_game_state'])
        self.assertEqual((a['first_player'],other['first_player']),('A','B'))
        self.assertNotEqual(a['policy_input_sha256'],other['policy_input_sha256'])

    def test_changed_initial_order_unknown_match_and_forged_source_fail(self):
        b=bundle()
        with self.assertRaises(ValueError):api.load_match(b,'historical-path-id')
        b['groups'][0]['full_order_A'][0]['card_id']='W-city'
        with self.assertRaises(ValueError):api.load_match(b,'test-1A')
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):api.load_match(bundle(),'test-1A',root=Path(d))

class OpeningTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'reconstruct_opening'),'first-turn reconstruction missing')

    def test_two_draws_seven_physical_candidates_and_rule_derived_address(self):
        b=bundle();r=api.reconstruct_opening(b,'test-1A')
        rows=b['groups'][0]['full_order_A'];instances=[x['initial_instance_id'] for x in rows]
        record=r['mandatory_record']['local_record']
        self.assertEqual(r['normal_draw_intermediate']['players']['A']['hand'],instances[:6])
        self.assertEqual(record['application']['boundary']['choice_game_state']['players']['A']['hand'],instances[:7])
        self.assertEqual(record['application']['boundary']['candidate_ids'],sorted(x['card_copy_id'] for x in rows[:7]))
        self.assertEqual(record['context']['opportunity_address'],['A',1,'A','turn_start',0,'egg_exchange_bottom','selection',0])
        selected=record['application']['selected_candidate']
        selected_instance=next(x['initial_instance_id'] for x in rows if x['card_copy_id']==selected)
        after=r['final_envelope']['legacy_continuation']['game_state']
        self.assertEqual(after['players']['A']['deck'],instances[7:]+[selected_instance])
        self.assertEqual(after['players']['A']['hand'],[x for x in instances[:7] if x!=selected_instance])
        self.assertEqual(after['players']['A']['time'],1)
        self.assertEqual(after['players']['B'],r['initial']['initial_game_state']['players']['B'])
        self.assertEqual([e['action_type'] for e in r['events']],['turn_start_and_egg_draw','egg_exchange_bottom'])
        self.assertEqual([x['seq'] for x in r['snapshots']],[0,1,2])
        self.assertEqual(r['opening_obligations']['turn_counts'],{'A':1,'B':0})
        self.assertFalse(r['completed']);self.assertIsNone(r['balance_admitted'])

    def test_mirror_uses_other_first_owner_and_side_but_same_initial_state(self):
        b=bundle();r=api.reconstruct_opening(b,'test-1B')
        c=r['mandatory_record']['local_record']['context']
        self.assertEqual((c['owner'],c['mirror_side'],c['opportunity_address'][0]),('B','B_first','B'))
        self.assertEqual(r['opening_obligations']['turn_counts'],{'A':0,'B':1})
        end=r['final_envelope']['legacy_continuation']
        self.assertEqual(end['game_state']['phase'],'response_window')
        self.assertEqual(end['response_context'],dict(source_phase='response_window',phase='response_window',
            window_kind='turn_start',origin_event_seq=2,turn_player='B',priority_actor='B',chain_status='empty',
            chain_links=[],consecutive_passes=0,response_opportunity_index=1,
            decision_kind='response_action',choice_kind='reaction_or_pass'))
        self.assertEqual(end['return_target'],'normal_action_opportunity')
        self.assertEqual(end['activation_zone'],[]);self.assertEqual(end['pending_triggers'],[])
        self.assertEqual(r['next_opportunity']['status'],'unproved')

    def test_snapshot_and_continuation_hashes_bind_states_without_mutation(self):
        import hashlib
        from proxy_mandatory_policy_contract import canonical
        from proxy_record_validator import canonical_sha256
        b=bundle();before=copy.deepcopy(b);r=api.reconstruct_opening(b,'test-1A')
        self.assertEqual(b,before)
        for i,event in enumerate(r['events']):
            self.assertEqual(event['state_before_sha256'],canonical_sha256(r['snapshots'][i]['state']))
            self.assertEqual(event['state_after_sha256'],canonical_sha256(r['snapshots'][i+1]['state']))
        self.assertEqual(r['final_envelope_sha256'],canonical_sha256(r['final_envelope']))
        self.assertEqual(r['initial']['initial_full_state_sha256'],hashlib.sha256(canonical(r['initial']['initial_game_state'])).hexdigest())
        self.assertNotIn('cards',r['snapshots'][0]['state'])
        self.assertEqual(len(r['initial']['initial_game_state']['cards']),80)

class AuditTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'audit_opening'),'opening evidence validator missing')

    def test_reconstruction_verified_but_following_response_and_match_unproved(self):
        b=bundle();r=api.reconstruct_opening(b,'test-1A')
        out=api.audit_opening(r,b,'test-1A')
        self.assertTrue(out['opening_verified'],out['errors'])
        self.assertTrue(out['first_turn_obligation_binding_verified'])
        self.assertTrue(out['first_mandatory_candidate_binding_verified'])
        self.assertIsNone(out['policy_eligible']);self.assertIsNone(out['balance_admitted'])
        self.assertFalse(out['ready_for_execution'])
        self.assertIn('later_opportunity_coverage_unverified',out['gaps'])

    def test_changed_origin_intermediate_draw_omission_lookup_or_chain_is_rejected(self):
        b=bundle();r=api.reconstruct_opening(b,'test-1A')
        mutations=[lambda x:x['opening_obligations']['steps'].pop(1),
                   lambda x:x['opening_obligations']['turn_counts'].update(A=True),
                   lambda x:x['normal_draw_intermediate']['players']['A']['hand'].pop(),
                   lambda x:x['mandatory_record']['local_record']['context']['opportunity_address'].__setitem__(1,2),
                   lambda x:x['events'][1].update(state_before_sha256='0'*64),
                   lambda x:x['snapshots'].reverse(),
                   lambda x:x['final_envelope']['runtime'].update(extra=[]),
                   lambda x:x['final_envelope']['legacy_continuation']['response_context'].update(priority_actor='B'),
                   lambda x:x['initial']['initial_game_state']['cards'][next(iter(x['initial']['initial_game_state']['cards']))].update(card_id='W-city'),
                   lambda x:x.update(next_opportunity={'status':'verified'}),
                   lambda x:x.update(policy_eligible=True)]
        for change in mutations:
            bad=copy.deepcopy(r);change(bad)
            self.assertFalse(api.audit_opening(bad,b,'test-1A')['opening_verified'])

    def test_saved_choice_is_not_used_as_an_input_or_legacy_reclassified(self):
        b=bundle();r=api.reconstruct_opening(b,'test-1A')
        bad=copy.deepcopy(r)
        bad['mandatory_record']['local_record']['arithmetic_proof']['selected_candidate']='other'
        bad['mandatory_record']['local_record']['resolution_mode']='seeded_fallback'
        self.assertFalse(api.audit_opening(bad,b,'test-1A')['opening_verified'])
        self.assertEqual(api.reconstruct_opening(b,'test-1A'),r)
        self.assertFalse(api.audit_opening(r,b,'test-1B')['opening_verified'])

class CliTests(unittest.TestCase):
    def test_read_only_cli_pending_and_malformed_exit(self):
        import tempfile,json,subprocess,sys
        from pathlib import Path
        b=bundle()
        with tempfile.TemporaryDirectory() as d:
            bp=Path(d)/'bundle.json';rp=Path(d)/'record.json'
            bp.write_text(json.dumps(b));rp.write_text(json.dumps(api.reconstruct_opening(b,'test-1A')))
            cmd=[sys.executable,str(Path(__file__).with_name('proxy_population_opening.py')),
                 '--bundle',str(bp),'--record',str(rp),'--match','test-1A']
            p=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(p.returncode,1)
            self.assertTrue(json.loads(p.stdout)['opening_verified'])
            self.assertNotIn('00'*32,p.stdout+p.stderr)
            rp.write_text('{"bad":1,"bad":2}')
            p=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(p.returncode,2);self.assertTrue(json.loads(p.stdout)['errors'])
            self.assertNotIn('Traceback',p.stderr)
            self.assertEqual(subprocess.run(cmd+['--execute'],capture_output=True).returncode,2)

if __name__=='__main__':unittest.main()
