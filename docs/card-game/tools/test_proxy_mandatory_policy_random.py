"""Synthetic unit inputs only: no OS entropy, experiment orders, games or samples."""
import copy
import hashlib
import json
import unittest
from unittest.mock import patch
import proxy_mandatory_policy_random as policy

ROOT_HEX = bytes(range(32)).hex()  # Fixed synthetic bytes, never a population seed.
CONTEXT = dict(protocol_id='unit-test-only', group_id='synthetic', owner='A',
               mirror_side='A_first',
               opportunity_address=['A', 1, 'A', 'turn_start', 0,
                                    'egg_exchange_bottom', 'selection', 0])
IDS = ['copy-' + str(i) for i in range(1, 8)]


def reference_mac(key, message):
    # Independent HMAC construction, does not call the implementation's helpers.
    padded = key + bytes(64-len(key))
    inner = hashlib.sha256(bytes(x ^ 0x36 for x in padded) + message).digest()
    return hashlib.sha256(bytes(x ^ 0x5c for x in padded) + inner).digest()


class RandomTests(unittest.TestCase):
    def test_exact_messages_and_reference_mac(self):
        result = policy.build_proof(ROOT_HEX, CONTEXT, IDS)
        mirror = b'["MRP.v1/mirror","unit-test-only","synthetic","A","A_first"]'
        candidate_bytes = b'["copy-1","copy-2","copy-3","copy-4","copy-5","copy-6","copy-7"]'
        digest = hashlib.sha256(candidate_bytes).hexdigest()
        draw = ('["MRP.v1/draw","mandatory_random_policy.v1",'
                '["A",1,"A","turn_start",0,"egg_exchange_bottom","selection",0],'
                '"' + digest + '",7,0]').encode()
        key = reference_mac(bytes(range(32)), mirror)
        block = reference_mac(key, draw)
        proof = result['random_proof']
        self.assertEqual(proof['mirror_message_hex'], mirror.hex())
        self.assertEqual(proof['draw_blocks'], [dict(counter=0, message_hex=draw.hex(), digest_hex=block.hex())])
        self.assertEqual(result['selected_candidate'], IDS[int.from_bytes(block, 'big') % 7])
        self.assertEqual(result['strategy_basis'], 'unproved')
        self.assertTrue(result['strategic_unproven'])

    def test_mirror_and_chooser_binding(self):
        a = policy.build_proof(ROOT_HEX, CONTEXT, IDS)
        ctx = copy.deepcopy(CONTEXT); ctx['mirror_side'] = 'B_first'
        b = policy.build_proof(ROOT_HEX, ctx, IDS)
        self.assertNotEqual(a['random_proof']['mirror_message_hex'], b['random_proof']['mirror_message_hex'])
        self.assertEqual(a, policy.build_proof(ROOT_HEX, CONTEXT, IDS))
        self.assertFalse(policy.validate_proof(a, ROOT_HEX, ctx, IDS)['randomness_verified'])
        ctx['owner'] = 'B'
        with self.assertRaises(ValueError):
            policy.build_proof(ROOT_HEX, ctx, IDS)

    def test_rejection_boundary_and_exhaustion(self):
        limit = 2**256 - 2  # 2**256 modulo 7 == 2
        self.assertEqual(policy.rejection_index((limit-1).to_bytes(32,'big'), 7), 6)
        self.assertIsNone(policy.rejection_index(limit.to_bytes(32,'big'), 7))
        self.assertEqual(policy.rejection_index(bytes([255])*32, 8), 7)
        with patch.object(policy, 'MAX_COUNTER', 1), patch.object(policy.hmac, 'digest', return_value=bytes([255])*32):
            with self.assertRaises(policy.RandomnessExhausted):
                policy.build_proof(ROOT_HEX, CONTEXT, IDS)

    def test_singleton_does_not_claim_strategy_comparison(self):
        result = policy.build_proof(ROOT_HEX, CONTEXT, ['copy-1'])
        self.assertIsNone(result['random_proof'])
        self.assertEqual(result['selection_basis'], 'supplied_singleton')
        self.assertEqual(result['strategy_basis'], 'singleton_completeness_unverified')
        self.assertIsNone(result['strategic_unproven'])
        self.assertFalse(result['optimality_claim'])

    def test_tampering_every_proof_component_is_rejected(self):
        original = policy.build_proof(ROOT_HEX, CONTEXT, IDS)
        self.assertTrue(policy.validate_proof(original, ROOT_HEX, CONTEXT, IDS)['randomness_verified'])
        for field in original:
            changed = copy.deepcopy(original); changed[field] = None
            with self.subTest(field=field):
                self.assertFalse(policy.validate_proof(changed, ROOT_HEX, CONTEXT, IDS)['randomness_verified'])
        for field in original['random_proof']:
            changed = copy.deepcopy(original); changed['random_proof'][field] = None
            self.assertFalse(policy.validate_proof(changed, ROOT_HEX, CONTEXT, IDS)['randomness_verified'])
        changed = copy.deepcopy(original); changed['random_proof']['draw_blocks'][0]['counter'] = 1
        self.assertFalse(policy.validate_proof(changed, ROOT_HEX, CONTEXT, IDS)['randomness_verified'])
        changed = copy.deepcopy(original); changed['selected_index'] = True
        self.assertFalse(policy.validate_proof(changed, ROOT_HEX, CONTEXT, IDS)['randomness_verified'])
        self.assertFalse(policy.validate_proof(original, '00'*32, CONTEXT, IDS)['randomness_verified'])

    def test_input_constraints_reject_scope_extension(self):
        bad_contexts = []
        for field, value in [('owner','C'),('mirror_side',False),('group_id',''),('attempt_id','retry'),('hidden_state_hash','abc')]:
            c = copy.deepcopy(CONTEXT); c[field] = value; bad_contexts.append(c)
        for index, value in [(1,True),(3,'response'),(4,1),(5,'reaction_or_pass'),(6,'unknown'),(7,1)]:
            c = copy.deepcopy(CONTEXT); c['opportunity_address'][index] = value; bad_contexts.append(c)
        for c in bad_contexts:
            with self.subTest(c=c), self.assertRaises(ValueError):
                policy.build_proof(ROOT_HEX, c, IDS)
        for ids in [[], list(reversed(IDS)), ['a','a'], [''], [True], ['\ud800']]:
            with self.subTest(ids=repr(ids)), self.assertRaises(ValueError):
                policy.build_proof(ROOT_HEX, CONTEXT, ids)
        for root in ['00'*16, ROOT_HEX.upper(), 1, 'gg'*32]:
            with self.subTest(root=root), self.assertRaises(ValueError):
                policy.build_proof(root, CONTEXT, IDS)

if __name__ == '__main__':
    unittest.main()
