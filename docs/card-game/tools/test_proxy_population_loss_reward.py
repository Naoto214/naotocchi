"""91 loss history does not require the defeated main to remain on board."""
import copy, unittest
import proxy_continuation_candidates as candidates
import proxy_continuation_quick as quick
import proxy_continuation_state as state
import proxy_population_challenge_window as connected
import proxy_population_runtime as runtime
from proxy_population_start_window import _context
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial


def fixture():
 g,actor,source=game_with('E-boss');g['phase']='normal_action';g['players'][actor]['time']=2
 e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3))
 events=[dict(seq=1,action_type='turn_start_and_egg_draw',actor=actor),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]
 return e,actor,source,events

class LossRewardTests(unittest.TestCase):
 def test_departed_main_does_not_erase_public_loss_activation(self):
  def run(forced):
   e,actor,source,events=fixture();g=e['legacy_continuation']['game_state']
   self.assertIsNone(g['players'][actor]['board']['main'])
   inv=candidates.audit(e,events);rows=[r for r in inv['legal_candidate_details'] if r['source_instance_id']==source]
   self.assertEqual(len(rows),1,'91 requires the recorded loss, not a surviving main')
   after,generated=quick.activate(e,dict(selected_action=rows[0]),dict(public_events=events),initial(),verify_record=False)
   self.assertEqual(after['legacy_continuation']['game_state']['players'][actor]['time'],0)
   self.assertEqual(generated[0]['source_instance_id'],source)
   self.assertEqual(len(after['legacy_continuation']['activation_zone']),1)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_no_loss_previous_turn_draw_and_insufficient_time_are_excluded(self):
  def run(forced):
   for mode in ('absent','previous_turn','draw','opponent_loss','cost'):
    e,actor,source,events=fixture();g=e['legacy_continuation']['game_state']
    if mode=='absent':events=events[:1]
    elif mode=='previous_turn':events.append(dict(seq=3,action_type='turn_start_and_egg_draw',actor=actor))
    elif mode=='draw':events[-1]['result']=dict(outcome='draw')
    elif mode=='opponent_loss':events[-1]['result']['loser']='B' if actor=='A' else 'A'
    else:g['players'][actor]['time']=1
    inv=candidates.audit(e,events)
    self.assertFalse(any(r['source_instance_id']==source for r in inv['legal_candidate_details']),mode)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

class ConnectedSelectionTests(unittest.TestCase):
 def test_departed_main_normal_and_response_selection_through_verified_apply(self):
  def run(forced):
   # Preexisting test contexts only. These conditional states are not sampled
   # initial orders or new independent games;116 remains explicitly excluded.
   for phase,order in [('normal_action','unit-group'),('response_window','unit-only')]:
    e,actor,source,events=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor]
    p['deck'] += [s for s in p['hand'] if s!=source];p['hand']=[source];g['phase']=phase
    if phase=='response_window':
     e['legacy_continuation']['response_context']['origin_event_seq']=3
     current=state.current(e)
     events.append(dict(seq=3,action_type='response_pass',actor=actor,game_state_after_sha256=quick.old.start.opening._stop_state_sha256(current['game_state']),continuation_state_after_sha256=quick.old.start._hash(current)))
    supplied=initial();supplied['order_id']=order
    step=runtime._step(e,supplied,events,[],[e],forced)
    self.assertEqual(step['decision']['selected_action']['card_id'],'E-boss',phase)
    self.assertEqual(step['evaluation']['legacy_116'],'excluded')
    self.assertIsNone(step['evaluation']['balance_admitted'])
    after=step['final_envelope']['legacy_continuation']
    self.assertEqual(after['game_state']['players'][actor]['time'],0)
    self.assertEqual(after['activation_zone'][-1]['source_instance_id'],source)
    self.assertEqual(step['ordinary_entry_binding']['errors'],[])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

class ScopeTests(unittest.TestCase):
 def test_exception_restores_prior_qualifier(self):
  import proxy_population_loss_reward as api
  prior=candidates.ADMITTED_ID_ADAPTER
  with self.assertRaisesRegex(ValueError,'conditional failure'):
   with api.scope():
    self.assertIsNot(candidates.ADMITTED_ID_ADAPTER,prior)
    raise ValueError('conditional failure')
  self.assertIs(candidates.ADMITTED_ID_ADAPTER,prior)

if __name__=='__main__':unittest.main()
