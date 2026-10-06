"""Registered own-hand timing from conditional existing native activations."""
import unittest
from unittest.mock import patch
import copy
import test_proxy_continuation_challenge as fixtures
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_challenge as challenge
import proxy_continuation_quick as quick
import proxy_continuation_state as state
import proxy_population_trigger_existing as existing

try:import proxy_population_hand_timing as api
except ImportError:api=None

def fixture(mixed=False,inventory_only=False):
 h=fixtures.ChallengeTests();h.setUp();e=payments.upgrade(h.e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
 for p in g['players'].values():p['time']=5
 def hand(actor,card):
  p=g['players'][actor];s=next(s for s in p['deck']+p['hand']+p['discard'] if g['cards'][s]['card_id']==card)
  for z in ('deck','hand','discard'):
   if s in p[z]:p[z].remove(s)
  p['hand'].append(s);return s
 responder=hand('A','G-air-hockey');hand('B','G-air-hockey');played=hand('B','G-baseball-batting')
 if mixed:
  p=g['players']['A'];main=hand('A','M-antlion-03');p['hand'].remove(main);p['discard'].append(p['board']['main']);p['board']['main']=main
  prepared=hand('A','I-poop1');p['hand'].remove(prepared);p['board']['prepared'].append(prepared)
  e['runtime']['public_prepared'][prepared]=dict(controller='A',face_up=False,paid_time=1,placed_event_seq=e['event_seq'])
  # Existing -2 illness modifier supplies a legal batting condition; origin is conditional.
  illness=next(s for s,v in g['cards'].items() if s.startswith('A-') and v['card_id']=='E-big-illness')
  payments.add_stat_modifier(e,'A',illness,g['players']['B']['board']['main'])
 a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power')
 before,events=challenge.declare(e,a)
 # Supplied conditional public-turn prefix; no initial-origin authentication.
 events=[dict(seq=e['event_seq'],actor=g['turn_player'],action_type='turn_start_and_normal_draw',fixture_only=True)]+events
 inv=quick.actions.response_inventory(before,initial(),events)
 if inventory_only:return dict(before=before,inventory=inv,played=played)
 action=next(a for a in inv['legal_candidate_details'] if a.get('source_instance_id')==played)
 after,added=quick.activate(before,dict(selected_action=action,candidate_set_evidence=inv),dict(public_events=events),initial())
 return before,after,added[0],events+added,responder

class HandTimingTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_actual_opponent_play_captures_only_preexisting_own_hand_source(self):
  def run(forced):
   before,after,event,history,source=fixture();proof=api.capture(before,after,event)
   rows=proof['occurrences'];self.assertEqual([r['source_instance_id'] for r in rows],[source]);self.assertEqual(rows[0]['actor'],'A')
   self.assertFalse(proof['origin_authenticated']);self.assertFalse(proof['opportunity_completeness_proven'])
   # A card drawn only afterwards was not present at the triggering event.
   early=copy.deepcopy(before);p=early['legacy_continuation']['game_state']['players']['A'];p['hand'].remove(source);p['deck'].append(source)
   from proxy_continuation_triggers import _raw_event
   changed=_raw_event(state.current(early),state.current(after),event['action_type'],event['actor'],source_instance_id=event['source_instance_id'],chain_link_id=event['chain_link_id'])
   self.assertEqual(api.capture(early,after,changed)['occurrences'],[])
   return {}
  runtime.operation(initial(),run)
 def test_current_cost_target_and_parameter_are_reenumerated_at_latched_origin(self):
  def run(forced):
   before,after,event,history,source=fixture();row=api.capture(before,after,event)['occurrences'][0]
   later=history+[dict(seq=event['seq']+1,action_type='activate_response',actor='B',source_zone='board',source_instance_id=after['legacy_continuation']['game_state']['players']['B']['board']['main'])]
   rows,proof=api.current_actions(after,row,later)
   self.assertEqual({r['candidate_variant'] for r in rows},{'power','wisdom'});self.assertTrue(proof['complete'])
   self.assertTrue(all(r['source_instance_id']==source for r in rows))
   low=copy.deepcopy(after);low['legacy_continuation']['game_state']['players']['A']['time']=0
   self.assertEqual(api.current_actions(low,row,later)[0],[])
   gone=copy.deepcopy(after);p=gone['legacy_continuation']['game_state']['players']['A'];p['hand'].remove(source);p['deck'].append(source)
   self.assertEqual(api.current_actions(gone,row,later)[0],[])
   invalid=copy.deepcopy(after);invalid['legacy_continuation']['game_state']['challenge']['status']='resolved'
   self.assertEqual(api.current_actions(invalid,row,later)[0],[])
   with self.assertRaises(ValueError):api.current_actions(after,row,history[:-1])
   return {}
  runtime.operation(initial(),run)
 def test_group_activation_reuses_payment_link_and_no_ordinary_reoffer(self):
  def run(forced):
   before,after,event,history,source=fixture();row=api.capture(before,after,event)['occurrences'][0]
   rows,_=api.current_actions(after,row,history);selected=rows[0]
   with api.scope():
    current=copy.deepcopy(after);current['legacy_continuation']['response_context']['priority_actor']='A'
    inv=quick.actions.response_inventory(current,initial(),history)
    self.assertFalse(any(r.get('source_instance_id')==source for r in inv['legal_candidate_details']))
    activated,events=api.activate(after,selected,row,history,initial())
   p=activated['legacy_continuation']['game_state']['players']['A'];self.assertEqual(p['time'],4);self.assertNotIn(source,p['hand'])
   link=activated['legacy_continuation']['activation_zone'][-1]
   self.assertEqual(link['source_instance_id'],source);self.assertEqual(link['candidate_variant'],selected['candidate_variant'])
   self.assertEqual(link['target_instance_ids'],selected['target_instance_ids']);self.assertEqual(link['payment'],{'time':1})
   self.assertEqual(events[0]['trigger_origin_event_seq'],event['seq'])
   self.assertEqual(events[0]['envelope_before_sha256'],state.state_hash(after))
   self.assertTrue(api.verify_activation(after,activated,events[0],row,history,initial()))
   bad=copy.deepcopy(activated);bad['legacy_continuation']['game_state']['players']['A']['time']+=1
   self.assertFalse(api.verify_activation(after,bad,events[0],row,history,initial()))
   wrong=copy.deepcopy(events[0]);wrong['trigger_origin_event_seq']+=1
   self.assertFalse(api.verify_activation(after,activated,wrong,row,history,initial()))
   state.validate(activated);return {}
  runtime.operation(initial(),run)
 def test_source_drift_and_event_identity_mismatch_fail_closed(self):
  def run(forced):
   before,after,event,history,source=fixture();bad=copy.deepcopy(event);bad['chain_link_id']='forged'
   with self.assertRaises(ValueError):api.capture(before,after,bad)
   with patch.object(api,'ORDER_SHA','0'*64):
    with self.assertRaises(ValueError):api.capture(before,after,event)
   return {}
  runtime.operation(initial(),run)

class ConnectedHandTimingTests(unittest.TestCase):
 def test_actual_quick_step_enters_sequential_group_before_ordinary_response(self):
  import proxy_population_challenge_window as connected
  i=initial();i['order_id']='unit-only' # Existing synthetic unit identifier; no experimental input.
  def prepare(forced):
   before,_,_,history,source=fixture()
   with connected.contract_scope():proof=existing.ExistingAdapter(history[:-1]).proof(before)
   return dict(before=before,history=history[:-1],source=source,proof=proof)
  prepared=runtime.operation(i,prepare);before,history,source,proof=(prepared[k] for k in ('before','history','source','proof'))
  result=connected.segment(before,i,history,[],[before],2,proof)
  self.assertIsNone(result['stop'],result['stop'])
  self.assertEqual(result['events'][0]['source_instance_id'],'B-028#1')
  self.assertEqual(len(result['trigger_records']),1)
  group=result['trigger_records'][0]
  candidates=group['inventory']['legal_candidate_details']
  self.assertTrue(any(r.get('activation',{}).get('source_instance_id')==source for r in candidates))
  self.assertTrue(group['excluded_by_116']);self.assertFalse(group['policy_eligible'])
  self.assertTrue(result['supported_trigger_coverage']['covered'])
  self.assertFalse(result['opportunity_completeness_proven'])
 def test_group_hand_activation_creates_next_owner_occurrence(self):
  import proxy_population_challenge_window as connected
  i=initial();i['order_id']='unit-only'
  def prepare(forced):
   before,_,_,history,source=fixture()
   with connected.contract_scope():proof=existing.ExistingAdapter(history[:-1]).proof(before)
   return dict(before=before,history=history[:-1],source=source,proof=proof)
  p=runtime.operation(i,prepare)
  result=connected.segment(p['before'],i,p['history'],[],[p['before']],3,p['proof'])
  self.assertIsNone(result['stop'],result['stop']);self.assertEqual(len(result['trigger_records']),2)
  first,second=result['trigger_records'];self.assertEqual(first['chosen']['action'],'activate')
  self.assertEqual(first['inventory']['actor'],'A');self.assertEqual(second['inventory']['actor'],'B')
  ids={r.get('activation',{}).get('source_instance_id') for r in second['inventory']['legal_candidate_details']}
  self.assertIn('B-023#1',ids);self.assertNotIn('A-023#1',ids)
  self.assertTrue(result['supported_trigger_coverage']['covered'])
 def test_hand_and_board_share_the_same_current_optional_group(self):
  import proxy_population_challenge_window as connected
  i=initial();i['order_id']='unit-only'
  def prepare(forced):
   import proxy_population_response_context as response_context
   with response_context.scope():before,_,_,history,source=fixture(mixed=True)
   with connected.contract_scope():proof=existing.ExistingAdapter(history[:-1]).proof(before)
   return dict(before=before,history=history[:-1],source=source,proof=proof)
  p=runtime.operation(i,prepare)
  result=connected.segment(p['before'],i,p['history'],[],[p['before']],2,p['proof'])
  self.assertIsNone(result['stop'],result['stop'])
  choices=result['trigger_records'][0]['inventory']['legal_candidate_details']
  cards={r['activation']['card_id'] for r in choices if r['action']=='activate'}
  self.assertEqual(cards,{'G-air-hockey','M-antlion-03'})
  self.assertEqual(sum(r['action']=='decline_group' for r in choices),1)
  self.assertTrue(result['trigger_records'][0]['excluded_by_116'])

if __name__=='__main__':unittest.main()
