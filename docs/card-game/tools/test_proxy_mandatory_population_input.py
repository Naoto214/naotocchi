"""In-memory structural doubles reuse historical orders; never new samples."""
import copy
import hashlib
import json
from pathlib import Path
import unittest
from proxy_mandatory_policy_contract import canonical
try:
    import proxy_mandatory_population_input as api
except ImportError:
    api=None

ROOT=Path(__file__).resolve().parents[1]
FIXED_ROOT='00'*32


def bundle():
    import proxy_population_contract as old
    import proxy_mandatory_policy_contract as approved
    plan=json.loads((ROOT/'data/proxy-normal-decision-first-choice-plan-115-20260918.json').read_text())
    players={p['player_id']:p for p in plan['orders'][0]['players']}
    contract=json.loads((ROOT/old.PROTOCOL_PATH).read_text())
    groups=[];matches=[];order=[];roots={}
    policies=dict(normal='114_with_116',mandatory='mandatory_random_policy.v1',response='119')
    for n in range(1,201):
        gid='test-'+str(n);g=dict(group_id=gid,generation_attempt_ref='historical-test-only')
        for a in 'AB':
            g['seed_'+a]=players[a]['seed'];g['full_order_'+a]=copy.deepcopy(players[a]['deck_order_top_to_bottom'])
        groups.append(g);roots[gid]=dict(A=FIXED_ROOT,B=FIXED_ROOT)
        for a in 'AB':
            initial=dict(first_player=a,players=[dict(player_id=o,deck_order_top_to_bottom=g['full_order_'+o]) for o in 'AB'])
            digest=hashlib.sha256(old.canonical(initial)).hexdigest()
            row=dict(match_id=gid+a,group_id=gid,first_player=a,input_sha256=digest,policy_versions=copy.deepcopy(policies))
            # Independently encode the specified row binding, not the production builder.
            payload=dict(protocol_id='policy_conditional_population.v1',group_id=gid,match_id=gid+a,
                         mirror_side=a+'_first',initial_input_sha256=digest,policy_versions=policies,
                         root_commitments={o:hashlib.sha256(bytes(32)).hexdigest() for o in 'AB'})
            row['policy_input_sha256']=hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
            matches.append(row)
        order.extend(gid+a for a in ('AB' if n%2 else 'BA'))
    return dict(schema='policy_conditional_population_manifest.v1',protocol_id='policy_conditional_population.v1',
                protocol_sha256=old.PROTOCOL_SHA256,mandatory_contract_sha256=approved.CONTRACT_SHA256,
                groups=groups,matches=matches,execution_order=order,policy_roots=roots,
                source_versions=contract['sources_sha256'],python_version='historical-test-only',
                historical_registry_sha256='0'*64,generation_provenance={},lock_evidence={})


class InputTests(unittest.TestCase):
    def setUp(self):self.assertIsNotNone(api,'policy population input validator missing')

    def test_all_rows_bind_shared_orders_to_side_separated_policy_material(self):
        b=bundle();before=copy.deepcopy(b)
        out=api.audit_input_bundle(b)
        self.assertTrue(out['structure_verified'],out['errors'])
        self.assertEqual(b,before)
        self.assertFalse(out['input_lock_verified']);self.assertFalse(out['ready_for_execution'])
        self.assertIsNone(out['balance_admitted'])
        self.assertEqual(out['planned_groups'],200);self.assertEqual(out['planned_matches'],400)
        self.assertNotEqual(b['matches'][0]['policy_input_sha256'],b['matches'][1]['policy_input_sha256'])
        self.assertIn('generation_provenance_verifier_unavailable',out['gaps'])

    def test_root_count_type_owner_group_and_row_commitment_must_match(self):
        mutations=[lambda b:b['policy_roots'].pop('test-200'),
                   lambda b:b['policy_roots']['test-1'].pop('B'),
                   lambda b:b['policy_roots']['test-1'].update(C=FIXED_ROOT),
                   lambda b:b['policy_roots']['test-1'].update(A='01'*32),
                   lambda b:b['policy_roots']['test-1'].update(A=0),
                   lambda b:b['policy_roots']['test-1'].update(A='00'*16),
                   lambda b:b['matches'][1].update(policy_input_sha256=b['matches'][0]['policy_input_sha256'])]
        original=bundle()
        for mutate in mutations:
            b=copy.deepcopy(original);mutate(b)
            self.assertFalse(api.audit_input_bundle(b)['structure_verified'])

    def test_old_fallback_policy_and_normal_response_policy_changes_rejected(self):
        original=bundle()
        for key,value in [('mandatory','existing_contracts_with_116'),('normal','new'),('response','new')]:
            b=copy.deepcopy(original);b['matches'][0]['policy_versions'][key]=value
            self.assertFalse(api.audit_input_bundle(b)['structure_verified'])
        for field,value in [('schema','planned_population_manifest_future_v1_spec_only'),
                            ('protocol_id','other'),('mandatory_contract_sha256','0'*64),('approved',True)]:
            b=copy.deepcopy(original);b[field]=value
            self.assertFalse(api.audit_input_bundle(b)['structure_verified'])

    def test_topology_and_orders_cannot_change_to_accommodate_results(self):
        original=bundle()
        mutations=[lambda b:b['matches'].pop(),lambda b:b['execution_order'].reverse(),
                   lambda b:b['groups'][0]['full_order_A'].reverse(),
                   lambda b:b['groups'][0].update(seed_A=True),
                   lambda b:b.update(results=[{'winner':'A'}])]
        for mutate in mutations:
            b=copy.deepcopy(original);mutate(b)
            self.assertFalse(api.audit_input_bundle(b)['structure_verified'])

    def test_root_coincidences_and_zero_do_not_trigger_unauthorized_redraw(self):
        b=bundle();out=api.audit_input_bundle(b)
        self.assertTrue(out['structure_verified'])
        self.assertEqual(out['root_value_coincidences'],399)
        self.assertEqual(out['zero_root_count'],400)
        self.assertFalse(out['provenance_verified'])
        # Neither a boolean nor a hash proves external lock/independent sampling.
        b['lock_evidence']={'approved':True,'before_outcomes':True}
        b['generation_provenance']={'independent':True}
        out=api.audit_input_bundle(b)
        self.assertFalse(out['input_lock_verified']);self.assertFalse(out['provenance_verified'])
        self.assertFalse(out['ready_for_input_generation'])

    def test_malformed_inputs_return_errors_without_traceback(self):
        for b in (None,[],{},dict(bundle(),groups=[None]),dict(bundle(),matches=[None])):
            self.assertFalse(api.audit_input_bundle(b)['structure_verified'])

