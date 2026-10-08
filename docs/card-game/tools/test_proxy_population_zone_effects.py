"""Real two fixed-target board movers, with unrelated state mutations."""
import copy,unittest
from test_proxy_population_discard_recovery import fixture as recovery_fixture
from test_proxy_population_arrival_predicates import fixture as arrival_fixture
from test_proxy_population_trigger_effects import resolving
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_actions as actions
try:import proxy_population_zone_effects as api
except ImportError:api=None


def actual(card,mode='normal'):
 if card=='C-cat_friend':
  e,history,source,target=recovery_fixture();e=runtime.engine.payments.upgrade(e)
  if mode=='equipment':
   g=e['legacy_continuation']['game_state'];p=g['players']['A'];item=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-bowtie');(p['hand'] if item in p['hand'] else p['deck']).remove(item);p['board']['prepared'].append(item)
   e['runtime']['attachments'][item]=dict(controller='A',target_instance_id=source,attached_event_seq=2);e['runtime']['public_prepared'][item]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=2)
  action=recovery.board_candidates(state.current(e),history,source)[0][0];e,_=recovery.activate(e,dict(selected_action=action),history)
 else:
  e,history,row,_=arrival_fixture(card);source=row['source_instance_id'];action=triggers.board_candidates(state.current(e),history,source,'main',e['runtime'])[0][0];target=action['target_instance_ids'][0];e,_=triggers.activate(e,dict(selected_action=action),history)
 b=resolving(e);c=b['legacy_continuation'];p=c['game_state']['players']['A']
 if mode=='invalid':p['discard'].remove(target);p['hand'].append(target)
 if mode=='empty' and card=='M-antlion-04':p['hand'].extend(p['deck']);p['deck']=[]
 if mode=='departed' and card=='M-antlion-04':p['board']['main']=None;p['discard'].append(source)
 if mode=='outer':
  link=copy.deepcopy(c['activation_zone'][-1]);link['link_id']='outer-supplied-link';link.pop('activation_receipt',None)
  if card=='C-cat_friend':
   g=c['game_state'];other=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if other in p['hand'] else p['deck']).remove(other);p['board']['companions'].append(other)
   link.pop('source_cost_receipt');link.update(source_instance_id=other,card_id='C-chicken',card_copy_id=g['cards'][other]['card_copy_id'],target_instance_ids=[],payment=dict(time=0))
  c['activation_zone'].insert(0,link);c['response_context']['chain_links'].insert(0,link['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 result=actions.normalize_resolution_result(b,triggers.resolve(state.current(b),initial()))
 if mode in ('start','end'):result=boundary.normalize(b,result,dict(kind=mode,turn_player='A',origin_event_seq=3))
 event=result['new_events'][0];a=state.advance(b,result['new_snapshots'][0]['continuation_state'],event['seq']);return b,a,event,target

class ZoneEffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'fixed-zone semantic audit absent')
 def run_case(self,callback):
  def run(forced):
   with recovery.scope(),references.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def test_actual_target_routes_invalid_targets_costs_and_contexts(self):
  def run():
   for card in ('C-cat_friend','M-antlion-04'):
    for mode in ('normal','invalid','empty','departed','outer','start','end','comparing','resolved','equipment'):
     b,a,event,target=actual(card,mode);proof=api.audit(b,a,event)
     with self.subTest(card=card,mode=mode):
      self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_zone_resolution_verified']);self.assertFalse(proof['activation_proven']);self.assertIsNone(proof['balance_admitted'])
      self.assertEqual(proof['moved_instance_id'],None if mode=='invalid' else target)
   return {}
  self.run_case(run)
 def test_wrong_destination_extra_movement_refunds_or_replacement_target_rejected(self):
  def run():
   for card in ('C-cat_friend','M-antlion-04'):
    b,a,event,target=actual(card)
    for mode in ('destination','draw','refund','person_limit','reservation','metadata','receipt'):
     bad=copy.deepcopy(a);ev=copy.deepcopy(event);p=bad['legacy_continuation']['game_state']['players']['A']
     if mode=='destination':
      if card=='C-cat_friend':p['hand'].remove(target);p['deck'].insert(0,target)
      else:p['deck'].remove(target);p['deck'].append(target)
     elif mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='refund':p['time']+=1
     elif mode=='person_limit':p['person_placed']=not p['person_placed']
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='metadata':bad['legacy_continuation']['game_state']['cards'][target]['card_id']='C-cat_friend'
     else:ev['result']['target_instance_id']='foreign'
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_wrong_destination(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,event,target=actual('M-antlion-04');p=a['legacy_continuation']['game_state']['players']['A'];p['deck'].remove(target);p['hand'].append(target)
   fields={k:event[k] for k in ('source_instance_id','source_zone','chain_link_id','source_reference','result')};ev=payments.transition_event(b,a,'resolve_board_ability','A',**fields)
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)])
   try:coverage.audit(result,[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false movement'
   self.assertIn('zone effect semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
