"""Synthetic local boundaries; never generate experimental seeds or matches."""
import copy
import hashlib
import json
from pathlib import Path
import unittest
from test_proxy_population_first_response import game_with
from test_proxy_mandatory_population_input import bundle
from proxy_mandatory_policy_contract import canonical
try:
    import proxy_population_start_window as api
except ImportError:
    api=None
ROOT=Path(__file__).resolve().parents[1]

class AssessmentTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'assess_initial_response'),'initial response assessment missing')

    def test_singleton_uses_existing_response_unique_not_mandatory_policy(self):
        g,a,_=game_with('C-box');before=copy.deepcopy(g)
        r=api.assess_initial_response(g,a,a)
        self.assertEqual(r['decision']['resolution_mode'],'response_unique')
        self.assertEqual(r['decision']['selected_candidate'],'response-pass')
        self.assertIsNone(r['decision']['seed_proof'])
        self.assertIsNone(r['policy_eligible']);self.assertEqual(g,before)
        self.assertFalse(r['entry_authenticated'])
        self.assertIsNone(r['strategic_unproven'])

    def test_multiple_response_alternatives_never_gain_a_value_or_random_choice(self):
        for card,count in [('G-hit-blow',8),('I-c_coin2',2)]:
            g,a,_=game_with(card);r=api.assess_initial_response(g,a,a)
            self.assertEqual(len(r['inventory']['legal_candidate_ids']),count)
            self.assertIsNone(r['decision']);self.assertTrue(r['strategic_unproven'])
            self.assertEqual(r['selection_status'],'unproved')
            self.assertEqual(r['legacy_fallback_disposition'],'excluded_if_used')
            self.assertNotIn('score',r);self.assertNotIn('seed_proof',r)

    def test_all_41_cards_at_zero_time_have_explicit_second_actor_disposition(self):
        fixture=json.loads((ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json').read_text())
        ids={c['card_id'] for p in fixture['input']['players'] for c in p['deck_order_top_to_bottom']}
        for card in ids:
            g,a,_=game_with('C-box');other='B' if a=='A' else 'A';p=g['players'][other]
            # Synthetic local lookup only, not a new card or experiment input.
            g['cards'][p['hand'][0]]['card_id']=card
            r=api.assess_initial_response(g,a,other)
            self.assertEqual(r['inventory']['legal_candidate_ids'],['response-pass'])
            exclusions=r['inventory']['excluded_candidates']
            self.assertEqual({x['source_instance_id'] for x in exclusions if x['source_zone']=='hand'},set(p['hand']))
            self.assertEqual(r['decision']['response_opportunity_index'],2)
            self.assertEqual(r['decision']['actor'],other)

    def test_selection_information_is_independent_of_hidden_orders(self):
        g,a,_=game_with('G-hit-blow');r=api.assess_initial_response(g,a,a)
        for p in g['players'].values():p['deck'].reverse()
        g['players']['B' if a=='A' else 'A']['hand'].reverse()
        self.assertEqual(api.assess_initial_response(g,a,a),r)

    def test_invalid_initial_context_and_missing_source_fail_closed(self):
        import tempfile
        g,a,_=game_with('C-box')
        for change in [lambda x:x.update(round=True),lambda x:x['players'][a].update(time=2),
                       lambda x:x['players']['B' if a=='A' else 'A'].update(time=1),
                       lambda x:x['cards'][x['players'][a]['hand'][0]].update(card_id='unknown')]:
            bad=copy.deepcopy(g);change(bad)
            with self.assertRaises(ValueError):api.assess_initial_response(bad,a,a)
        with self.assertRaises(ValueError):api.assess_initial_response(g,a,'C')
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):api.assess_initial_response(g,a,a,Path(folder))

class WindowTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'reconstruct_initial_window'),'initial window reconstruction missing')

    def test_two_unique_passes_reach_normal_with_both_opportunities_and_preserved_resources(self):
        for first_player in 'AB':
            g,a,_=game_with('C-box')
            if a!=first_player:
                # Swap complete owner labels/copy IDs through a JSON token map.
                raw=json.dumps(g).replace('A','TEMP').replace('B','A').replace('TEMP','B')
                g=json.loads(raw)
            before=copy.deepcopy(g);r=api.reconstruct_initial_window(g,first_player)
            self.assertEqual([x['decision']['actor'] for x in r['opportunities']],[first_player,'B' if first_player=='A' else 'A'])
            self.assertEqual([e['seq'] for e in r['events']],[3,4])
            self.assertEqual([s['event_seq'] for s in r['snapshots']],[2,3,4])
            self.assertEqual(r['next_opportunity']['kind'],'normal_action')
            after=r['final_envelope']['legacy_continuation']['game_state']
            self.assertEqual(after['phase'],'normal_action')
            after=copy.deepcopy(after);after['phase']='response_window';self.assertEqual(after,before)
            self.assertEqual(g,before);self.assertIsNone(r['policy_eligible'])
            self.assertFalse(r['ready_for_execution']);self.assertFalse(r['completed'])
            self.assertEqual(r['final_envelope']['legacy_continuation']['response_context']['consecutive_passes'],2)

    def test_multiple_candidates_stop_before_any_pass_or_future_opportunity(self):
        g,a,_=game_with('G-hit-blow');r=api.reconstruct_initial_window(g,a)
        self.assertEqual(r['events'],[]);self.assertEqual(len(r['snapshots']),1)
        self.assertEqual(len(r['opportunities']),1)
        self.assertEqual(r['stop_reason'],'response_selection_unproved')
        self.assertEqual(r['next_opportunity']['kind'],'response_action')
        self.assertEqual(r['final_envelope']['event_seq'],2)
        self.assertEqual(r['final_envelope']['legacy_continuation']['game_state'],g)

    def test_legacy_and_full_envelope_hash_chains_are_independently_checkable(self):
        from proxy_normal_decision_seeded_restart import _stop_state_sha256
        g,a,_=game_with('C-box');r=api.reconstruct_initial_window(g,a)
        h=lambda x:hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        for n,event in enumerate(r['events']):
            before,after=r['snapshots'][n:n+2]
            self.assertEqual(event['continuation_state_before_sha256'],h(before['continuation_state']))
            self.assertEqual(event['continuation_state_after_sha256'],h(after['continuation_state']))
            self.assertEqual(event['game_state_after_sha256'],_stop_state_sha256(after['game_state']))
        self.assertEqual(r['final_envelope_sha256'],h(r['final_envelope']))

    def test_bundle_reconstruction_binds_prefix_and_lookup_without_changing_466(self):
        from proxy_population_opening import reconstruct_opening
        b=bundle();before=copy.deepcopy(b);r=api.build_start_window(b,'test-1A')
        prefix=reconstruct_opening(b,'test-1A')
        self.assertEqual(r['opening_sha256'],hashlib.sha256(canonical(prefix)).hexdigest())
        self.assertEqual(r['window']['source_envelope'],prefix['final_envelope'])
        self.assertEqual(b,before);self.assertFalse(r['input_lock_verified'])
        self.assertIsNone(r['balance_admitted'])
        with self.assertRaises(ValueError):api.build_start_window(b,'absent')

class AuditTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'audit_start_window'),'start window audit missing')

    def test_reconstruction_verification_does_not_grant_any_population_gate(self):
        b=bundle();r=api.build_start_window(b,'test-1A');v=api.audit_start_window(r,b,'test-1A')
        self.assertTrue(v['record_verified'],v['errors'])
        self.assertEqual(v['window_closed'],r['window']['window_closed'])
        self.assertFalse(v['ready_for_input_generation']);self.assertFalse(v['ready_for_execution'])
        self.assertIsNone(v['balance_admitted']);self.assertIsNone(v['policy_eligible'])
        self.assertIn('later_opportunity_coverage_unverified',v['gaps'])
        self.assertFalse(api.audit_start_window(r,b,'test-1B')['record_verified'])

    def test_all_record_fields_types_and_unresolved_boundaries_are_bound(self):
        b=bundle();r=api.build_start_window(b,'test-1A')
        changes=[lambda x:x['window']['opportunities'].clear(),
                 lambda x:x['window']['source_envelope'].update(event_seq=True),
                 lambda x:x['window']['final_envelope']['runtime'].update(extra=[]),
                 lambda x:x['window'].update(final_envelope_sha256='0'*64),
                 lambda x:x.update(policy_eligible=True),
                 lambda x:x['window']['next_opportunity'].update(status='eligible'),
                 lambda x:x['window']['opportunities'][0].update(decision={'resolution_mode':'planned_policy_random'}),
                 lambda x:x['window']['final_envelope']['legacy_continuation']['game_state']['cards']['A-001#1'].update(card_id='unknown')]
        for change in changes:
            bad=copy.deepcopy(r);change(bad)
            self.assertFalse(api.audit_start_window(bad,b,'test-1A')['record_verified'])
        self.assertFalse(api.audit_start_window(None,b,'test-1A')['record_verified'])

    def test_cli_is_strict_read_only_and_never_admits_a_match(self):
        import tempfile,subprocess,sys
        b=bundle();r=api.build_start_window(b,'test-1A')
        with tempfile.TemporaryDirectory() as folder:
            bp=Path(folder)/'bundle.json';rp=Path(folder)/'record.json'
            bp.write_text(json.dumps(b));rp.write_text(json.dumps(r))
            cmd=[sys.executable,str(ROOT/'tools/proxy_population_start_window.py'),'--bundle',str(bp),'--record',str(rp),'--match','test-1A']
            p=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(p.returncode,1,p.stderr)
            self.assertTrue(json.loads(p.stdout)['record_verified'])
            self.assertNotIn('00'*32,p.stdout)
            rp.write_text('{"a":1,"a":2}')
            p=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(p.returncode,2);self.assertTrue(json.loads(p.stdout)['errors'])
            p=subprocess.run(cmd+['--execute'],capture_output=True,text=True)
            self.assertEqual(p.returncode,2)

if __name__=='__main__':unittest.main()