if __name__=='__main__':unittest.main()

class SourceTests(unittest.TestCase):
    def test_structure_rejects_changed_validation_dependency(self):
        import tempfile,shutil
        import proxy_population_contract as old
        import proxy_mandatory_policy_contract as approved
        import proxy_mandatory_choice_boundary as boundary
        manifests=[old.PROTOCOL_PATH,approved.CONTRACT_PATH,boundary.SOURCES]
        names=set(manifests)
        for name in manifests:names.update(json.loads((ROOT/name).read_text())['sources_sha256'])
        names.add('tools/proxy_population_contract.py')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for name in names:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            b=bundle()
            self.assertTrue(api.audit_input_bundle(b,root)['structure_verified'])
            path=root/'tools/proxy_population_contract.py';path.write_text(path.read_text()+'\n# changed dependency\n')
            self.assertFalse(api.audit_input_bundle(b,root)['structure_verified'])

class BindingTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'build_bound_local_record'),'bundle-to-choice binding missing')

    def test_match_side_and_chooser_root_are_derived_from_bundle(self):
        from test_proxy_mandatory_choice_boundary import frame
        from test_proxy_mandatory_policy_local import context
        b=bundle();f=frame('ability_hand_bottom');f['game_state']['turn_player']='B'
        address=context('ability_hand_bottom')['opportunity_address'];address[0]='B'
        # Distinct synthetic owner roots catch use of turn owner's root.
        b['policy_roots']['test-1']['B']='11'*32
        for row in b['matches'][:2]:
            payload=dict(protocol_id=b['protocol_id'],group_id=row['group_id'],match_id=row['match_id'],
                         mirror_side=row['first_player']+'_first',initial_input_sha256=row['input_sha256'],
                         policy_versions=row['policy_versions'],root_commitments={
                             a:hashlib.sha256(bytes.fromhex(b['policy_roots']['test-1'][a])).hexdigest() for a in 'AB'})
            row['policy_input_sha256']=hashlib.sha256(canonical(payload)).hexdigest()
        a=api.build_bound_local_record(b,'test-1A',f,address)
        other=api.build_bound_local_record(b,'test-1B',f,address)
        self.assertEqual(a['local_record']['supplied_root_commitment'],hashlib.sha256(bytes(32)).hexdigest())
        self.assertEqual(a['local_record']['context']['mirror_side'],'A_first')
        self.assertEqual(other['local_record']['context']['mirror_side'],'B_first')
        self.assertNotEqual(a['local_record']['arithmetic_proof']['random_proof']['mirror_message_hex'],
                            other['local_record']['arithmetic_proof']['random_proof']['mirror_message_hex'])
        v=api.audit_bound_local_record(a,b,'test-1A',f,address)
        self.assertTrue(v['binding_and_local_record_verified'])
        self.assertIsNone(v['policy_eligible']);self.assertFalse(v['input_lock_verified'])

    def test_swap_bundle_match_evidence_or_unsupported_scope_is_rejected(self):
        from test_proxy_mandatory_choice_boundary import frame
        from test_proxy_mandatory_policy_local import context
        b=bundle();f=frame();address=context()['opportunity_address']
        r=api.build_bound_local_record(b,'test-1A',f,address)
        self.assertFalse(api.audit_bound_local_record(r,b,'test-1B',f,address)['binding_and_local_record_verified'])
        bad=copy.deepcopy(r);bad['local_record']['policy_eligible']=True
        self.assertFalse(api.audit_bound_local_record(bad,b,'test-1A',f,address)['binding_and_local_record_verified'])
        b['generation_provenance']={'changed':True}
        self.assertFalse(api.audit_bound_local_record(r,b,'test-1A',f,address)['binding_and_local_record_verified'])
        with self.assertRaises(ValueError):api.build_bound_local_record(b,'unplanned',f,address)
        b['matches'].pop()
        with self.assertRaises(ValueError):api.build_bound_local_record(b,'test-1A',f,address)
