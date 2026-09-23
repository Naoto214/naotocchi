import hashlib
import json
import unittest
from pathlib import Path

from proxy_normal_action_candidate_completeness import (
    build_contract, load_inputs, verify_source_artifact,
)

DATA = Path(__file__).resolve().parents[1] / 'data'
EXPECTED = {
    'order-01-a-first': ('cf22f9171b5a6f2ef5f60e83c00ef1e9bf6dd89e84aaa8d55be33d300637cf08', 7, '641e77bb932b2a3b4d4214b0cd12306076ec86a990e13110c9e4bc4cf8f94d80', 'a698227f6c2c851c3012b64ba27cf9db77d8a0eeb13d583902efda03ac600a00'),
    'order-01-b-first': ('b0f77de2b82574a144a4742ee0d55e830400e44f8ca9b8eeb33c76def7bc6e9d', 5, '6462c0cb11bc0cb26aeb055a4b969578a3f9bd05ff8963584fe629ac00ff3616', 'cbda8acffc3a36ceb14b98a2cb36cd9649796444599ed02da4abfdcfc8403467'),
    'order-02-a-first': ('a2c617130f85360577014568309ab23a819ad10adb6c9710058f2651fccd421d', 5, 'edbc2844074b27462439c1efe85f0c021b826cf75a51bdd115858029dfc2ff89', 'b325d7802cf9e9e621765f420727f33c16a52e0ea10a989bb1dd38376aa717ea'),
    'order-02-b-first': ('1705a9ce7cc19e34e78730da8716ec9c12f33a7a284bef8fe68176b36d79f688', 5, 'c934f656ed14f0a73b2c70f714470e7bbdad98626ce4a4078fe96888aa426473', 'f4eaf9452682fd1c5ff2ecf7ed4dfb9a3ccd34fb3dba707cff7bff870b3accf5'),
}

class SourceContractTests(unittest.TestCase):
    def test_four_stop_raw_state_hashes_and_sequences(self):
        for path, expected in EXPECTED.items():
            with self.subTest(path=path):
                raw = (DATA / 'proxy-response-window-stops-120' / f'stop-120-{path}.json').read_bytes()
                stop = json.loads(raw)
                self.assertEqual(hashlib.sha256(raw).hexdigest(), expected[0])
                self.assertEqual(stop['last_valid_event_seq'], expected[1])
                self.assertEqual((stop['game_state_sha256'], stop['continuation_state_sha256']), expected[2:])
                verify_source_artifact(stop, raw, expected)

    def test_corrupt_raw_bytes_or_mapping_is_global_error(self):
        path, expected = next(iter(EXPECTED.items()))
        raw = (DATA / 'proxy-response-window-stops-120' / f'stop-120-{path}.json').read_bytes()
        stop = json.loads(raw)
        with self.assertRaises(ValueError):
            verify_source_artifact(stop, raw + b'\n', expected)
        stop['game_state']['cards'].clear()
        with self.assertRaises(ValueError):
            verify_source_artifact(stop, raw, expected)

    def test_contract_registry_exact(self):
        c = build_contract()
        self.assertEqual(c['checkpoint'], 121)
        self.assertEqual(c['status'], 'protocol_only_no_match_progress')
        self.assertEqual((len(c['source_family_registry']), len(c['reason_code_registry']), len(c['contract_stop_codes']), len(c['completeness_requirements'])), (6, 17, 10, 12))
        self.assertEqual(len(c), 14)

from proxy_normal_action_candidate_completeness import project_normal_action_information, inventory_sources

class ProjectionInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stop = load_inputs()['stops']['order-01-b-first'][0]

    def test_projection_rejects_private_and_future_fields(self):
        view = project_normal_action_information(self.stop)
        actor = self.stop['actor']
        other = 'A' if actor == 'B' else 'B'
        self.assertNotIn('deck', str(view))
        self.assertNotIn('future', str(view))
        self.assertNotIn('hand', view['players'][other])
        for key in ('deck', 'future_draw', 'future_response'):
            self.assertNotIn(key, view['players'][actor])
        self.assertTrue(set(view['players'][actor]['hand']) <= set(view['cards']))

    def test_all_six_families_including_empty_evidence(self):
        view = project_normal_action_information(self.stop)
        inventory = inventory_sources(view)
        self.assertEqual([row['family'] for row in inventory], ['standing_pass', 'hand_card_action', 'board_card_action', 'reservation_action', 'normal_challenge', 'relationship_progress'])
        self.assertEqual(len(inventory[1]['sources']), 5)
        self.assertEqual(inventory[3]['sources'], [])
        self.assertEqual(inventory[3]['empty_reason_code'], 'no_reservation_source')
        self.assertEqual(len(inventory[4]['sources']), 1)

    def test_inventory_rejects_missing_hand_source(self):
        view = project_normal_action_information(self.stop)
        inventory = inventory_sources(view)
        inventory[1]['sources'].pop()
        self.assertNotEqual(inventory, inventory_sources(view))

