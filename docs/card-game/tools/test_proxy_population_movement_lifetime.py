"""Reuse native physical reentry and cover all normal movement lifetimes."""
import copy,unittest
from test_proxy_population_first_response import game_with
from proxy_population_start_window import _context
from test_proxy_population_runtime import initial
from test_proxy_population_payment_consumption import fixture
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_population_challenge_window as connected
import proxy_population_runtime as runtime
import proxy_population_incarnation_runtime as incarnation
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_population_payment_consumption as api


def reentry_case():
 g,actor,source=game_with('M-beetle-01');g['phase']='normal_action';p=g['players'][actor];p['time']=10;p['hand'].remove(source);p['board']['main']=source
 e=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2));connection=incarnation.Connection(e);before=copy.deepcopy(e)
 p=e['legacy_continuation']['game_state']['players'][actor];p['board']['main']=None;p['hand'].append(source);e['event_seq']+=1
 # Conditional supplied recovery, as in the existing incarnation unit suite.
 recovered=payments.transition_event(before,e,'unit_recovery',actor);connection.capture(before,e,recovered);history=[recovered]
 with departure.scope(),recovery.scope(),references.scope(),connection.scope():
  action=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']=='play_main' and a['source_instance_id']==source)
  after,events=batch.transition(e,action,history)
 return e,after,events[0]

class MovementLifetimeTests(unittest.TestCase):
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_actual_native_reentry_binds_previous_hand_instance_to_new_main(self):
  def run():
   e,after,event=reentry_case();proof=api.audit(e,after,event)
   self.assertTrue(event['source_instance_id'].endswith('#2'));self.assertEqual(proof['errors'],[])
   self.assertTrue(proof['movement_instance_binding_verified']);self.assertTrue(proof['payment_consumption_verified'])
   for mode in ('absent','foreign','skip','metadata','duplicate'):
    bad=copy.deepcopy(after);ev=copy.deepcopy(event)
    if mode=='absent':ev.pop('instance_transitions')
    elif mode=='foreign':ev['instance_transitions'][0]['from_instance_id']='foreign#1'
    elif mode=='skip':ev['instance_transitions'][0]['to_instance_id']=ev['source_instance_id'].replace('#2','#3')
    elif mode=='metadata':bad['legacy_continuation']['game_state']['cards'][ev['source_instance_id']]['card_id']='M-antlion-01'
    else:ev['instance_transitions']*=2
    with self.subTest(mode=mode):self.assertTrue(api.audit(e,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_time_skip_removes_old_target_and_birth_preserves_other_target(self):
  def run():
   for variant in ('time_skip','birth'):
    e=fixture();g=e['legacy_continuation']['game_state'];actor=g['turn_player'];other='A' if actor=='B' else 'B';p=g['players'][actor];old=p['board']['main']
    if variant=='birth':p['board']['main']=None;p['discard'].append(old)
    for owner in ('A','B'):
     target=g['players'][owner]['board']['main']
     if target is None:continue
     for card,add in [('E-big-illness',payments.add_stat_modifier),('G-basketball-3d',payments.add_conditional_reward)]:
      source=next(s for s,v in g['cards'].items() if s.startswith(owner+'-') and v['card_id']==card);add(e,owner,source,target)
    action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['candidate_variant']==variant)
    after,events=batch.transition(e,action,[]);proof=api.audit(e,after,events[0]);self.assertEqual(proof['errors'],[])
    self.assertEqual(proof['expired_target_effect_count'],2 if variant=='time_skip' else 0)
    self.assertEqual(proof['consumed_effect_count'],0)
    self.assertEqual(after['runtime']['payment_effects'],e['runtime']['payment_effects'])
    for family in ('stat_effects','conditional_effects'):self.assertEqual(len(after['runtime'][family]),1)
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
