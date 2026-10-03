import copy
import unittest
import proxy_targeted_execution as x

class TargetedExecutionTests(unittest.TestCase):
    def make(self, focus='G-jump-quest'):
        return x.load_scenario(focus)

    def test_all_six_execute_from_unmodified_initial_fixtures(self):
        for focus in x.FOCUS_IDS:
            with self.subTest(focus=focus):
                result=x.execute_scenario(focus)
                self.assertTrue(result['focus_verified'])
                self.assertEqual(result['completed_match_count'],0)
                self.assertEqual(x.replay(result),[])
                self.assertEqual(result,x.execute_scenario(focus))

    def test_fails_closed_on_high_stage_shortcut_wrong_lineage_and_unaffordable_move(self):
        r=self.make();r.start_turn('A',1)
        original=copy.deepcopy(r.state)
        for card in ('M-beetle-03','M-beetle-02'):
            with self.assertRaises(ValueError):r.main('A',card,'birth')
            self.assertEqual(r.state,original)
        r.main('A','M-beetle-01','birth')
        with self.assertRaises(ValueError):r.main('A','M-beetle-02','time_skip')

    def test_one_multistage_move_is_not_two_skips(self):
        r=self.make();r.start_turn('A',1);r.main('A','M-beetle-01','birth');r.end_turn()
        r.start_turn('B',1);r.end_turn();r.start_turn('A',2)
        r.main('A','M-beetle-03','time_skip')
        with self.assertRaises(ValueError):r.activate('A','G-jump-quest',target_card='M-beetle-01')

    def test_person_limit_and_no_free_discard(self):
        r=self.make('M-mushroom-06');r.start_turn('A',1)
        r.person('A','C-otter')
        before=copy.deepcopy(r.state)
        with self.assertRaises(ValueError):r.person('A','C-bat')
        self.assertEqual(r.state,before)

    def test_replay_rejects_forged_hash_and_paid_cost(self):
        result=x.execute_scenario('G-jump-quest')
        bad=copy.deepcopy(result);bad['events'][2]['after_state_sha256']='0'*64
        self.assertTrue(x.replay(bad))
        bad=copy.deepcopy(result);bad['commands'][2]['kind']='unknown'
        self.assertTrue(x.replay(bad))

    def test_duplicate_physical_location_rejected(self):
        r=self.make();r.state['players']['A']['discard'].append(r.state['players']['A']['hand'][0])
        with self.assertRaises(ValueError):r.validate()

    def test_source_drift_rejected(self):
        refs=x.source_hashes();refs[next(iter(refs))]='0'*64
        with self.assertRaises(ValueError):x.verify_sources(refs)


class TargetedBoundaryTests(unittest.TestCase):
    def pending(self,focus):
        result=x.execute_scenario(focus);r=x.load_scenario(focus)
        for cmd in result['commands']:
            getattr(r,cmd['kind'])(**cmd['arguments'])
            if cmd['kind']=='activate' and cmd['arguments']['card']==focus:return r
        self.fail('activation absent')

    def test_penguin_choice_is_made_at_resolution_not_activation(self):
        r=self.pending('M-penguin-07')
        self.assertIsNone(r.state['activation']['target'])
        proof=r.resolve(choice_card='C-bat')
        self.assertTrue(proof['effect_applied'])

    def test_recovery_rechecks_target_and_no_refund(self):
        r=self.pending('M-sakura-05');p=r.state['players']['A'];target=r.state['activation']['target']
        time=p['time'];r.moved('A',target,'deck')
        proof=r.resolve()
        self.assertFalse(proof['effect_applied']);self.assertEqual(p['time'],time)
        self.assertNotIn(target,p['hand'])

    def test_same_name_rechecked_at_resolution(self):
        r=self.pending('M-mushroom-06');p=r.state['players']['A']
        same=r.find('A','C-otter','companions');r.moved('A',same,'deck')
        self.assertFalse(r.resolve()['effect_applied'])

    def test_ordered_payment_is_separate_from_recovery_target(self):
        r=self.pending('M-dragon-08');link=r.state['activation'];p=r.state['players']['A']
        self.assertEqual([r.state['cards'][i]['card_id'] for i in p['deck'][-2:]],['G-basketball-3d','G-crane-game-3d'])
        self.assertIn(link['target'],p['discard'])
        self.assertTrue(r.resolve()['effect_applied'])

    def test_reservation_survives_opponent_turn_and_expires_before_own_draw(self):
        result=x.execute_scenario('M-god-08');r=x.load_scenario('M-god-08')
        for cmd in result['commands']:
            if cmd['kind']=='activate' and cmd['arguments']['card']=='M-dragon-06':break
            getattr(r,cmd['kind'])(**cmd['arguments'])
        active=lambda:[z for z in r.state['reservations'].values() if z['status']=='active']
        self.assertEqual(len(active()),1)
        r.end_turn();proof=r.start_turn('A',9)
        self.assertEqual(len(active()),0);self.assertEqual(len(proof['expired']),1)

    def test_world_initial_placement_is_not_change(self):
        r=self.pending('M-penguin-07');r.state['activation']=None;r.state['phase']='normal';r.state['uses']=[]
        r.state['last_occurrence']={'kind':'world_placed'}
        with self.assertRaises(ValueError):r.activate('A','M-penguin-07')

    def test_defense_once_only_and_never_refunds_attacker_cost(self):
        for focus,destination in [('M-penguin-07',None),('M-god-08','hand')]:
            result=x.execute_scenario(focus)
            e=next(e for e in result['events'] if e['command']['kind']=='resolve' and e['proof']['card']=='M-dragon-06')
            self.assertEqual(e['proof']['details']['destination'],destination)
            before=result['snapshots'][e['seq']-1];after=result['snapshots'][e['seq']]
            self.assertEqual(before['players']['B']['time'],after['players']['B']['time'])
            self.assertEqual(after['reservations'][e['proof']['details']['consumed']]['status'],'consumed')

    def test_targeted_capability_manifest_is_bound_to_sources(self):
        self.assertEqual(x.EXPECTED_SOURCE_HASHES,x.source_hashes())
        bad=dict(x.EXPECTED_SOURCE_HASHES);bad[next(iter(bad))]='0'*64
        with self.assertRaises(ValueError):x.TargetedRunner(x.load_scenario('G-jump-quest').fixture,source_manifest=bad)

class SavedAndTimingTests(unittest.TestCase):
    def test_serialized_all_six_can_replay(self):
        import json,gzip
        for focus in x.FOCUS_IDS:
            with self.subTest(focus=focus):
                saved=json.loads(gzip.decompress(gzip.compress(json.dumps(x.execute_scenario(focus)).encode())))
                self.assertEqual(x.replay(saved),[])

    def test_world_and_challenge_keep_pending_first_opportunity(self):
        for focus,command in [('M-penguin-07','world'),('M-sakura-05','challenge_draw')]:
            result=x.execute_scenario(focus)
            event=next(e for e in result['events'] if e['command']['kind']==command and (command!='world' or e['command']['arguments']['card']=='W-city'))
            after=result['snapshots'][event['seq']]
            self.assertEqual(after['phase'],'trigger_opportunity')
            self.assertNotIn('response_passes',event['proof'])
            r=x.load_scenario(focus)
            for cmd in result['commands'][:event['seq']]:getattr(r,cmd['kind'])(**cmd['arguments'])
            with self.assertRaises(ValueError):r.end_turn()
            r.close_opportunity()
            with self.assertRaises(ValueError):r.activate('A',focus if focus=='M-penguin-07' else 'G-curling-ice')

if __name__=='__main__':unittest.main()