from proxy_normal_action_candidate_completeness import expand_units

class ExpansionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_inputs()

    def test_all_hand_variants_are_enumerated(self):
        stop = self.inputs['stops']['order-01-b-first'][0]
        view = project_normal_action_information(stop)
        units = expand_units(view, inventory_sources(view), self.inputs['candidate_table'])
        hand = [u for u in units if u['source_family'] == 'hand_card_action']
        self.assertEqual({u['candidate_variant'] for u in hand if u['source_instance_id'] == 'B-001#1'}, {'birth','time_skip','transform'})
        self.assertEqual(len({u['enumeration_unit_id'] for u in units}), len(units))
        self.assertEqual(sum(u['source_family']=='standing_pass' for u in units),1)

    def test_missing_template_stops(self):
        stop = self.inputs['stops']['order-01-b-first'][0]
        view = project_normal_action_information(stop)
        table = json.loads(json.dumps(self.inputs['candidate_table']))
        table['cards'] = [c for c in table['cards'] if c['card_id'] != 'M-antlion-01']
        with self.assertRaisesRegex(ValueError, 'missing_candidate_template'):
            expand_units(view, inventory_sources(view), table)

    def test_target_expansion_is_exhaustive(self):
        stop = self.inputs['stops']['order-02-b-first'][0]
        view = project_normal_action_information(stop)
        units = expand_units(view, inventory_sources(view), self.inputs['candidate_table'])
        bowtie = [u for u in units if u['source_instance_id'] == 'B-032#1']
        self.assertEqual([u['target_instance_ids'] for u in bowtie], [['B-014#1']])

from proxy_normal_action_candidate_completeness import adjudicate_units, derive_legal_candidates

class AdjudicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_inputs()

    def test_four_path_candidate_projection(self):
        expected = [
            ['pass'], ['candidate-play-main-B-001#1-birth', 'pass'], ['pass'],
            ['candidate-play-main-B-001#1-birth', 'candidate-play-main-B-009#1-birth', 'pass'],
        ]
        for path, ids in zip(EXPECTED, expected):
            with self.subTest(path=path):
                view = project_normal_action_information(self.inputs['stops'][path][0])
                units = expand_units(view, inventory_sources(view), self.inputs['candidate_table'])
                result = adjudicate_units(view, units, build_contract())
                self.assertEqual(derive_legal_candidates(result)[0], ids)
                self.assertTrue(all(u['disposition']=='admitted' and not u['reason_codes'] or u['disposition']=='excluded' and u['reason_codes'] for u in result))

    def test_multiple_reasons_are_retained(self):
        view = project_normal_action_information(self.inputs['stops']['order-01-a-first'][0])
        result = adjudicate_units(view, expand_units(view, inventory_sources(view), self.inputs['candidate_table']), build_contract())
        birth = next(u for u in result if u['source_instance_id']=='A-002#1' and u['candidate_variant']=='birth')
        self.assertEqual(birth['reason_codes'], ['insufficient_time', 'main_transition_not_legal'])

    def test_unregistered_id_and_pass_alias_are_rejected(self):
        view = project_normal_action_information(self.inputs['stops']['order-01-b-first'][0])
        result = adjudicate_units(view, expand_units(view, inventory_sources(view), self.inputs['candidate_table']), build_contract())
        result[0]['candidate_id']='response-pass'
        with self.assertRaisesRegex(ValueError, 'candidate'):
            derive_legal_candidates(result)

from proxy_normal_action_candidate_completeness import build_audits, validate_audit
import copy

class AuditValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_inputs()

    def test_independent_completeness_twelve_checks(self):
        audit = build_audits(self.inputs)
        self.assertEqual(len(audit['audits']),4)
        for row in audit['audits']:
            self.assertEqual(len(row['completeness_checks']),12)
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual(row['contract_stop_codes'],[])
        self.assertEqual(validate_audit(audit,self.inputs),[])

    def test_saved_boolean_units_and_reasons_are_not_trusted(self):
        audit = build_audits(self.inputs)
        for edit in ('boolean','source','unit','reason','candidate'):
            with self.subTest(edit=edit):
                mutated=copy.deepcopy(audit)
                row=mutated['audits'][1]
                if edit=='boolean': row['candidate_set_complete']=False
                elif edit=='source': row['source_inventory'][1]['sources'].pop()
                elif edit=='unit': row['enumeration_units'].pop()
                elif edit=='reason': next(u for u in row['enumeration_units'] if u['disposition']=='excluded')['reason_codes']=[]
                else: row['legal_candidate_ids'].pop()
                self.assertTrue(validate_audit(mutated,self.inputs))

    def test_private_key_and_progress_rejected(self):
        audit=build_audits(self.inputs)
        audit['audits'][0]['owner_state']['deck']=['secret']
        self.assertTrue(validate_audit(audit,self.inputs))
        audit=build_audits(self.inputs)
        audit['summary']['winner']=1
        self.assertTrue(validate_audit(audit,self.inputs))

class ContractEvidenceTests(unittest.TestCase):
    def test_reason_registry_has_evidence_and_canonical_reference(self):
        contract=build_contract()
        self.assertTrue(all(isinstance(r,dict) and r['code'] and r['required_evidence_fields'] and r['canonical_references'] for r in contract['reason_code_registry']))

    def test_unknown_state_key_and_unknown_player_key_are_rejected(self):
        stop=copy.deepcopy(load_inputs()['stops']['order-01-b-first'][0])
        stop['game_state']['future_draw']='B-001#1'
        with self.assertRaises(ValueError):
            project_normal_action_information(stop)
        stop=copy.deepcopy(load_inputs()['stops']['order-01-b-first'][0])
        stop['game_state']['players']['B']['future_draw']='B-001#1'
        with self.assertRaises(ValueError):
            project_normal_action_information(stop)

    def test_noncurrent_relationship_variant_is_not_terminal(self):
        inputs=load_inputs(); view=project_normal_action_information(inputs['stops']['order-01-b-first'][0]); units=expand_units(view,inventory_sources(view),inputs['candidate_table']); adjudicated=adjudicate_units(view,units,build_contract())
        self.assertFalse(any(u['source_family']=='relationship_progress' and u['candidate_variant']=='2-to-3' for u in adjudicated))

    def test_completeness_checks_are_recomputed_from_evidence(self):
        audit=build_audits(load_inputs())
        self.assertEqual(set(audit['audits'][0]['completeness_checks']), set(build_contract()['completeness_requirements']))
        # A saved check alone has no authority.
        audit['audits'][0]['completeness_checks']['source_inventory_complete']=False
        self.assertTrue(validate_audit(audit,load_inputs()))
from proxy_normal_action_candidate_completeness import recompute_completeness

class DerivedChecksTests(unittest.TestCase):
    def test_mutated_source_inventory_and_projection_flip_respective_checks(self):
        inputs=load_inputs(); audit=build_audits(inputs); row=copy.deepcopy(audit['audits'][0]); stop,raw=inputs['stops'][row['path_id']]
        row['source_inventory'][1]['sources'].pop()
        flags=recompute_completeness(row,stop,raw,inputs['candidate_table'])
        self.assertFalse(flags['source_inventory_complete'])
        self.assertFalse(all(flags.values()))
        row=copy.deepcopy(audit['audits'][0]); row['legal_candidate_ids']=[]
        flags=recompute_completeness(row,stop,raw,inputs['candidate_table'])
        self.assertFalse(flags['legal_candidate_projection_exact'])

    def test_mutated_reason_and_information_flip_respective_checks(self):
        inputs=load_inputs(); row=copy.deepcopy(build_audits(inputs)['audits'][0]);stop,raw=inputs['stops'][row['path_id']]
        row['enumeration_units'][1]['reason_codes']=[]
        self.assertFalse(recompute_completeness(row,stop,raw,inputs['candidate_table'])['dispositions_and_reasons_valid'])
        row=copy.deepcopy(build_audits(inputs)['audits'][0]); row['owner_state']['deck']=['secret']
        self.assertFalse(recompute_completeness(row,stop,raw,inputs['candidate_table'])['information_boundary_valid'])
from proxy_normal_action_candidate_completeness import canonical_bytes, check_materialized
import tempfile

