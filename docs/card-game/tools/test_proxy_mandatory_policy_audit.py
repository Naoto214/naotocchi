"""A correct arithmetic fragment must never impersonate authenticated game evidence."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import proxy_mandatory_policy_audit as audit
import proxy_mandatory_policy_contract as contract
import proxy_mandatory_policy_random as random_policy
from test_proxy_mandatory_policy_random import ROOT_HEX, CONTEXT, IDS


def fragment():
    return dict(schema='mandatory_policy_fragment_464.v1', decision_kind='mandatory_choice',
                context=copy.deepcopy(CONTEXT), legal_candidate_ids=list(IDS),
                arithmetic_proof=random_policy.build_proof(ROOT_HEX, CONTEXT, IDS))


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.contract = contract.load_json(contract.ROOT / contract.CONTRACT_PATH)

    def test_valid_arithmetic_retains_unproven_gates(self):
        result = audit.audit_fragment(fragment(), ROOT_HEX, self.contract)
        self.assertTrue(result['randomness_verified'])
        self.assertTrue(result['strategic_unproven'])
        self.assertIsNone(result['policy_eligible'])
        self.assertIsNone(result['balance_admitted'])
        self.assertFalse(result['ready_for_input_generation'])
        self.assertFalse(result['ready_for_execution'])
        self.assertEqual(result['disposition'], 'unproved')
        self.assertIn('complete_legal_set_unverified', result['gaps'])
        self.assertIn('origin_obligation_ledger_unverified', result['gaps'])
        self.assertIn('input_lock_unauthenticated', result['gaps'])

    def test_forged_verified_or_legacy_record_cannot_grant_admission(self):
        for field, value in [('policy_eligible',True),('strategic_unproven',False),
                             ('candidate_set_complete',True),('verified',True),
                             ('resolution_mode','seeded_fallback')]:
            f = fragment(); f[field] = value
            result = audit.audit_fragment(f, ROOT_HEX, self.contract)
            self.assertTrue(result['errors'])
            self.assertIsNone(result['policy_eligible'])
        legacy = dict(decision_kind='mandatory_choice', resolution_mode='seeded_fallback',
                      strategic_unresolved=True, reason_code='strategic_unresolved_seeded_fallback')
        self.assertTrue(audit.audit_fragment(legacy, ROOT_HEX, self.contract)['errors'])

    def test_normal_response_unregistered_malformed_and_wrong_root(self):
        for kind in ['normal_action', 'response_action', False, []]:
            f = fragment(); f['decision_kind'] = kind
            self.assertTrue(audit.audit_fragment(f, ROOT_HEX, self.contract)['errors'])
        f = fragment(); f['context']['opportunity_address'][5] = 'unknown'
        self.assertTrue(audit.audit_fragment(f, ROOT_HEX, self.contract)['errors'])
        for bad in [None, [], {'schema':'fake'}]:
            self.assertTrue(audit.audit_fragment(bad, ROOT_HEX, self.contract)['errors'])
        self.assertFalse(audit.audit_fragment(fragment(), '00'*32, self.contract)['randomness_verified'])

    def test_contract_change_or_incomplete_candidates_cannot_be_hidden(self):
        changed = copy.deepcopy(self.contract); changed['admission']['normal_response_changed'] = True
        self.assertFalse(audit.audit_fragment(fragment(), ROOT_HEX, changed)['contract_verified'])
        f = fragment(); f['legal_candidate_ids'].pop()
        self.assertFalse(audit.audit_fragment(f, ROOT_HEX, self.contract)['randomness_verified'])
        # Recomputing arithmetic over a smaller supplied set still proves NO completeness.
        f['arithmetic_proof'] = random_policy.build_proof(ROOT_HEX, f['context'], f['legal_candidate_ids'])
        result = audit.audit_fragment(f, ROOT_HEX, self.contract)
        self.assertTrue(result['randomness_verified'])
        self.assertIsNone(result['policy_eligible'])
        self.assertIn('complete_legal_set_unverified', result['gaps'])

    def test_supplied_singleton_does_not_certify_forced_legal_choice(self):
        f = fragment(); f['legal_candidate_ids'] = ['copy-1']
        f['arithmetic_proof'] = random_policy.build_proof(ROOT_HEX, f['context'], ['copy-1'])
        result = audit.audit_fragment(f, ROOT_HEX, self.contract)
        self.assertIsNone(result['strategic_unproven'])
        self.assertIsNone(result['policy_eligible'])
        self.assertIn('complete_legal_set_unverified', result['gaps'])

    def test_deep_json_cli_is_structured_invalid_not_pending(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / 'deep.json'
            f.write_text('{"x":' + '['*10000 + '0' + ']'*10000 + '}')
            k = Path(tmp) / 'root.json'; k.write_text(json.dumps({'root_hex': ROOT_HEX}))
            result = subprocess.run([sys.executable, audit.__file__, '--fragment', str(f),
                                     '--root-material', str(k)], text=True, capture_output=True)
            self.assertEqual(result.returncode, 2)
            self.assertTrue(json.loads(result.stdout)['errors'])
            self.assertEqual(result.stderr, '')

    def test_cli_nonexecution_and_error_exit_codes(self):
        tool = Path(audit.__file__)
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / 'fragment.json'; f.write_text(json.dumps(fragment()))
            k = Path(tmp) / 'root.json'; k.write_text(json.dumps({'root_hex': ROOT_HEX}))
            result = subprocess.run([sys.executable, str(tool), '--fragment', str(f),
                                     '--root-material', str(k)], text=True, capture_output=True)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIsNone(json.loads(result.stdout)['policy_eligible'])
            self.assertNotIn(ROOT_HEX, result.stdout)
            f.write_text('{"duplicate":1,"duplicate":2}')
            result = subprocess.run([sys.executable, str(tool), '--fragment', str(f),
                                     '--root-material', str(k)], text=True, capture_output=True)
            self.assertEqual(result.returncode, 2)
            self.assertTrue(json.loads(result.stdout)['errors'])
            result = subprocess.run([sys.executable, str(tool), '--execute'], capture_output=True)
            self.assertEqual(result.returncode, 2)

if __name__ == '__main__':
    unittest.main()
