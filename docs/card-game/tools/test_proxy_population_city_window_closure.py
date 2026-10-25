"""W-city second-play occurrences raised inside a response window close by their actual receipt."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_city_predicates import fixture as city_fixture
from test_proxy_population_runtime import initial
from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as window
import proxy_population_trigger_existing as existing
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
import proxy_population_board_predicates as board_predicates
import proxy_population_response_predicates as response_predicates
import proxy_population_prepared_predicates as prepared_predicates
import proxy_population_response_composition as composition
import proxy_population_response_group_closure as api
import proxy_continuation_quick as quick


def fixture(origin=3):
 """Turn-end group opened at 3; the actor's second card of the turn is a hand play at 4.

 e is the actual after-boundary of event 4 (the fixed-400 shape: group-002-B-first
 229/231/232, group-002-A-first 141/142/143). origin=4 makes the window origin the
 second play itself, the shape the current origin-equality path already proves.
 """
 e,h,o=city_fixture();c=e['legacy_continuation'];source=o['source_instance_id']
 h=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item'),
    dict(seq=3,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[]),dict(seq=4,actor='A',action_type='activate_response')]
 e['event_seq']=4;c['response_context'].update(origin_event_seq=origin,response_opportunity_index=2)
 proof=existing.ExistingAdapter(h).proof(e,4)
 journal=ledger.observe(ledger.create('A'),proof['occurrences'],'building')
 def decline(_initial,_current,_actor,options,*address):
  option=next(r for r in options if r['action']=='decline_group');key=canonical(option).decode()
  return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)
 with patch.object(sequential.choices,'resolve',side_effect=decline):r=sequential.step(e,initial(),journal,existing.ExistingAdapter(h))
 after=r['after_envelope'];h=h+[r['events'][0]]
 with window.closed_native(r['after_ledger'],after['event_seq']):inv=quick.actions.response_inventory(after,initial(),h)
 assert inv['actor']=='A' and r['events'][0]['action_type']=='decline_trigger_group'
 return after,h,inv,r['after_ledger'],[r],[e,after],[source]


class CityWindowClosureTests(unittest.TestCase):
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())

 def test_second_play_inside_window_is_closed_by_its_actual_decline_receipt(self):
  def run():
   args=fixture();e,h,inv,j,records,trace,wanted=args;source=wanted[0]
   rows=[r for r in j['occurrences'].values() if r['occurrence']['source_instance_id']==source]
   self.assertEqual([(r['status'],r['occurrence']['origin_event_seq']) for r in rows],[('declined',4)])
   self.assertEqual(e['legacy_continuation']['response_context']['origin_event_seq'],3)
   board=board_predicates.audit_response(e,h,inv,trace)
   self.assertEqual(board['errors'],[]);self.assertIn(dict(source_instance_id=source,card_id='W-city',reason='event_response_negative_not_proven'),board['unproved_sources'])
   p=api.audit(*args)
   self.assertEqual(p['errors'],[]);self.assertEqual(p['verified_source_ids'],[source]);self.assertEqual(p['unproved_sources'],[])
   self.assertEqual(len(p['closure_delta_audits']),1);self.assertEqual(p['activation_delta_audits'],[])
   city=p['city_window_audits'][source];self.assertEqual((city['origin_event_seq'],city['occurrence_count'],[c['event_seq'] for c in city['collection_audits']]),(3,1,[4]))
   self.assertFalse(p['occurrence_origin_authenticated']);self.assertFalse(p['all_rule_opportunities_proven'])
   # Proofs that never used the city window keep their exact prior shape (completed records stay byte-identical).
   self.assertEqual(p['scope'],'current_origin_or_verified_latched_window_public_sources_only')
   proofs=dict(response_hand_predicates=response_predicates.audit(e,h,inv),response_reaction_predicates=response_predicates.audit_reactions(e,inv),response_board_predicates=board,response_prepared_predicates=prepared_predicates.audit(e,h,inv))
   composed=composition.audit(e,inv,proofs,p)
   self.assertEqual(composed['errors'],[]);self.assertEqual(composed['source_audit_families'][source],'response_group_closure');self.assertNotIn(source,composed['unproved_source_ids'])
   return {}
  self.run_case(run)

 def test_window_origin_second_play_keeps_the_current_origin_path(self):
  def run():
   args=fixture(origin=4);p=api.audit(*args)
   self.assertEqual(p['errors'],[]);self.assertEqual(p['verified_source_ids'],args[-1]);self.assertNotIn('city_window_audits',p);self.assertEqual(len(p['closure_delta_audits']),1)
   return {}
  self.run_case(run)

 def test_unconsumed_unbounded_or_forged_city_occurrence_stays_closed(self):
  def run():
   args=fixture()
   for mode in ('pending','boundary','board_play'):
    bad=list(copy.deepcopy(args));e,h,inv,j,records,trace,wanted=bad
    if mode=='pending':bad[3]=copy.deepcopy(records[0]['before_ledger'])
    elif mode=='boundary':bad[5]=[trace[-1]]
    else:h[3]['source_zone']='board'
    with self.subTest(mode=mode):
     out=api.audit(*bad);self.assertEqual(out['errors'],[]);self.assertEqual(out['verified_source_ids'],[])
     self.assertEqual([u['reason'] for u in out['unproved_sources']],['current_group_consumption_unproved' if mode=='pending' else 'city_window_occurrence_unproved'])
   for mode in ('history','record','reoffer','forged_origin','unbound_collection'):
    bad=list(copy.deepcopy(args));e,h,inv,j,records,trace,wanted=bad
    if mode=='history':h.pop(3)
    elif mode=='record':records.clear()
    elif mode=='reoffer':inv['legal_candidate_details'].append(dict(source_instance_id=wanted[0],action_type='activate_board_ability'))
    elif mode=='forged_origin':
     for row in j['occurrences'].values():row['occurrence']['origin_event_seq']=3
    with self.subTest(mode=mode):
     if mode=='unbound_collection':
      with patch.object(existing.ExistingAdapter,'collect',lambda self,envelope,origin_event_seq=None:dict(occurrences=[],classifications=[],unproved_sources=[])):out=api.audit(*bad)
      self.assertIn('city window collection unbound',out['errors'])
     else:self.assertTrue(api.audit(*bad)['errors'],mode)
   return {}
  self.run_case(run)


if __name__=='__main__':unittest.main()
