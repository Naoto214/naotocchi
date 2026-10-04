"""Mutations test independent linkage, not a second execution of the policy."""
import copy
import unittest
from proxy_replay_evidence_audit import load_saved_path
try:
    import proxy_record_integrity_audit as subject
except ModuleNotFoundError:
    subject = None

class RecordIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        full = load_saved_path('probe-01-a-first')[0]
        cls.example = copy.deepcopy(full)
        cls.example['events'] = full['events'][:2]
        cls.example['snapshots'] = full['snapshots'][:3]
        cls.example['final_envelope'] = full['snapshots'][2]
        cls.example['last_valid_event_seq'] = 4
        cls.example['decisions'] = full['decisions'][:2]

    def setUp(self):
        self.assertIsNotNone(subject, 'record integrity auditor absent')
        self.record = copy.deepcopy(self.example)

    def test_valid_record_is_structural_only_and_nonmutating(self):
        before = copy.deepcopy(self.record)
        out = subject.audit_record(self.record)
        self.assertEqual(out['event_count'], 2)
        self.assertEqual(out['snapshot_count'], 3)
        self.assertEqual(out['explicit_anchor_counts'], {'state_hash_checked': 2})
        self.assertIsNone(out['balance_admitted'])
        self.assertEqual(out['opportunity_coverage'], 'not_certified')
        self.assertEqual(out['rule_transition_legality'], 'not_certified')
        self.assertEqual(self.record, before)

    def test_each_edge_hash_must_match_even_if_replayed_copy_identical(self):
        for prefix in ('envelope', 'game_state', 'continuation_state'):
            for side in ('before', 'after'):
                r = copy.deepcopy(self.record)
                r['events'][0][prefix+'_'+side+'_sha256'] = '0'*64
                with self.subTest(prefix=prefix, side=side), self.assertRaises(ValueError):
                    subject.audit_record(r)

    def test_missing_extra_or_reordered_chain_is_rejected(self):
        for key in ('events', 'snapshots'):
            for op in ('omit', 'extra', 'reverse'):
                r = copy.deepcopy(self.record)
                if op == 'omit': r[key].pop()
                if op == 'extra': r[key].append(copy.deepcopy(r[key][-1]))
                if op == 'reverse': r[key].reverse()
                with self.subTest(key=key, op=op), self.assertRaises(ValueError): subject.audit_record(r)

    def test_nonconsecutive_or_bool_sequences_rejected(self):
        for value in (True, None, 1.0, 7):
            r = copy.deepcopy(self.record); r['events'][0]['seq'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): subject.audit_record(r)
        self.record['snapshots'][0]['event_seq'] = True
        with self.assertRaises(ValueError): subject.audit_record(self.record)

    def test_endpoint_and_contract_mismatch_rejected(self):
        for key in ('initial_envelope', 'final_envelope', 'last_valid_event_seq', 'execution_contract_id'):
            r = copy.deepcopy(self.record); r[key] = None
            with self.subTest(key=key), self.assertRaises(ValueError): subject.audit_record(r)
        self.record['events'][0]['execution_contract_id'] = 'other'
        with self.assertRaises(ValueError): subject.audit_record(self.record)

    def test_missing_explicit_anchor_is_reported_not_invented(self):
        self.record['decisions'].append({'decision_kind':'mandatory_choice', 'selected_candidate':'a'})
        out = subject.audit_record(self.record)
        self.assertEqual(out['explicit_anchor_counts'], {'state_hash_checked':2, 'missing_event_seq':1})
        self.assertEqual(out['decision_anchors'][2]['decision_index'], 2)
        self.assertIsNone(out['decision_anchors'][2]['event_seq'])
        self.assertIsNone(out['decision_anchors'][2]['pre_state_hashes_checked'])

    def test_sequence_only_and_partial_hash_anchors_are_distinct(self):
        d = self.record['decisions'][0]
        del d['pre_game_state_sha256']; del d['pre_continuation_state_sha256']
        out = subject.audit_record(self.record)
        self.assertEqual(out['decision_anchors'][0]['status'], 'sequence_only')
        self.assertEqual(out['decision_anchors'][0]['pre_state_hashes_checked'], [])
        d['pre_continuation_state_sha256'] = self.record['events'][0]['continuation_state_before_sha256']
        out = subject.audit_record(self.record)
        self.assertEqual(out['decision_anchors'][0]['status'], 'partial_state_hash_checked')

    def test_dangling_or_changed_explicit_anchor_rejected(self):
        for key, value in (('event_seq',999), ('event_seq',True), ('event_seq',None),
                           ('event_seq',4), ('pre_game_state_sha256',None),
                           ('pre_continuation_state_sha256','0'*64)):
            r = copy.deepcopy(self.record); r['decisions'][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): subject.audit_record(r)

    def test_runtime_and_card_lookup_remain_hash_bound(self):
        for target in ('runtime','card'):
            r = copy.deepcopy(self.record)
            if target == 'runtime': r['snapshots'][1]['runtime']['attachments']['fake'] = {}
            else:
                cards = r['snapshots'][1]['legacy_continuation']['game_state']['cards']
                cards[next(iter(cards))]['card_id'] = 'different'
            with self.subTest(target=target), self.assertRaises(ValueError): subject.audit_record(r)

    def test_malformed_collections_rejected(self):
        for key in ('events','snapshots','decisions'):
            r = copy.deepcopy(self.record); r[key] = None
            with self.subTest(key=key), self.assertRaises(ValueError): subject.audit_record(r)
        for value in (None, {}, dict(self.record, snapshots=[])):
            with self.subTest(value=type(value).__name__), self.assertRaises(ValueError): subject.audit_record(value)