class MaterializationTests(unittest.TestCase):
    def test_canonical_bytes_and_mutation(self):
        self.assertEqual(canonical_bytes({'あ':1}), '{\n  "あ": 1\n}\n'.encode('utf-8'))
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            inputs=load_inputs()
            (folder/'contract.json').write_bytes(canonical_bytes(build_contract()))
            (folder/'audit.json').write_bytes(canonical_bytes(build_audits(inputs)))
            self.assertEqual(check_materialized(folder,inputs),[])
            (folder/'audit.json').write_bytes((folder/'audit.json').read_bytes()+b'\n')
            self.assertIn('audit bytes',check_materialized(folder,inputs))

    def test_protocol_only_json_shapes(self):
        contract=build_contract(); audit=build_audits(load_inputs())
        self.assertEqual((len(contract),len(audit)),(14,10))
        self.assertTrue(all(len(row)==19 for row in audit['audits']))
        self.assertEqual(audit['summary'],contract['scope'])
class BoardAbilityTests(unittest.TestCase):
    def test_board_ability_must_have_canonical_classification(self):
        inputs=load_inputs();stop=inputs['stops']['order-01-b-first'][0]
        view=project_normal_action_information(stop);view['cards']['B-017#1']['card_id']='P-unknown'
        with self.assertRaisesRegex(ValueError,'unresolved_canonical_predicate'):
            expand_units(view,inventory_sources(view),inputs['candidate_table'])

    def test_chameleon_is_continuous_and_cat_ceo_trigger_is_past(self):
        inputs=load_inputs()
        for path in EXPECTED:
            view=project_normal_action_information(inputs['stops'][path][0]); units=expand_units(view,inventory_sources(view),inputs['candidate_table'])
            for row in [x for x in units if x['source_family']=='board_card_action']:
                self.assertEqual(row['action_type'],'board_passive')
                self.assertIn(row['card_id'],{'C-chameleon','P-cat_ceo'})
