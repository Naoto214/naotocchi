import copy
import gzip
import json
import unittest
from unittest.mock import patch
import proxy_continuation_state as state
import proxy_continuation_actions as actions
import proxy_continuation_candidates as candidates
from test_proxy_continuation_state import fixture
from pathlib import Path
import proxy_resource_value_trajectory as old
import proxy_continuation_end_runner as previous
import proxy_continuation_conditions as conditions
try:
    import proxy_continuation_condition_runner as runner
except ImportError:
    runner=None

class ConditionRunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=old.load_initial_routes()
        cls.saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-end-434/paired.json.gz').read_bytes()))['results']
        if runner:cls.runs=[runner.run_route(i,p) for i in cls.initials for p in old.POLICIES]
    def setUp(self):self.assertIsNotNone(runner,'opt-in shared condition runner absent')
    def test_all_eight_same_inputs_explicit_coverage_and_missing_outcomes(self):
        self.assertEqual(len({r['run_id'] for r in self.runs}),8)
        for r in self.runs:
            self.assertEqual(r['coverage_revision'],runner.COVERAGE);self.assertEqual(r['initial_raw_sha256'],old.INITIAL_SHA)
            self.assertFalse(r['policy_promoted']);self.assertEqual(r['independent_balance_sample_count'],0)
            if not r['completed']:self.assertIsNone(r['result']['winner'])
    def test_actual_non_eight_start_boundary_advances_with_saved_exclusion_proof(self):
        r=next(r for r in self.runs if r['path_id']=='probe-01-b-first' and r['policy_id']==old.POLICIES[1])
        self.assertGreater(r['last_valid_event_seq'],24)
        records=[d for d in r['decisions'] if d['event_seq']==24];self.assertEqual(len(records),1)
        evidence=runner.condition_proofs(r);self.assertTrue(any(e['event_seq']==24 and e['proof']['card_id']=='E-final-time' and e['proof']['observations']=={'round':2,'main_stage':1} for e in evidence))
    def test_default_434_replay_is_exact_after_scope(self):
        for initial in self.initials:
            for policy in old.POLICIES:
                before=next(r for r in self.saved if r['path_id']==initial['path_id'] and r['policy_id']==policy)
                self.assertEqual(previous.run_route(initial,policy),before)
    def test_initial_replay_rejects_forged_condition_evidence(self):
        r=next(r for r in self.runs if r['path_id']=='probe-01-b-first' and r['policy_id']==old.POLICIES[1]);i=self.initials[1]
        self.assertEqual(runner.validate_route(r,i,r['policy_id']),[])
        bad=copy.deepcopy(r);proofs=runner.condition_proofs(bad);self.assertTrue(proofs)
        # condition_proofs returns the actual saved nested proof, not a rebuilt copy.
        proofs[0]['proof']['status']='possible'
        self.assertTrue(runner.validate_route(bad,i,r['policy_id']))

class FullStateProofTests(unittest.TestCase):
    def test_equipment_projection_cannot_manufacture_unmet_prerequisite(self):
        source,seq=fixture();before=state.create(source,seq)
        action=next(d for d in candidates.audit(before,[])['legal_candidate_details'] if d['action_type']=='attach_item')
        envelope,events=actions.attach(before,action);g=envelope['legacy_continuation']['game_state'];owner=g['players']['A']
        owner['time']=1;g['cards'][owner['hand'][0]]['card_id']='G-asteroids-classic'
        events[-1].update(game_state_after_sha256=old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=old.start._hash(state.current(envelope)))
        saved=copy.deepcopy(envelope);original=actions.response_inventory
        def response_only(initial,policy):return actions.response_inventory(envelope,{},events)
        with patch.object(previous,'run_route',side_effect=response_only):
            with self.assertRaisesRegex(ValueError,'full public state'):runner.run_route({'path_id':'unit-response'},old.POLICIES[1])
        self.assertEqual(envelope,saved);self.assertIs(actions.response_inventory,original)
    def test_full_result_boolean_integer_substitution_is_rejected(self):
        saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-conditions-435/paired.json.gz').read_bytes()))['results'][0]
        bad=copy.deepcopy(saved);bad['completed']=0
        # Bound the expensive reconstruction, exercise the real replay comparator.
        with patch.object(runner,'run_route',return_value=saved):self.assertTrue(runner.validate_route(bad,{},old.POLICIES[0]))

if __name__=='__main__':unittest.main()
