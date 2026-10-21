import copy
import gzip
import json
import unittest
from pathlib import Path
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
try:
    import proxy_continuation_end as end
except ImportError:
    end=None


def legacy_history(run, initial):
    prefix=initial['source_route'];events=copy.deepcopy(prefix['events']);shots=[]
    for s in prefix['snapshots']:
        game=copy.deepcopy(s['state']);game['cards']=copy.deepcopy(prefix['final_state']['cards'])
        shots.append(dict(event_seq=s['seq'],game_state=game,
            game_state_sha256=s['state_sha256'],continuation_state=None,continuation_state_sha256=None))
    shots[-1]=old._snapshot(state.current(run['initial_envelope']))
    for event,envelope in zip(run['events'],run['snapshots'][1:]):
        events.append({k:v for k,v in event.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')})
        shots.append(old._snapshot(state.current(envelope)))
    return events,shots


class EndTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials={i['path_id']:i for i in old.load_initial_routes()}
        data=Path(__file__).resolve().parents[1]/'data/proxy-continuation-contract/paired.json.gz'
        cls.runs=json.loads(gzip.decompress(data.read_bytes()))['results']

    def setUp(self):self.assertIsNotNone(end,'shared end bridge is not implemented')
    def run_row(self,path):
        run=next(r for r in self.runs if r['path_id']==path and r['policy_id']==old.POLICIES[1])
        initial=self.initials[path];events,shots=legacy_history(run,initial)
        return run,initial,events,shots
    def force(self,path):
        r,i,e,s=self.run_row(path)
        return end.forced(r['final_envelope'],i,e,s,r['snapshots'])

    def test_main_end_is_proved_through_all_six_stages(self):
        r,i,e,s=self.run_row('probe-01-a-first');before=copy.deepcopy(r['final_envelope'])
        result=self.force(r['path_id'])
        self.assertEqual([x['action_type'] for x in result['new_events']],['turn_end_completed','turn_start_and_egg_draw'])
        self.assertTrue(result['end_evidence']['turn_end_set_complete'])
        self.assertEqual(len(result['end_evidence']['stage_inventory']),6)
        self.assertEqual(result['end_evidence']['envelope_sha256'],state.state_hash(before))
        self.assertEqual(r['final_envelope'],before)

    def test_equipment_end_keeps_target_and_runtime_through_next_draw(self):
        r,_,_,_=self.run_row('probe-02-a-first');result=self.force(r['path_id'])
        previous=r['final_envelope']
        for shot in result['new_snapshots']:
            after=state.advance(previous,shot['continuation_state'],shot['event_seq'])
            self.assertEqual(after['runtime'],r['final_envelope']['runtime']);previous=after
        self.assertEqual(previous['legacy_continuation']['game_state']['phase'],'egg_exchange_choice')

    def test_birth_payment_or_reference_tampering_is_rejected(self):
        r,i,events,shots=self.run_row('probe-01-a-first')
        for key,value in [('payment_time',0),('source_reference','01-core-rules.md')]:
            bad=copy.deepcopy(events);event=next(x for x in bad if x['action_type']=='play_main_birth');event[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):end.forced(r['final_envelope'],i,bad,shots,r['snapshots'])

    def test_attachment_target_or_payment_tampering_is_rejected(self):
        r,i,events,shots=self.run_row('probe-02-a-first')
        for key,value in [('target_instance_ids',['B-001#1']),('payment_time',0)]:
            bad=copy.deepcopy(events);next(x for x in bad if x['action_type']=='attach_item')[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):end.forced(r['final_envelope'],i,bad,shots,r['snapshots'])

    def test_runtime_relation_history_tampering_is_rejected(self):
        r,i,e,s=self.run_row('probe-02-a-first');bad=copy.deepcopy(r['snapshots'])
        attached=next(x for x in bad if x['runtime']['attachments'])
        next(iter(attached['runtime']['attachments'].values()))['attached_event_seq']-=1
        with self.assertRaises(ValueError):end.forced(r['final_envelope'],i,e,s,bad)

    def test_unknown_main_classification_still_stops(self):
        r,i,e,s=self.run_row('probe-01-a-first');bad=copy.deepcopy(r['final_envelope']);g=bad['legacy_continuation']['game_state']
        g['cards'][g['players']['B']['board']['main']]['card_id']='M-antlion-06'
        with self.assertRaisesRegex(ValueError,'unproved ability capability'):
            with end.end_scope(bad,[],[],[]):pass

    def test_concealed_preparation_not_classified_as_face_up_equipment(self):
        r,_,_,_=self.run_row('probe-01-a-first');bad=copy.deepcopy(r['final_envelope'])
        g=bad['legacy_continuation']['game_state'];p=g['players']['B']
        source=next(x for x in p['deck'] if g['cards'][x]['card_id'].startswith('I-'))
        p['deck'].remove(source);p['board']['prepared'].append(source)
        bad['runtime']['public_prepared'][source]=dict(controller='B',face_up=False,paid_time=0,placed_event_seq=bad['event_seq'])
        with self.assertRaisesRegex(ValueError,'concealed'):
            with end.end_scope(bad,[],[],[]):pass

    def test_unclassified_ability_use_change_in_response_history_rejected(self):
        r,i,e,s=self.run_row('probe-02-a-first');bad=copy.deepcopy(r['snapshots']);g=bad[-2]['legacy_continuation']['game_state']
        source=next(iter(bad[-2]['runtime']['attachments']))
        bad[-2]['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='start_draw',turn_player=g['turn_player'],round=g['round'],count=1)]
        with self.assertRaisesRegex(ValueError,'unclassified runtime change'):end.forced(r['final_envelope'],i,e,s,bad)

    def test_shared_next_start_classifier_accepts_main_without_start_trigger(self):
        r,_,_,_=self.run_row('probe-01-a-first');g=r['final_envelope']['legacy_continuation']['game_state']
        with end.end_scope(r['final_envelope'],[],[],r['snapshots']):
            inventory=old.reached.ORIGINAL_CLASSIFY(g,'B')
        self.assertTrue(any(x['card_id']=='M-antlion-01' and x['trigger_kind']=='not_turn_start_trigger' for x in inventory))

    def test_main_start_draws_one_without_egg_exchange(self):
        r,_,_,_=self.run_row('probe-01-a-first');c=state.current(r['final_envelope'])
        c['game_state']['phase']='turn_start';c['return_target']=None;c['continuation_state_sha256']=old.start._hash(c)
        before=copy.deepcopy(c)
        with end.end_scope(r['final_envelope'],[],[],r['snapshots']):after,event,inventory=end.start_regular(c)
        p=after['game_state']['players']['B'];previous=before['game_state']['players']['B']
        self.assertEqual(len(p['hand']),len(previous['hand'])+1)
        self.assertEqual(p['deck'],previous['deck'][1:])
        self.assertEqual(after['game_state']['phase'],'response_window')
        self.assertEqual(event['action_type'],'turn_start_and_normal_draw')
        self.assertEqual(before,c)

    def test_main_start_empty_deck_does_not_lose_or_enter_exchange(self):
        r,_,_,_=self.run_row('probe-01-a-first');c=state.current(r['final_envelope'])
        p=c['game_state']['players']['B'];p['discard']+=p['deck'];p['deck']=[]
        c['game_state']['phase']='turn_start';c['return_target']=None;c['continuation_state_sha256']=old.start._hash(c)
        with end.end_scope(r['final_envelope'],[],[],r['snapshots']):after,event,_=end.start_regular(c)
        self.assertEqual(after['game_state']['players']['B']['hand'],p['hand'])
        self.assertEqual(after['game_state']['phase'],'response_window')

    def test_registry_and_classifier_restored_on_exception(self):
        r,_,_,_=self.run_row('probe-01-a-first')
        board=old.reached.provenance.contract_123.BOARD_REGISTRY;registry=old.reached.provenance.TEXT_REGISTRY
        before=(copy.deepcopy(board),copy.deepcopy(registry),old.reached.ORIGINAL_CLASSIFY)
        with self.assertRaisesRegex(RuntimeError,'test'):
            with end.end_scope(r['final_envelope'],[],[],r['snapshots']):raise RuntimeError('test')
        self.assertEqual((board,registry,old.reached.ORIGINAL_CLASSIFY),before)


    def test_opt_in_end_inventory_adapter_preserves_fresh_audit_and_restores(self):
        from unittest.mock import patch
        r,initial,events,shots=self.run_row('probe-01-a-first')
        audit=dict(stage_inventory=[dict(units=[dict(evidence=dict(predicate='source_verified_end_condition'))])])
        row=old._row(state.current(r['final_envelope']),r['path_id'])
        with patch.object(old.terminal,'audit_current_turn_end',return_value=copy.deepcopy(audit)):
            self.assertEqual(end.canonical_end_inventory(row,audit,{}),audit)
        before=old.END_STAGE_INVENTORY_ADAPTER
        with end.end_scope(r['final_envelope'],events,shots,r['snapshots']):
            self.assertIs(old.END_STAGE_INVENTORY_ADAPTER,before)
        with patch.object(end,'END_INVENTORY_CANONICALIZER',end.canonical_end_inventory):
            with end.end_scope(r['final_envelope'],events,shots,r['snapshots']):
                self.assertIs(old.END_STAGE_INVENTORY_ADAPTER,end.canonical_end_inventory)
        self.assertIs(old.END_STAGE_INVENTORY_ADAPTER,before)

    def test_same_end_boundary_reuses_its_verified_event_proofs(self):
        from unittest.mock import patch
        original=end.verify_new_events
        with patch.object(end,'verify_new_events',wraps=original) as verify:
            result=self.force('probe-01-a-first')
        self.assertEqual(verify.call_count,1)
        self.assertTrue(result['end_evidence']['new_event_proofs'])

class EventProvenanceTests(unittest.TestCase):
    def test_different_results_with_same_kind_are_bound_to_each_event(self):
        from unittest.mock import patch
        # The adapter is populated only after an independent event replay.
        provenance=old.reached.provenance
        before=dict(cards={},players={a:dict(growth=0,reservations=[]) for a in 'AB'})
        after=copy.deepcopy(before);after['players']['A']['growth']=5
        events=[dict(seq=1,action_type='comparison',actor='A'),dict(seq=2,action_type='comparison',actor='A')]
        history=dict(events=events,snapshots=[dict(state=before),dict(state=before),dict(state=after)],stop=dict(game_state=after,last_valid_event_seq=2))
        adapter=lambda e:dict(growth_delta=0 if e['seq']==1 else 5,duration='none',reference='65-challenge-participants-and-resolution.md')
        with patch.object(provenance,'EVENT_PROVENANCE_ADAPTER',adapter):
            result=provenance.derive_provenance(history,{})
        self.assertEqual(result['unresolved_codes'],[])
        self.assertEqual(result['growth_trace'][-1]['growth'],dict(A=5,B=0))

if __name__=='__main__':unittest.main()
