import copy
import unittest
from test_proxy_mandatory_choice_boundary import frame
try:
    import proxy_mandatory_policy_local as api
except ImportError:
    api=None

ROOT_HEX=bytes(range(32)).hex()  # fixed synthetic unit material; no OS entropy

def context(kind='egg_exchange_bottom'):
    return dict(protocol_id='unit-test-only',group_id='synthetic',owner='A',mirror_side='A_first',
                opportunity_address=['A',1,'A','turn_start' if kind=='egg_exchange_bottom' else 'effect_resolution',
                                     0 if kind=='egg_exchange_bottom' else 1,kind,'selection',0])


class LocalTests(unittest.TestCase):
    def setUp(self):self.assertIsNotNone(api,'local MRP dispatcher missing')

    def test_real_dispatch_uses_reconstructed_candidates_before_application(self):
        f=frame();r=api.build_local_record(f,ROOT_HEX,context())
        self.assertEqual(r['application']['boundary']['candidate_ids'],['copy-d1','copy-h1','copy-h2'])
        chosen=r['arithmetic_proof']['selected_candidate']
        self.assertEqual(r['application']['selected_candidate'],chosen)
        after=r['application']['local_after_game_state']['players']['A']
        self.assertEqual(after['deck'][-1],chosen.removeprefix('copy-'))
        v=api.validate_local_record(r,f,ROOT_HEX,context())
        self.assertTrue(v['local_record_verified']);self.assertIsNone(v['policy_eligible'])
        self.assertTrue(r['strategic_unproven']);self.assertIn('origin_obligation_ledger_unverified',v['gaps'])
        self.assertFalse(v['ready_for_execution'])

    def test_all_registered_choices_dispatch_without_old_fallback(self):
        for kind in ('ability_hand_bottom','ability_draw_then_hand_bottom','ability_topdeck_order','final_time_hand_bottom'):
            r=api.build_local_record(frame(kind),ROOT_HEX,context(kind))
            self.assertEqual(r['selection_basis'],'planned_policy_random')
            self.assertNotIn('seed_context',r)
            self.assertTrue(api.validate_local_record(r,frame(kind),ROOT_HEX,context(kind))['local_record_verified'])

    def test_singleton_binds_context_root_and_entry_but_is_not_admitted(self):
        f=frame(hand=('h1',),deck=());c=context()
        r=api.build_local_record(f,ROOT_HEX,c)
        self.assertIsNone(r['arithmetic_proof']['random_proof'])
        self.assertIsNone(r['policy_eligible']);self.assertIsNone(r['strategic_unproven'])
        c['opportunity_address'][1]=2
        self.assertFalse(api.validate_local_record(r,f,ROOT_HEX,c)['local_record_verified'])
        self.assertFalse(api.validate_local_record(r,f,'00'*32,context())['local_record_verified'])

    def test_every_layer_is_recomputed_not_trusted(self):
        f=frame();c=context();r=api.build_local_record(f,ROOT_HEX,c)
        variants=[]
        for field in r:
            v=copy.deepcopy(r);v[field]=True if r[field] is None else None;variants.append(v)
        v=copy.deepcopy(r);v['application']['boundary']['candidate_ids'].pop();variants.append(v)
        v=copy.deepcopy(r);v['application']['local_after_game_state']['players']['A']['growth']=999;variants.append(v)
        v=copy.deepcopy(r);v['application']['boundary']['choice_game_state']=f['game_state'];variants.append(v)
        v=copy.deepcopy(r);v['application']['boundary']['candidate_details'][0]['card_id']='C-box';variants.append(v)
        v=copy.deepcopy(r);v['application']['boundary']['permitted_view']['hidden']='x';variants.append(v)
        v=copy.deepcopy(r);v['arithmetic_proof']['selected_index']=True;variants.append(v)
        v=copy.deepcopy(r);v['resolution_mode']='seeded_fallback';variants.append(v)
        for v in variants:
            self.assertFalse(api.validate_local_record(v,f,ROOT_HEX,c)['local_record_verified'])

    def test_rng_never_uses_hidden_state_hash(self):
        f=frame();r=api.build_local_record(f,ROOT_HEX,context())
        f['game_state']['cards']['d2']['card_id']='W-countryside'
        other=api.build_local_record(f,ROOT_HEX,context())
        self.assertEqual(r['arithmetic_proof'],other['arithmetic_proof'])
        self.assertNotEqual(r['entry_sha256'],other['entry_sha256'])
        self.assertFalse(api.validate_local_record(r,f,ROOT_HEX,context())['local_record_verified'])

    def test_wrong_owner_turn_kind_or_zero_choices_cannot_dispatch(self):
        cases=[]
        for field,value in [('owner','B')]:
            c=context();c[field]=value;cases.append((frame(),c))
        c=context();c['opportunity_address'][0]='B';cases.append((frame(),c))
        cases.append((frame('ability_hand_bottom'),context()))
        cases.append((frame(hand=(),deck=()),context()))
        for f,c in cases:
            with self.assertRaises(ValueError):api.build_local_record(f,ROOT_HEX,c)
        old=dict(resolution_mode='seeded_fallback',strategic_unresolved=True)
        self.assertFalse(api.validate_local_record(old,frame(),ROOT_HEX,context())['local_record_verified'])

if __name__=='__main__':unittest.main()
