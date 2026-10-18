"""127: independently rederive candidate evidence from immutable 126 stops."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

import proxy_r2_candidate_extension_127 as extension


DATA=Path(__file__).resolve().parents[1]/'data'


class R2CandidateExtensionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stops={p:json.loads((DATA/'proxy-current-turn-end-stops-126'/f'stop-126-{p}.json').read_bytes())
                   for p in ('order-01-a-first','order-01-b-first','order-02-a-first','order-02-b-first')}
        cls.table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_bytes())

    def test_board_count_exclusion_has_both_count_and_time_evidence(self):
        audit=extension.audit_current(self.stops['order-01-a-first'],self.table)
        units=[x for x in audit['enumeration_units'] if x['card_id']=='G-area-claim']
        self.assertEqual(len(units),2)
        self.assertTrue(all('board_card_count_condition_not_met' in x['reason_codes'] for x in units))
        self.assertTrue(all('insufficient_time' in x['reason_codes'] for x in units))
        self.assertEqual([x['evidence']['owner.board_card_count'] for x in units],[1,1])
        self.assertEqual(extension.validate_current(audit,self.stops['order-01-a-first'],self.table),[])

    def test_board_count_variant_boundaries_are_recomputed(self):
        stop=self.stops['order-01-a-first'];view=extension.extension_125.project(stop)
        owner=view['players'][view['actor']]
        owner['time']=3
        base=owner['board']
        inventory=extension.extension_125.inventory_sources(view)
        variants=[x for x in extension.candidate_121.expand_units(view,inventory,self.table)
                  if x['card_id']=='G-area-claim']
        for count in (6,7,8,9):
            changed=copy.deepcopy(view)
            board=changed['players'][changed['actor']]['board']
            board['main']='A-001#1'
            board['companions']=[f'A-{n:03d}#1' for n in (11,12,13)]
            board['partner']='A-017#1'
            board['world']='A-020#1' if count>=6 else None
            board['prepared']=[f'A-{n:03d}#1' for n in (31,32,33)][:count-6]
            for x in extension._board_instances(changed):
                changed['cards'].setdefault(x,{'card_id':'test-'+x})
            for variant in variants:
                if (variant['candidate_variant']=='seven_or_eight_cards' and count in (7,8)) or \
                        (variant['candidate_variant']=='nine_or_more_cards' and count==9):
                    with self.assertRaisesRegex(ValueError,'missing_candidate_id_grammar'):
                        extension._board_count_unit(changed,variant)
                else:
                    result=extension._board_count_unit(changed,variant)
                    self.assertIn('board_card_count_condition_not_met',result['reason_codes'])
                    self.assertEqual(result['evidence']['owner.board_card_count'],count)

    def test_single_target_has_canonical_instance_id(self):
        for path in ('order-02-a-first','order-02-b-first'):
            view=extension.extension_125.project(self.stops[path])
            inventory=extension.extension_125.inventory_sources(view)
            baseline=extension.candidate_121.expand_units(view,inventory,self.table)
            original=next(x for x in baseline if x['card_id']=='I-bowtie'
                          and x['target_instance_ids'])
            item=extension.adjudicate_units(view,[original])[0]
            actor=view['actor']
            self.assertEqual(item['candidate_id'],f'candidate-attach_item-{actor}-032#1-target-{actor}-014#1')
            self.assertEqual(item['target_instance_ids'],[f'{actor}-014#1'])

    def test_single_target_rejects_unknown_or_multiple_targets(self):
        view=extension.extension_125.project(self.stops['order-02-b-first'])
        inventory=extension.extension_125.inventory_sources(view)
        original=next(x for x in extension.candidate_121.expand_units(view,inventory,self.table)
                      if x['card_id']=='I-bowtie' and x['target_instance_ids'])
        for targets in ([],['B-999#1'],['B-014#1','B-017#1'],
                        ['A-014#1'],['B-017#1']):
            forged=copy.deepcopy(original);forged['target_instance_ids']=targets
            with self.assertRaisesRegex(ValueError,'missing_candidate_id_grammar'):
                extension._single_target_id(view,forged)

    def test_no_target_world_does_not_acquire_single_target_grammar(self):
        audit=extension.audit_current(self.stops['order-02-a-first'],self.table)
        self.assertEqual(audit['contract_stop_codes'],['missing_candidate_id_grammar'])
        self.assertFalse(audit['candidate_set_complete'])

    def test_01_b_complete_five_candidates_not_silently_changed(self):
        audit=extension.audit_current(self.stops['order-01-b-first'],self.table)
        self.assertEqual(audit['legal_candidate_ids'],[
            'candidate-place-companion-B-011#1','candidate-place-companion-B-012#1',
            'candidate-play-main-B-001#1-birth','candidate-play-main-B-009#1-birth','pass'])
        self.assertTrue(audit['candidate_set_complete'])

    def test_five_candidate_comparison_retains_full_set_and_lottery_subset(self):
        route=self.stops['order-01-b-first']
        audit=extension.audit_current(route,self.table)
        decision=extension.compare_normal_action(route,audit,self.table)
        self.assertEqual(decision['legal_candidates'],audit['legal_candidate_ids'])
        self.assertEqual(decision['seeded_fallback_candidates'],[
            'candidate-place-companion-B-011#1','candidate-place-companion-B-012#1'])
        self.assertEqual(decision['resolution_mode'],'seeded_fallback')
        self.assertTrue(decision['strategic_unresolved'])
        self.assertEqual(extension.fallback_116.validate_seeded_resolution(decision),[])
        proof=decision['priority_basis']
        self.assertEqual(set(proof['time_after_certain_resolution'].values()),{1,2})
        self.assertEqual(len(proof['legal_candidates']),5)
        self.assertEqual(proof['dominated_paid_birth_count'],2)

    def test_five_candidate_comparison_rejects_false_completeness(self):
        route=self.stops['order-01-b-first']
        audit=extension.audit_current(route,self.table)
        audit['legal_candidate_ids'].remove('pass')
        with self.assertRaises(ValueError):
            extension.compare_normal_action(route,audit,self.table)

    def test_four_independent_restarts_respect_candidate_boundary(self):
        outcomes=extension.run_all({'stops':self.stops,'candidate_table':self.table})
        self.assertEqual(set(outcomes),set(self.stops))
        self.assertGreater(outcomes['order-01-a-first']['last_valid_event_seq'],20)
        self.assertEqual(outcomes['order-01-a-first']['final_state']['return_target'],'turn_end')
        self.assertGreater(outcomes['order-01-b-first']['last_valid_event_seq'],20)
        self.assertEqual(outcomes['order-02-a-first']['last_valid_event_seq'],18)
        self.assertEqual(outcomes['order-02-a-first']['reason']['contract_stop_codes'],
                         ['missing_candidate_id_grammar'])
        self.assertEqual(outcomes['order-02-b-first']['last_valid_event_seq'],18)
        for result in outcomes.values():
            self.assertEqual(result['winner'],None)
            self.assertFalse(result['counts_as_independent_balance_sample'])
            self.assertEqual(result['status'],'stopped_rules_adjudication')

    def test_canonical_output_bytes_and_forged_decision_are_rejected(self):
        inputs={'stops':self.stops,'candidate_table':self.table}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            self.assertTrue(extension.check_outputs(root,inputs))
            extension.write_outputs(root,inputs)
            self.assertEqual(extension.check_outputs(root,inputs),[])
            (root/extension.PLAN_FILE).write_bytes((root/extension.PLAN_FILE).read_bytes()+b' ')
            self.assertTrue(extension.check_outputs(root,inputs))
        outcomes=extension.run_all(inputs)
        self.assertEqual(extension.validate_outcomes(outcomes,inputs),[])
        altered=copy.deepcopy(outcomes)
        altered['order-01-b-first']['decisions'][0]['selected_candidate']='pass'
        self.assertTrue(extension.validate_outcomes(altered,inputs))

    def test_new_turn_end_is_reproved_from_complete_history(self):
        prior=extension.current_126.load_sources()
        source=self.stops['order-01-a-first']
        current=copy.deepcopy(source['final_state'])
        audit=extension.audit_current(source,self.table)
        decision=extension._choose_pass_over_birth(source,audit,self.table)
        current,events=extension.restart_122.transition(current,decision,{'candidate_table':self.table})
        first=extension.response_120.enumerate_response_opportunity(current,'B',self.table)
        response=extension.response_120.resolve_response_choice({'order_id':'order-01',
            'actor_turn_index':2,'round':2},first)
        current,more=extension.restart_122.apply_supported_response(current,response,{'candidate_table':self.table})
        current['game_state']['phase']='turn_end'
        current['return_target']='turn_end'
        current['continuation_state_sha256']=extension.response_120.continuation_state_sha256(
            extension.response_120._continuation_payload(current))
        more[-1]['game_state_after_sha256']=extension.response_120.game_state_sha256(current['game_state'])
        more[-1]['continuation_state_after_sha256']=current['continuation_state_sha256']
        events+=more
        snapshots=[{'seq':source['last_valid_event_seq'],'game_state_sha256':source['game_state_sha256'],
                    'continuation_state_sha256':source['continuation_state_sha256']}]
        snapshots += [{'seq':e['seq'],'game_state_sha256':e['game_state_after_sha256'],
                       'continuation_state_sha256':e['continuation_state_after_sha256']} for e in events]
        proof=extension.audit_turn_end_from_history('order-01-a-first',source,prior,current,events,snapshots)
        self.assertTrue(proof['turn_end_set_complete'],
                        (proof['contract_stop_codes'],proof['completeness_checks'],proof['provenance_evidence']['unresolved_codes']))
        self.assertEqual(proof['contract_stop_codes'],[])

    def test_proved_end_advances_to_next_players_current_opportunity(self):
        inputs=extension.load_sources()
        route=extension.run_route('order-01-a-first',inputs)
        self.assertGreaterEqual(route['last_valid_event_seq'],25)
        self.assertEqual(route['audits'][1]['turn_end_set_complete'],True)
        self.assertEqual(route['snapshots'][0]['game_state_sha256'],
                         self.stops['order-01-a-first']['game_state_sha256'])
        self.assertFalse(route['counts_as_independent_balance_sample'])


if __name__=='__main__':
    unittest.main()