class EmptySyntheticTests(unittest.TestCase):
    def test_no_partner_and_terminal_partner_explain_family(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-02-a-first'][0]); units=expand_units(view,inventory_sources(view),inputs['candidate_table'])
        relationship=[u for u in units if u['source_family']=='relationship_progress']
        self.assertEqual(len(relationship),1)
        self.assertEqual(adjudicate_units(view,relationship,build_contract())[0]['reason_codes'][0],'relationship_partner_absent')
        view['players']['A']['board']['partner']='A-017#1';view['players']['A']['board']['partner_stage']='married'; view['cards']['A-017#1']={'card_id':'P-cat_ceo','initial_instance_id':'A-017#1','card_copy_id':'A-017'}
        units=expand_units(view,inventory_sources(view),inputs['candidate_table'])
        terminal=[u for u in units if u['source_family']=='relationship_progress']
        self.assertEqual(len(terminal),1)
        self.assertIn('relationship_state_terminal',adjudicate_units(view,terminal,build_contract())[0]['reason_codes'])
class ContractRegistryDetailTests(unittest.TestCase):
    def test_machine_readable_contract_has_source_and_unit_schema(self):
        c=build_contract()
        self.assertGreaterEqual(len(c['source_contracts']),6)
        self.assertEqual([x['family'] for x in c['source_family_registry']], ['standing_pass','hand_card_action','board_card_action','reservation_action','normal_challenge','relationship_progress'])
        self.assertEqual(c['enumeration_unit_schema']['fields'], ['enumeration_unit_id','source_family','source_id','source_zone','source_instance_id','card_id','action_type','candidate_variant','target_instance_ids','disposition','candidate_id','reason_codes','evidence','source_references'])
        self.assertTrue(all(x['code'] in ('pass','birth') and x['grammar'] for x in c['candidate_id_registry']))

class DesignCheckerIntegrationTests(unittest.TestCase):
    def test_checker_reports_checkpoint_121_separately(self):
        import subprocess, sys
        checker=Path(__file__).with_name('check-design-data.py')
        result=subprocess.run([sys.executable,str(checker)],text=True,capture_output=True)
        output=json.loads(result.stdout)
        self.assertEqual(output['checkpoint_121']['dedicated_test_count'],38)
        self.assertEqual(output['checkpoint_121']['canonical_bytes_valid'],True)
        self.assertEqual(output['proxy_test_count'],263)
class EmptyFamilyStopTests(unittest.TestCase):
    def test_empty_hand_without_existing_reason_stops(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-01-b-first'][0]);view['players']['B']['hand']=[]
        with self.assertRaisesRegex(ValueError,'missing_exclusion_reason'):
            inventory_sources(view)
class EvidenceBoundaryTests(unittest.TestCase):
    def test_forbidden_information_in_unit_evidence_flips_boundary(self):
        inputs=load_inputs(); row=copy.deepcopy(build_audits(inputs)['audits'][0]); stop,raw=inputs['stops'][row['path_id']]
        row['enumeration_units'][0]['evidence']['future_draw']='secret'
        self.assertFalse(recompute_completeness(row,stop,raw,inputs['candidate_table'])['information_boundary_valid'])
class ReviewerRegressionTests(unittest.TestCase):
    def test_opponent_reservation_is_not_projected(self):
        stop=copy.deepcopy(load_inputs()['stops']['order-01-b-first'][0])
        stop['game_state']['players']['A']['reservations']=[{'secret':'future'}]
        view=project_normal_action_information(stop, public_history={'normal_challenge_losses_by_actor':[], 'last_valid_event_seq':5,'source_refs':[]})
        self.assertNotIn('reservations',view['players']['A'])
        self.assertNotIn('secret',str(view))

    def test_hand_only_board_ability_must_stop(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-01-b-first'][0])
        view['cards']['B-011#1']['card_id']='C-cat_friend'
        units=expand_units(view,inventory_sources(view),inputs['candidate_table'])
        with self.assertRaisesRegex(ValueError,'missing_exclusion_reason'):
            adjudicate_units(view,units,build_contract())

    def test_board_count_predicate_must_not_be_guessed(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-01-b-first'][0])
        view['cards']['B-037#1']['card_id']='G-area-claim'
        units=expand_units(view,inventory_sources(view),inputs['candidate_table'])
        with self.assertRaisesRegex(ValueError,'missing_exclusion_reason'):
            adjudicate_units(view,units,build_contract())

    def test_each_exclusion_reason_has_required_evidence(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-01-b-first'][0])
        units=adjudicate_units(view,expand_units(view,inventory_sources(view),inputs['candidate_table']),build_contract())
        registry={r['code']:r for r in build_contract()['reason_code_registry']}
        for u in units:
            for reason in u['reason_codes']:
                self.assertTrue(set(registry[reason]['required_evidence_fields']) <= u['evidence'].keys(),(reason,u['evidence']))
class ContractStopAuditTests(unittest.TestCase):
    def test_missing_template_saved_as_incomplete_contract_stop(self):
        inputs=load_inputs(); inputs['candidate_table']=copy.deepcopy(inputs['candidate_table']); inputs['candidate_table']['cards']=[c for c in inputs['candidate_table']['cards'] if c['card_id']!='M-antlion-01']
        audit=build_audits(inputs)
        self.assertFalse(audit['audits'][1]['candidate_set_complete'])
        self.assertIn('missing_candidate_template',audit['audits'][1]['contract_stop_codes'])
        self.assertEqual(validate_audit(audit,inputs),[])
class TemplateReferenceTests(unittest.TestCase):
    def test_missing_source_reference_stops(self):
        inputs=load_inputs();view=project_normal_action_information(inputs['stops']['order-01-b-first'][0]);table=copy.deepcopy(inputs['candidate_table'])
        row=next(c for c in table['cards'] if c['card_id']=='M-antlion-01')
        row['actions'][0]['source_text_reference']='missing-file.md#M-antlion-01'
        with self.assertRaisesRegex(ValueError,'unresolved_canonical_predicate'):
            expand_units(view,inventory_sources(view),table)
class PublicHistoryTests(unittest.TestCase):
    def test_117_and_120_saved_steps_prove_no_challenge_loss(self):
        inputs=load_inputs();stop=inputs['stops']['order-01-b-first'][0]
        view=project_normal_action_information(stop)
        self.assertEqual(view['public_history']['normal_challenge_losses_by_actor'],[])
        self.assertEqual(view['public_history']['last_valid_event_seq'],stop['last_valid_event_seq'])
class TemplateSemanticTests(unittest.TestCase):
    def test_main_template_cost_conflicting_with_core_rule_stops(self):
        inputs=load_inputs(); view=project_normal_action_information(inputs['stops']['order-01-b-first'][0]);table=copy.deepcopy(inputs['candidate_table'])
        next(c for c in table['cards'] if c['card_id']=='M-antlion-01')['actions'][0]['base_time_cost']=0
        with self.assertRaisesRegex(ValueError,'unresolved_canonical_predicate'):
            expand_units(view,inventory_sources(view),table)
