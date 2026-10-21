import copy
import unittest
import proxy_continuation_state as state
import proxy_continuation_candidates as candidates
from test_proxy_continuation_state import fixture, equipped
try:
    import proxy_continuation_actions as actions
except ImportError:
    actions=None


class ActionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.source,cls.seq=fixture()
    def setUp(self):
        self.assertIsNotNone(actions,'shared attachment execution not implemented')
        self.e=state.create(self.source,self.seq)
    def action(self,e=None):
        return next(d for d in candidates.audit(e or self.e,[])['legal_candidate_details'] if d['action_type']=='attach_item')

    def test_attachment_is_atomic_payment_and_relation_with_response_window(self):
        original=copy.deepcopy(self.e)
        after,events=actions.attach(self.e,self.action())
        p=after['legacy_continuation']['game_state']['players']['A']
        self.assertEqual(p['time'],0)
        self.assertNotIn('A-032#1',p['hand'])
        self.assertEqual(p['board']['prepared'],['A-032#1'])
        self.assertEqual(after['runtime']['attachments']['A-032#1']['target_instance_id'],'A-019#1')
        self.assertEqual(after['legacy_continuation']['activation_zone'],[])
        self.assertEqual(after['legacy_continuation']['game_state']['phase'],'post_placement_response')
        self.assertEqual(events[0]['envelope_before_sha256'],state.state_hash(self.e))
        self.assertEqual(events[0]['envelope_after_sha256'],state.state_hash(after))
        self.assertEqual(original,self.e)

    def test_bad_target_or_payment_rejected_without_mutation(self):
        action=self.action()
        for change in ('opponent','missing','cost'):
            bad=copy.deepcopy(action)
            if change=='cost':bad['evidence']['payment_time']=0
            else:bad['target_instance_ids']=['B-001#1' if change=='opponent' else 'missing']
            original=copy.deepcopy(self.e)
            with self.subTest(change=change), self.assertRaises(ValueError):actions.attach(self.e,bad)
            self.assertEqual(self.e,original)
        poor=copy.deepcopy(self.e);poor['legacy_continuation']['game_state']['players']['A']['time']=1
        with self.assertRaises(ValueError):actions.attach(poor,action)

    def test_all_person_target_kinds_are_accepted_from_full_inventory(self):
        for kind in ('main','companions','partner'):
            e=copy.deepcopy(self.e);g=e['legacy_continuation']['game_state'];p=g['players']['A']
            if kind=='main':
                # Unit-only variant, not a trajectory or a 112 fixture.
                source='A-006#1'
                p['hand'].remove(source);g['cards'][source]['card_id']='M-antlion-01'
                p['board']['main']=source
            elif kind=='companions':
                source=next(i for i in p['deck'] if g['cards'][i]['card_id']=='C-box')
                p['deck'].remove(source);p['board']['companions'].append(source)
            else:source=p['board']['partner']
            action=next(d for d in candidates.audit(e,[])['legal_candidate_details'] if d['action_type']=='attach_item' and d['target_instance_ids']==[source] and d['card_id']=='I-bowtie')
            after,_=actions.attach(e,action)
            self.assertEqual(after['runtime']['attachments']['A-032#1']['target_instance_id'],source)

    def test_equipment_does_not_become_response_activation_after_placement(self):
        after,events=actions.attach(self.e,self.action())
        opportunity=actions.response_inventory(after,{},events)
        self.assertNotIn('response-activate-ability-A-032#1',opportunity['legal_candidate_ids'])
        self.assertIn('response-pass',opportunity['legal_candidate_ids'])

    def test_start_attachment_trigger_is_optional_usage_bound_and_egg_enabled(self):
        e=equipped(self.e);p=e['legacy_continuation']['game_state']['players']['A']
        p['discard']+=p['hand'][2:];p['hand']=p['hand'][:2]
        self.assertIsNone(p['board']['main'])
        rows=actions.start_attachments(e,'A')
        self.assertEqual([r['source_instance_id'] for r in rows],['A-032#1'])
        self.assertTrue(rows[0]['optional'])
        e['runtime']['ability_uses']=[dict(source_instance_id='A-032#1',ability_key='start_draw',turn_player='A',round=2,count=1)]
        self.assertEqual(actions.start_attachments(e,'A'),[])
        self.assertEqual(actions.start_attachments(e,'B'),[])

    def test_full_prepared_slots_exclude_all_additional_equipment(self):
        e=copy.deepcopy(self.e);g=e['legacy_continuation']['game_state'];p=g['players']['A']
        ids=[s for s in p['deck'] if g['cards'][s]['card_id'].startswith('I-')][:3]
        for source in ids:
            p['deck'].remove(source);p['board']['prepared'].append(source)
            e['runtime']['public_prepared'][source]=dict(controller='A',face_up=False,paid_time=1,placed_event_seq=1)
        with self.assertRaises(ValueError):actions.attach(e,self.action())

if __name__=='__main__': unittest.main()
