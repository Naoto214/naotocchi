"""Checkpoint 126: preserve 125 while correcting and proving current turn end."""
import copy
import tempfile
import unittest
from pathlib import Path

import proxy_current_turn_end_correction as current_126


class CurrentTurnEndTests(unittest.TestCase):
    def test_missing_or_one_byte_changed_json_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)
            self.assertTrue(current_126.check_outputs(target))
            current_126.write_outputs(target)
            self.assertEqual(current_126.check_outputs(target),[])
            name=current_126.PLAN_FILE
            (target/name).write_bytes((target/name).read_bytes()+b' ')
            self.assertIn(name,' '.join(current_126.check_outputs(target)))

    def test_replay_validator_rejects_false_balance_or_event_hash(self):
        outcomes=current_126.run_all(self.inputs)
        self.assertEqual(current_126.validate_outcomes(outcomes,self.inputs),[])
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['events'][0]['game_state_after_sha256']='0'*64
        self.assertTrue(current_126.validate_outcomes(forged,self.inputs))
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['counts_as_independent_balance_sample']=True
        self.assertTrue(current_126.validate_outcomes(forged,self.inputs))

    @classmethod
    def setUpClass(cls):
        cls.inputs=current_126.load_sources()

    def test_protected_125_raw_and_new_closed_window(self):
        for path,source in self.inputs['stops'].items():
            self.assertNotEqual(source['final_state']['return_target'],'turn_end')
            corrected=current_126.correct_window(path,self.inputs)
            self.assertEqual(corrected['final_state']['return_target'],'turn_end')
            self.assertEqual(corrected['last_valid_event_seq'],source['last_valid_event_seq'])
            self.assertEqual(corrected['events'][:-1],source['events'][:-1])
            self.assertEqual(corrected['decisions'],source['decisions'])
            self.assertNotEqual(corrected['continuation_state_sha256'],source['continuation_state_sha256'])

    def test_corrupt_source_raw_is_integrity_error(self):
        altered=copy.deepcopy(self.inputs)
        path='order-01-a-first'
        altered['raw_stops'][path]+=b' '
        with self.assertRaises(ValueError):
            current_126.correct_window(path,altered)

    def test_full_history_proves_six_stages_and_twelve_checks(self):
        for path in self.inputs['stops']:
            history=current_126.verified_history(path,self.inputs)
            proof=current_126.derive_current_provenance(history)
            corrected=current_126.correct_window(path,self.inputs)
            audit=current_126.audit_current_turn_end(corrected,proof)
            self.assertEqual(proof['unresolved_codes'],[])
            self.assertEqual(proof['growth_reach_100'],[])
            self.assertEqual(audit['contract_stop_codes'],[])
            self.assertTrue(audit['turn_end_set_complete'])
            self.assertTrue(all(audit['completeness_checks'].values()))
            self.assertEqual(current_126.validate_current_turn_end(audit,path,self.inputs),[])

    def test_saved_boolean_or_intermediate_hash_never_becomes_proof(self):
        path='order-01-a-first'
        history=current_126.verified_history(path,self.inputs)
        corrupted=copy.deepcopy(history)
        corrupted['events'][-2]['game_state_after_sha256']='0'*64
        with self.assertRaises(ValueError):
            current_126.derive_current_provenance(corrupted)
        proof=current_126.derive_current_provenance(history)
        audit=current_126.audit_current_turn_end(current_126.correct_window(path,self.inputs),proof)
        audit['turn_end_set_complete']=False
        self.assertTrue(current_126.validate_current_turn_end(audit,path,self.inputs))

    def test_four_routes_advance_only_when_current_end_proven(self):
        outcomes=current_126.run_all(self.inputs)
        self.assertEqual(set(outcomes),set(self.inputs['stops']))
        for path,result in outcomes.items():
            source=self.inputs['stops'][path]
            self.assertGreater(result['last_valid_event_seq'],source['last_valid_event_seq'])
            self.assertEqual(result['audits'][0]['turn_end_set_complete'],True)
            self.assertFalse(result['counts_as_independent_balance_sample'])
            self.assertIsNone(result['winner'])
            self.assertEqual(result['final_state']['game_state']['round'],2)

    def test_one_unknown_provenance_stops_independently(self):
        from unittest import mock
        original=current_126.derive_current_provenance
        def unknown(history):
            proof=original(history)
            if history['corrected_source']['path_id']=='order-01-a-first':
                proof['unresolved_codes']=['unresolved_effect_provenance']
            return proof
        with mock.patch.object(current_126,'derive_current_provenance',unknown):
            outcomes=current_126.run_all(self.inputs)
        self.assertEqual(outcomes['order-01-a-first']['last_valid_event_seq'],
                         self.inputs['stops']['order-01-a-first']['last_valid_event_seq'])
