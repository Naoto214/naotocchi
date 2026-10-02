import copy
import gzip
import json
from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_end as end
try:
    import proxy_continuation_capabilities as caps
except ImportError:
    caps=None


class CapabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-conditions-435/paired.json.gz').read_bytes()))
    def setUp(self):
        self.assertIsNotNone(caps,'source-bound future-trigger adapter absent')
        self.e=copy.deepcopy(self.saved['results'][0]['final_envelope'])
    def action(self,card='M-beetle-02'):
        inv=candidates.audit(self.e,[])
        return next(a for a in inv['legal_candidate_details'] if a['card_id']==card and a['action_type']=='play_main')
    def test_beetle_end_trigger_is_not_passive_or_arrival(self):
        c=caps.classification('M-beetle-02')
        self.assertEqual((c['kind'],c['timing'],c['ability_key']),('triggered','own_turn_end','end_topdeck_order'))
        self.assertTrue(c['optional']);self.assertFalse(c['arrival_trigger']);self.assertEqual(c['uses_per_instance_turn'],1)
    def test_antlion_quick_effect_trigger_is_not_normal_activation(self):
        c=caps.classification('M-antlion-06')
        self.assertEqual((c['kind'],c['timing']),('triggered','after_own_quick_effect_applied'))
        self.assertFalse(c['arrival_trigger'])
    def test_birth_certificate_covers_actual_source_and_payment(self):
        a=self.action();before=copy.deepcopy(self.e);p=caps.arrival_certificate(self.e,a)
        self.assertEqual((p['payment_time'],p['certain_growth_difference']), (2,0))
        self.assertEqual(p['source_instance_id'],'B-010#1');self.assertFalse(p['effect_execution_certified'])
        self.assertEqual(p['view_sha256'],state.canonical_sha256(state.visible(self.e,'B')))
        self.assertEqual(self.e,before)
    def test_certificate_rejects_payment_and_card_identity_tampering(self):
        a=self.action()
        for edit in ('cost','source','id'):
            bad=copy.deepcopy(a)
            if edit=='cost':bad['evidence']['payment_time']=1
            elif edit=='source':bad['source_instance_id']='B-001#1'
            else:bad['candidate_id']='invented'
            with self.subTest(edit=edit),self.assertRaises(ValueError):caps.arrival_certificate(self.e,bad)
    def test_unknown_birth_effect_is_not_zero_scored(self):
        a=self.action();a['card_id']='M-beetle-01'
        with self.assertRaises(ValueError):caps.arrival_certificate(self.e,a)
    def test_real_complete_inventory_scores_future_trigger_without_deleting_candidate(self):
        inv=candidates.audit(self.e,[]);before=copy.deepcopy(inv)
        with caps.scope():scores,certs=candidates._scores(self.e,inv)
        beetle=next(s for s in scores if s['candidate_id']==self.action()['candidate_id'])
        self.assertEqual(beetle['time_after_certain_resolution'],0);self.assertEqual(beetle['certain_growth_difference'],0)
        self.assertEqual({s['candidate_id'] for s in scores},set(inv['legal_candidate_ids']));self.assertEqual(inv,before)
        self.assertFalse(any(c['candidate_id']==beetle['candidate_id'] for c in certs))
    def test_hidden_deck_and_opponent_hand_order_do_not_change_certificate(self):
        a=self.action();p=caps.arrival_certificate(self.e,a)
        for owner in self.e['legacy_continuation']['game_state']['players'].values():owner['deck'].reverse()
        self.e['legacy_continuation']['game_state']['players']['A']['hand'].reverse()
        self.assertEqual(caps.arrival_certificate(self.e,a),p)
    def test_future_trigger_is_not_falsely_end_complete(self):
        with caps.scope(),self.assertRaises(ValueError):end.end_classification('M-beetle-02')
    def test_scope_restores_default_on_exception_and_nesting(self):
        original=candidates._scores;registry=copy.deepcopy(rules.CAPABILITIES)
        with self.assertRaises(RuntimeError):
            with caps.scope():
                self.assertEqual(rules.classification('M-beetle-02')['kind'],'triggered')
                with caps.scope():self.assertEqual(rules.classification('M-antlion-06')['kind'],'triggered')
                self.assertEqual(rules.classification('M-beetle-02')['kind'],'triggered');raise RuntimeError('probe')
        self.assertIs(candidates._scores,original);self.assertEqual(rules.CAPABILITIES,registry)
        with self.assertRaises(ValueError):rules.classification('M-beetle-02')
    def test_stage_mismatch_in_canonical_body_stops_classification(self):
        name='31-beetle-stagbeetle-card-master-migration.md'
        text=(rules.ROOT/name).read_text()
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/name).write_text(text.replace('表示：カブトムシ②','表示：カブトムシ①'))
            with patch.object(rules,'ROOT',root),self.assertRaises(ValueError):caps.classification('M-beetle-02')

    def test_main_transition_with_attached_old_main_stays_unproved(self):
        g=self.e['legacy_continuation']['game_state'];p=g['players']['B']
        p['hand'].remove('B-001#1');p['board']['main']='B-001#1'
        source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-bowtie')
        p['deck'].remove(source);p['board']['prepared'].append(source)
        self.e['runtime']['attachments'][source]=dict(controller='B',target_instance_id='B-001#1',attached_event_seq=31)
        self.e['runtime']['public_prepared'][source]=dict(controller='B',face_up=True,paid_time=2,placed_event_seq=31)
        a=self.action()
        with self.assertRaisesRegex(ValueError,'departure equipment'):caps.arrival_certificate(self.e,a)

    def test_world_and_upper_priority_unknowns_still_stop(self):
        a=self.action();g=self.e['legacy_continuation']['game_state'];p=g['players']['B']
        p['growth']=100
        with caps.scope(),self.assertRaises(ValueError):candidates._scores(self.e,candidates.audit(self.e,[]))
        p['growth']=20;world=next(s for s in p['deck'] if g['cards'][s]['card_id'].startswith('W-'))
        p['deck'].remove(world);p['board']['world']=world
        with self.assertRaises(ValueError):caps.arrival_certificate(self.e,a)

if __name__=='__main__':unittest.main()
