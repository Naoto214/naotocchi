import copy
import gzip
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_capabilities as caps
try:
    import proxy_continuation_worlds as worlds
except ImportError:
    worlds=None

class WorldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-capabilities-436/paired.json.gz').read_bytes()))
    def setUp(self):
        self.assertIsNotNone(worlds,'shared world placement proof absent')
        self.e=copy.deepcopy(self.saved['results'][0]['final_envelope'])
    def action(self):
        return next(a for a in candidates.audit(self.e,[])['legal_candidate_details'] if a['action_type']=='place_world')
    def test_continuous_classification_binds_text_and_cost(self):
        p=worlds.classification('W-deepsea')
        self.assertEqual((p['kind'],p['timing'],p['payment_time']),('continuous','while_own_hand_at_most_two',2))
        self.assertFalse(p['arrival_trigger'])
        self.assertEqual(len(p['source_raw_sha256']),64)
    def test_actual_proof_does_not_certify_future_effects_or_free_development(self):
        p=worlds.placement_certificate(self.e,self.action())
        self.assertEqual((p['actor'],p['source_instance_id'],p['payment_time'],p['certain_growth_difference']),('B','B-022#1',2,0))
        self.assertFalse(p['future_continuous_execution_certified'])
        self.assertFalse(p['safe_free_development_certified'])
    def test_forged_source_target_cost_or_reference_rejected(self):
        for edit in ('source','target','cost','reference','id'):
            a=self.action()
            if edit=='source':a['source_instance_id']='B-001#1'
            elif edit=='target':a['target_instance_ids']=['A-001#1']
            elif edit=='cost':a['evidence']['payment_time']=True
            elif edit=='reference':a['source_references']=['01-core-rules.md']
            else:a['candidate_id']='forged'
            with self.subTest(edit=edit),self.assertRaises(ValueError):worlds.placement_certificate(self.e,a)
    def test_unknown_city_trigger_is_not_zero_scored(self):
        a=self.action();a['card_id']='W-city'
        with self.assertRaises(ValueError):worlds.placement_certificate(self.e,a)
    def test_source_cost_contradiction_rejected(self):
        name='89-world-13-card-text-draft.md';text=(rules.ROOT/name).read_text()
        start=text.index('### W-deepsea ');end=text.index('\n### ',start+1)
        changed=text[:start]+text[start:end].replace('時：2','時：3')+text[end:]
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/name).write_text(changed)
            with patch.object(rules,'ROOT',root),self.assertRaises(ValueError):worlds.classification('W-deepsea')
    def test_additional_arrival_trigger_cannot_keep_zero_outcome(self):
        name='89-world-13-card-text-draft.md';text=(rules.ROOT/name).read_text()
        for prefix in ('> ','>','  > ','lazy'):
            extra='このセカイが登場した時、自分のそだち+5。'
            if prefix=='lazy':
                changed=text.replace('> 自分の手札が2枚以下の間、自分のメインのちから・ちえ+1。','> 自分の手札が2枚以下の間、自分のメインのちから・ちえ+1。\n'+extra)
            else:changed=text.replace('### W-deepsea — しんかい','### W-deepsea — しんかい\n\n'+prefix+extra)
            with self.subTest(prefix=prefix),tempfile.TemporaryDirectory() as folder:
                root=Path(folder);(root/name).write_text(changed)
                with patch.object(rules,'ROOT',root),self.assertRaises(ValueError):worlds.classification('W-deepsea')
    def test_complete_scoring_keeps_world_and_main_candidates(self):
        inv=candidates.audit(self.e,[]);before=copy.deepcopy(inv)
        with worlds.scope(),caps.scope():scores,certs=candidates._scores(self.e,inv)
        s=next(s for s in scores if s['candidate_id']==self.action()['candidate_id'])
        self.assertEqual((s['payment_time'],s['time_after_certain_resolution'],s['certain_growth_difference']), (2,1,0))
        self.assertEqual([s['candidate_id'] for s in scores],inv['legal_candidate_ids']);self.assertEqual(inv,before)
        self.assertFalse(any(c['candidate_id']==s['candidate_id'] for c in certs))
    def test_hidden_orders_do_not_change_public_proof(self):
        a=self.action();p=worlds.placement_certificate(self.e,a)
        for owner in self.e['legacy_continuation']['game_state']['players'].values():owner['deck'].reverse()
        self.e['legacy_continuation']['game_state']['players']['A']['hand'].reverse()
        self.assertEqual(worlds.placement_certificate(self.e,a),p)
    def test_atomic_placement_preserves_runtime_and_opens_response(self):
        before=copy.deepcopy(self.e);a=self.action();after,events=worlds.place(self.e,a)
        p=after['legacy_continuation']['game_state']['players']['B']
        self.assertEqual((after['event_seq'],p['time'],p['growth'],p['board']['world']),(54,1,20,'B-022#1'))
        self.assertNotIn('B-022#1',p['hand']);self.assertEqual(after['runtime'],before['runtime'])
        ctx=after['legacy_continuation']['response_context']
        self.assertEqual((ctx['phase'],ctx['priority_actor'],ctx['chain_status']),('response_window','B','empty'))
        self.assertEqual(events[0]['envelope_after_sha256'],state.state_hash(after));self.assertEqual(self.e,before)
        with worlds.scope(),self.assertRaises(ValueError):actions.response_inventory(after,None,events)
    def test_existing_world_and_pending_effects_remain_unproved(self):
        a=self.action();g=self.e['legacy_continuation']['game_state'];p=g['players']['B'];s='B-022#1'
        p['hand'].remove(s);p['board']['world']=s
        with self.assertRaises(ValueError):worlds.placement_certificate(self.e,a)
        self.e=copy.deepcopy(self.saved['results'][0]['final_envelope']);self.e['legacy_continuation']['pending_triggers'].append({'unproved':True})
        with self.assertRaises(ValueError):worlds.placement_certificate(self.e,self.action())
    def test_upper_priority_and_scope_restoration(self):
        original_scores=candidates._scores;original_apply=actions.apply;original_response=actions.response_inventory
        inv=candidates.audit(self.e,[]);self.e['legacy_continuation']['game_state']['players']['B']['growth']=100
        with worlds.scope(),caps.scope(),self.assertRaises(ValueError):candidates._scores(self.e,inv)
        with self.assertRaises(RuntimeError):
            with worlds.scope():
                with worlds.scope():raise RuntimeError('probe')
        self.assertIs(candidates._scores,original_scores);self.assertIs(actions.apply,original_apply);self.assertIs(actions.response_inventory,original_response)
        self.e['legacy_continuation']['game_state']['players']['B']['growth']=20
        with caps.scope(),self.assertRaises(ValueError):candidates._scores(self.e,inv)

if __name__=='__main__':unittest.main()
