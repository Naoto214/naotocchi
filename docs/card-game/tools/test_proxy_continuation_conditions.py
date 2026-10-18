import copy
import gzip
import json
import unittest
from pathlib import Path
from unittest.mock import patch
import proxy_reached_mixed_contracts_401 as reached
try:
    import proxy_continuation_conditions as conditions
except ImportError:
    conditions=None

class ConditionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rows=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-end-434/paired.json.gz').read_bytes()))['results']
        cls.envelope=next(r['final_envelope'] for r in rows if r['path_id']=='probe-01-b-first' and r['policy_id']=='resource_value_pilot_v1')
    def setUp(self):
        self.assertIsNotNone(conditions,'shared public prerequisite proof absent')
        self.game=copy.deepcopy(self.envelope['legacy_continuation']['game_state']);self.actor='B'
    def test_reached_non_eight_main_excludes_with_source_bound_proof(self):
        before=copy.deepcopy(self.game)
        proof=conditions.prove('E-final-time',self.game,self.actor)
        self.assertEqual(proof['status'],'unmet');self.assertEqual(proof['observations'],{'round':2,'main_stage':1})
        with conditions.scope():
            row=reached.conditional.conditional_exclusion('E-final-time',self.game,self.actor)
        self.assertEqual(row['reason_code'],'requires_main_eight_or_r10');self.assertEqual(row['condition_proof'],proof)
        self.assertEqual(before,self.game)
    def test_eight_or_round_ten_never_becomes_an_exclusion(self):
        for stage,round_ in [(8,2),(1,10),(8,10)]:
            g=copy.deepcopy(self.game);g['round']=round_;s=g['players']['B']['board']['main'];g['cards'][s]['card_id']=f'M-antlion-{stage:02}'
            with self.subTest(stage=stage,round=round_):
                self.assertEqual(conditions.prove('E-final-time',g,'B')['status'],'possible')
                with conditions.scope(),self.assertRaisesRegex(ValueError,'target/effect adapter unavailable'):
                    reached.conditional.conditional_exclusion('E-final-time',g,'B')
    def test_egg_before_ten_is_unmet_but_egg_at_ten_is_possible(self):
        self.game['players']['B']['board']['main']=None
        self.assertEqual(conditions.prove('E-final-time',self.game,'B')['status'],'unmet')
        self.game['round']=10
        self.assertEqual(conditions.prove('E-final-time',self.game,'B')['status'],'possible')
    def test_slot_prerequisites_share_fail_closed_contract(self):
        for card,slot in [('G-archery-3d','world'),('E-fateful-transform','main'),('G-asteroids-classic','prepared')]:
            g=copy.deepcopy(self.game);g['players']['B']['board'][slot]=[] if slot=='prepared' else None
            self.assertEqual(conditions.prove(card,g,'B')['status'],'unmet')
            g['players']['B']['board'][slot]=['opaque-prepared'] if slot=='prepared' else 'public-instance'
            self.assertEqual(conditions.prove(card,g,'B')['status'],'possible')
    def test_hidden_deck_hand_and_prepared_identity_do_not_change_proof(self):
        for card in ('E-final-time','G-asteroids-classic'):
            g=copy.deepcopy(self.game);g['players']['B']['board']['prepared']=['opaque-one']
            proof=conditions.prove(card,g,'B')
            g['players']['A']['deck'].reverse();g['players']['A']['hand'].reverse();g['players']['B']['deck'].reverse()
            g['players']['B']['board']['prepared']=['opaque-two']
            g['cards']['opaque-two']={'card_id':'I-secret','private_cost':99}
            self.assertEqual(conditions.prove(card,g,'B'),proof)
    def test_public_condition_change_invalidates_proof(self):
        proof=conditions.prove('E-final-time',self.game,'B');self.game['round']=10
        self.assertTrue(conditions.validate(proof,'E-final-time',self.game,'B'))
    def test_replay_rejects_forged_source_status_and_hash(self):
        proof=conditions.prove('E-final-time',self.game,'B')
        self.assertEqual(conditions.validate(proof,'E-final-time',self.game,'B'),[])
        for field,value in [('status','possible'),('source_raw_sha256','0'*64),('public_input_sha256','0'*64)]:
            bad=copy.deepcopy(proof);bad[field]=value
            self.assertTrue(conditions.validate(bad,'E-final-time',self.game,'B'))
    def test_unknown_public_main_identity_and_invalid_round_fail(self):
        s=self.game['players']['B']['board']['main'];self.game['cards'][s]['card_id']='M-unknown-08'
        with self.assertRaisesRegex(ValueError,'approved available pool'):conditions.prove('E-final-time',self.game,'B')
        self.game['round']=True
        with self.assertRaisesRegex(ValueError,'round'):conditions.prove('E-final-time',self.game,'B')
    def test_main_stage_proof_binds_identity_table_and_canonical_source(self):
        proof=conditions.prove('E-final-time',self.game,'B')
        self.assertIn('data/proxy-normal-decision-candidate-table-114-20260918.json',proof.get('identity_sources_sha256',{}))
        self.assertIn('55-insect-three-lines-card-text-draft.md',proof.get('identity_sources_sha256',{}))
        bad=copy.deepcopy(proof);bad['identity_sources_sha256']={}
        self.assertTrue(conditions.validate(bad,'E-final-time',self.game,'B'))
    def test_proof_boolean_integer_substitution_is_rejected(self):
        proof=conditions.prove('E-final-time',self.game,'B')
        for field,value in [('main_stage',True),('target_and_effect_certified',0)]:
            bad=copy.deepcopy(proof)
            if field=='main_stage':bad['observations'][field]=value
            else:bad[field]=value
            self.assertTrue(conditions.validate(bad,'E-final-time',self.game,'B'))
    def test_identity_heading_stage_drift_is_rejected(self):
        original=conditions.rules.source_section
        def changed(reference):
            body,digest=original(reference)
            if reference.endswith('#M-antlion-01'):return body.replace('①','⑧',1),'f'*64
            return body,digest
        with patch.object(conditions.rules,'source_section',side_effect=changed):
            with self.assertRaisesRegex(ValueError,'canonical main stage'):conditions.prove('E-final-time',self.game,'B')
    def test_canonical_fragment_mutation_fails_before_exclusion(self):
        with patch.object(conditions.rules,'source_section',return_value=('changed source','0'*64)):
            with self.assertRaisesRegex(ValueError,'canonical prerequisite'):conditions.prove('E-final-time',self.game,'B')
    def test_scopes_restore_on_exception_and_nesting(self):
        original=reached.conditional.conditional_exclusion
        with self.assertRaisesRegex(ValueError,'intentional'):
            with conditions.scope():
                with conditions.scope():self.assertEqual(reached.conditional.conditional_exclusion('E-final-time',self.game,'B')['reason_code'],'requires_main_eight_or_r10')
                raise ValueError('intentional')
        self.assertIs(reached.conditional.conditional_exclusion,original)
        with self.assertRaisesRegex(ValueError,'main stage needs separate proof'):original('E-final-time',self.game,'B')
    def test_unregistered_card_is_not_silently_excluded(self):
        self.assertIsNone(conditions.prove('I-c_coin2',self.game,'B'))
        with conditions.scope():self.assertIsNone(reached.conditional.conditional_exclusion('I-c_coin2',self.game,'B'))

if __name__=='__main__':unittest.main()
