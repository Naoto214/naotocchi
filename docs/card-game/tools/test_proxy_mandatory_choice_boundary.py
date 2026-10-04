"""Synthetic local states only; no deck construction or game execution."""
import copy
import unittest
try:
    import proxy_mandatory_choice_boundary as api
except ImportError:
    api = None


def frame(kind='egg_exchange_bottom', hand=('h1','h2'), deck=('d1','d2')):
    names={'h1':'C-box','h2':'C-box','d1':'M-beetle-01','d2':'W-city',
           'src':'I-sleepboost1','target':'C-box','main':'M-beetle-01'}
    source={'ability_hand_bottom':'M-beetle-01','ability_draw_then_hand_bottom':'I-sleepboost1',
            'ability_topdeck_order':'W-city','final_time_hand_bottom':'E-final-time'}
    names['src']=source.get(kind,'I-sleepboost1')
    cards={i:dict(card_id=n,card_copy_id='copy-'+i,initial_instance_id=i) for i,n in names.items()}
    def player():
        return dict(hand=[],deck=[],discard=[],board=dict(main=None,companions=[],partner=None,
                    partner_stage=0,world=None,prepared=[]),time=2,growth=0,reservations=[])
    a=player();a.update(hand=list(hand),deck=list(deck),discard=['target'])
    return dict(schema='mandatory_rule_slice_input.v1',choice_contract_id=kind,actor='A',
                entry='after_normal_draw' if kind=='egg_exchange_bottom' else 'effect_resolution_start',
                source_instance_id=None if kind=='egg_exchange_bottom' else 'src',
                target_instance_id='target' if kind=='final_time_hand_bottom' else None,
                game_state=dict(cards=cards,players={'A':a,'B':player()},turn_player='A',round=1,
                                phase='synthetic_local_boundary',opaque_preserved={'counter':3}))


class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(api, 'source-bound mandatory boundary adapter missing')

    def test_egg_draw_precedes_complete_physical_hand(self):
        f=frame();before=copy.deepcopy(f);b=api.prepare(f)
        self.assertEqual(f,before)
        self.assertEqual(b['candidate_ids'],['copy-d1','copy-h1','copy-h2'])
        self.assertEqual(b['choice_game_state']['players']['A']['hand'],['h1','h2','d1'])
        self.assertEqual(b['choice_game_state']['players']['A']['deck'],['d2'])
        self.assertEqual(b['candidate_details'][1]['instance_id'],'h1')
        self.assertEqual(b['candidate_details'][2]['instance_id'],'h2')
        self.assertEqual(b['prefix_operations'],[{'operation':'draw','instance_id':'d1'}])
        self.assertIsNone(b['policy_eligible'])

    def test_draw_two_uses_actual_intermediate_state_and_partial_draw(self):
        for deck,want in [(('d1','d2'),['copy-d1','copy-d2','copy-h1']),
                          (('d1',),['copy-d1','copy-h1']),((),['copy-h1'])]:
            f=frame('ability_draw_then_hand_bottom',('h1',),deck)
            self.assertEqual(api.prepare(f)['candidate_ids'],want)

    def test_return_then_draw_does_not_include_future_draw_in_choices(self):
        b=api.prepare(frame('ability_hand_bottom'))
        self.assertEqual(b['candidate_ids'],['copy-h1','copy-h2'])
        self.assertEqual(b['prefix_operations'],[])

    def test_final_time_rechecks_target_before_conditional_draw(self):
        f=frame('final_time_hand_bottom',(),())
        b=api.prepare(f)
        self.assertEqual(b['candidate_ids'],['copy-target'])
        self.assertEqual(b['prefix_operations'],[
            {'operation':'discard_to_bottom','instance_id':'target'},
            {'operation':'draw','instance_id':'target'}])
        f['game_state']['players']['A']['discard']=[]
        b=api.prepare(f)
        self.assertEqual(b['candidate_ids'],[])
        self.assertEqual(b['no_choice_reason'],'target_invalid_at_resolution')
        self.assertEqual(b['prefix_operations'],[])
        f=frame('final_time_hand_bottom');f['game_state']['cards']['target']['card_id']='M-beetle-01'
        self.assertEqual(api.prepare(f)['no_choice_reason'],'target_invalid_at_resolution')

    def test_partner_egg_suppression_and_no_choice_are_not_seeded(self):
        f=frame('ability_hand_bottom');f['game_state']['cards']['src']['card_id']='P-cat_ceo'
        self.assertEqual(api.prepare(f)['no_choice_reason'],'partner_suppressed_while_egg')
        f['game_state']['players']['A']['board']['main']='main'
        self.assertEqual(api.prepare(f)['candidate_ids'],['copy-h1','copy-h2'])
        for kind in ('egg_exchange_bottom','ability_hand_bottom','ability_draw_then_hand_bottom','ability_topdeck_order'):
            b=api.prepare(frame(kind,(),()))
            self.assertEqual(b['candidate_ids'],[])
            self.assertIsNotNone(b['no_choice_reason'])

    def test_top_bottom_remain_two_options_even_with_single_card(self):
        b=api.prepare(frame('ability_topdeck_order',(),('d1',)))
        self.assertEqual(b['candidate_ids'],['{"position":"bottom"}','{"position":"top"}'])
        self.assertEqual(b['permitted_view']['looked_top']['instance_id'],'d1')
        self.assertEqual(b['permitted_view']['looked_top']['card_id'],'M-beetle-01')

    def test_information_view_excludes_opponent_and_unseen_deck(self):
        f=frame();one=api.prepare(f)
        f['game_state']['cards']['d2']['card_id']='W-countryside'
        f['game_state']['players']['B']['reservations']=[{'secret':'x'}]
        two=api.prepare(f)
        self.assertEqual(one['permitted_view'],two['permitted_view'])
        self.assertEqual(one['candidate_details'],two['candidate_details'])
        self.assertNotEqual(one['choice_game_state'],two['choice_game_state'])

    def test_bad_scope_identity_and_duplicate_locations_fail_closed(self):
        bad=[]
        f=frame();f['choice_contract_id']='normal_action';bad.append(f)
        f=frame();f['entry']='after_egg_draw';bad.append(f)
        f=frame();f['actor']='C';bad.append(f)
        f=frame();f['game_state']['players']['A']['board']['main']='main';bad.append(f)
        f=frame();f['game_state']['players']['A']['hand'].append('h1');bad.append(f)
        f=frame();f['game_state']['cards']['h2']['card_copy_id']='copy-h1';bad.append(f)
        f=frame();f['game_state']['players']['B']['hand']=['h1'];bad.append(f)
        f=frame('ability_hand_bottom');f['game_state']['cards']['src']['card_id']='W-city';bad.append(f)
        f=frame();f['candidate_set_complete']=True;bad.append(f)
        for f in bad:
            with self.subTest(f=f),self.assertRaises(ValueError):api.prepare(f)

    def test_pinned_sources_cannot_be_overridden(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):api.prepare(frame(),root=Path(directory))

class ApplicationTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(hasattr(api,'apply_choice'), 'local application missing')

    def test_egg_bottom_and_preserve_every_unrelated_field(self):
        f=frame();before=copy.deepcopy(f)
        out=api.apply_choice(f,'copy-h2')
        expected=copy.deepcopy(f['game_state'])
        expected['players']['A'].update(hand=['h1','d1'],deck=['d2','h2'])
        self.assertEqual(out['local_after_game_state'],expected)
        self.assertEqual(f,before)
        self.assertFalse(out['global_transition_verified'])

    def test_cycle_draws_after_return_and_partner_requires_return(self):
        f=frame('ability_hand_bottom',('h1',),())
        out=api.apply_choice(f,'copy-h1')
        self.assertEqual(out['local_after_game_state']['players']['A']['hand'],['h1'])
        self.assertEqual(out['suffix_operations'],[
            {'operation':'hand_to_bottom','instance_id':'h1'},
            {'operation':'draw','instance_id':'h1'}])
        f=frame('ability_hand_bottom',(),('d1',))
        self.assertEqual(api.apply_choice(f,None)['local_after_game_state']['players']['A']['hand'],['d1'])
        f['game_state']['cards']['src']['card_id']='P-cat_ceo'
        f['game_state']['players']['A']['board']['main']='main'
        self.assertEqual(api.apply_choice(f,None)['local_after_game_state']['players']['A']['hand'],[])

    def test_draw_then_return_and_final_target_move_keep_order(self):
        f=frame('ability_draw_then_hand_bottom',('h1',),('d1','d2'))
        p=api.apply_choice(f,'copy-d1')['local_after_game_state']['players']['A']
        self.assertEqual((p['hand'],p['deck']),(['h1','d2'],['d1']))
        f=frame('final_time_hand_bottom',('h1',),('d1','d2'))
        p=api.apply_choice(f,'copy-h1')['local_after_game_state']['players']['A']
        self.assertEqual((p['hand'],p['deck'],p['discard']),(['d1','d2'],['target','h1'],[]))

    def test_top_and_bottom_have_exact_permutations_without_equivalence(self):
        f=frame('ability_topdeck_order')
        for selected,want in [('top',['d1','d2']),('bottom',['d2','d1'])]:
            p=api.apply_choice(f,'{"position":"'+selected+'"}')['local_after_game_state']['players']['A']
            self.assertEqual(p['deck'],want)
        f=frame('ability_topdeck_order',(),('d1',))
        self.assertEqual(len(api.prepare(f)['candidate_ids']),2)

    def test_no_choice_does_not_accept_selection_and_choice_requires_one(self):
        for f,selected in [(frame(),None),(frame(),'copy-d2'),(frame(),True),
                           (frame('ability_topdeck_order',(),()),'{"position":"top"}')]:
            with self.assertRaises(ValueError):api.apply_choice(f,selected)

if __name__=='__main__':unittest.main()
