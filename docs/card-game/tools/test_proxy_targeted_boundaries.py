"""Contract unit inputs are isolated from the legal full-command fixture variants."""
import copy
import unittest
import proxy_targeted_execution as x


def prefix(focus, before=False, card=None):
    r=x.load_scenario(focus)
    for command in x.execute_scenario(focus)['commands']:
        hit=command['kind']=='activate' and command['arguments']['card']==(card or focus)
        if hit and before:return r
        getattr(r,command['kind'])(**command['arguments'])
        if hit:return r
    raise AssertionError('activation absent')


class TargetedBoundaryContracts(unittest.TestCase):
    def unchanged_rejection(self,r,action):
        saved=copy.deepcopy((r.state,r.commands,r.events,r.snapshots))
        with self.assertRaises(ValueError):action()
        self.assertEqual((r.state,r.commands,r.events,r.snapshots),saved)

    def test_duplicate_name_selects_two_distinct_payment_copies(self):
        r=prefix('M-dragon-08',True)
        # Synthetic contract input: two existing physical action copies in discard;
        # not a constructed legal trajectory or a change to the112 original fixture.
        p=r.state['players']['A'];a,b=[r.find('A',c,'discard') for c in ['G-basketball-3d','G-crane-game-3d']]
        r.state['cards'][b]['card_id']='G-basketball-3d';r.identities=copy.deepcopy(r.state['cards'])
        proof=r.activate('A','M-dragon-08',target_card='C-bat',payment_cards=['G-basketball-3d']*2)
        self.assertEqual(proof['paid'],[a,b]);self.assertEqual(p['deck'][-2:],[a,b])

    def test_single_copy_cannot_pay_twice(self):
        r=prefix('M-dragon-08',True)
        self.unchanged_rejection(r,lambda:r.activate('A','M-dragon-08',target_card='C-bat',payment_cards=['G-basketball-3d']*2))

    def test_explicit_payment_identity_is_preserved(self):
        r=prefix('M-dragon-08',True)
        ids=[r.find('A',c,'discard') for c in ['G-crane-game-3d','G-basketball-3d']]
        choices=[{'card_id':r.state['cards'][i]['card_id'],'instance_id':i} for i in ids]
        self.assertEqual(r.activate('A','M-dragon-08',target_card='C-bat',payment_cards=choices)['paid'],ids)
        self.assertEqual(r.state['players']['A']['deck'][-2:],ids)

    def test_selector_rejects_wrong_owner_or_card_name(self):
        r=prefix('M-god-08',True)
        target=r.find('A','C-bat','companions')
        for selector in ({'card_id':'C-box','instance_id':target},{'card_id':'C-bat','instance_id':r.find('B','C-bat','companions')}):
            with self.subTest(selector=selector):
                self.unchanged_rejection(r,lambda:r.activate('A','M-god-08',target_card=selector,payment_cards=['G-stack-snowman']))

    def test_negative_copy_index_rejected(self):
        r=prefix('M-mushroom-06',True)
        with self.assertRaises(ValueError):r.find('A','C-otter','discard',index=-1)

    def test_explicit_selector_requires_nonempty_string_identity(self):
        for identity in (None,'',False,0,[],{}):
            for role in ('target','payment'):
                with self.subTest(identity=identity,role=role):
                    r=prefix('M-god-08',True)
                    target={'card_id':'C-bat','instance_id':identity} if role=='target' else 'C-bat'
                    paid=[{'card_id':'G-stack-snowman','instance_id':identity}] if role=='payment' else ['G-stack-snowman']
                    self.unchanged_rejection(r,lambda:r.activate('A','M-god-08',target_card=target,payment_cards=paid))

    def test_paid_target_departure_and_return_does_not_restore_tracking(self):
        r=prefix('M-sakura-05');target=r.state['activation']['target'];time=r.state['players']['A']['time']
        r.moved('A',target,'hand');r.moved('A',target,'discard')
        proof=r.resolve()
        self.assertFalse(proof['effect_applied']);self.assertEqual(r.state['players']['A']['time'],time)
        self.assertIn(target,r.state['players']['A']['discard'])

    def test_reservation_target_departure_invalidates_but_source_departure_does_not(self):
        for focus in ('M-penguin-07','M-god-08'):
            with self.subTest(focus=focus):
                r=prefix(focus);r.resolve(**({'choice_card':'C-bat'} if focus=='M-penguin-07' else {}))
                key=next(k for k,z in r.state['reservations'].items() if z['status']=='active')
                z=r.state['reservations'][key];r.moved('A',z['source'],'discard')
                self.assertEqual(z['status'],'active')
                r.moved('A',z['target'],'hand')
                self.assertEqual(z['status'],'invalidated')

    def test_per_object_use_is_retired_on_departure(self):
        r=prefix('M-god-08');source=r.state['activation']['source'];r.resolve()
        self.assertTrue(any(z[0]==source for z in r.state['uses']))
        r.moved('A',source,'discard')
        self.assertFalse(any(z[0]==source for z in r.state['uses']))

    def defenses(self):
        r=prefix('M-god-08',card='M-dragon-06')
        key=next(k for k,z in r.state['reservations'].items() if z['status']=='active')
        other=copy.deepcopy(r.state['reservations'][key]);other['kind']='prevent_departure'
        r.state['reservations']['unit-prevention']=other
        return r,key,'unit-prevention'

    def test_multiple_defenses_require_affected_players_choice(self):
        r,_,_=self.defenses();self.unchanged_rejection(r,lambda:r.resolve())

    def test_prevention_first_keeps_replacement_unused(self):
        r,replacement,prevention=self.defenses()
        proof=r.resolve_defended('A',[prevention])
        self.assertIsNone(proof['details']['destination'])
        self.assertEqual(r.state['reservations'][replacement]['status'],'active')
        self.assertEqual(r.state['reservations'][prevention]['status'],'consumed')

    def test_replacement_first_rechecks_prevention_on_rewritten_event(self):
        r,replacement,prevention=self.defenses();time=r.state['players']['B']['time']
        proof=r.resolve_defended('A',[replacement,prevention])
        self.assertIsNone(proof['details']['destination'])
        self.assertEqual(proof['details']['consumed_reservations'],[replacement,prevention])
        self.assertEqual(r.state['players']['B']['time'],time)

    def test_wrong_defender_invalid_order_and_duplicate_choice_are_atomic(self):
        for actor,selection in [('B','replacement'),('A','unknown'),('A','duplicate')]:
            r,a,b=self.defenses();order=[a] if selection=='replacement' else ['absent'] if selection=='unknown' else [a,a]
            self.unchanged_rejection(r,lambda:r.resolve_defended(actor,order))

    def test_consumed_defense_cannot_be_used_again(self):
        r,a,b=self.defenses();r.state['reservations'][b]['status']='consumed'
        self.unchanged_rejection(r,lambda:r.resolve_defended('A',[b]))


if __name__=='__main__':unittest.main()
