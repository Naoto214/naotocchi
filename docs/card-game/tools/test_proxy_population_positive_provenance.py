"""End proof must consume verified positive effects, never unknown defaults."""
import copy,unittest
from test_proxy_population_trigger_effects import case,resolving
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
import proxy_continuation_state as state
import proxy_continuation_end as end
try:import proxy_population_positive_provenance as api
except ImportError:api=None


def actual(card):
 before,occurrence=case(card)
 action=latching.current_actions(before,occurrence)[0][0]
 activated,events=effects.activate(before,action,occurrence)
 activation={k:v for k,v in events[0].items() if k not in end.BIND_KEYS}
 start=resolving(activated);result=effects.resolve(start,initial())
 resolved=result['new_envelopes'][0];resolution=result['new_events'][0]
 def verify(b,a,event,history):
  if event['action_type']=='activate_response':
   rebuilt,evs=effects.activate(b,action,occurrence)
   return rebuilt==a and {k:v for k,v in evs[0].items() if k not in end.BIND_KEYS}==event
  rebuilt=effects.resolve(b,initial())
  return rebuilt['new_envelopes'][0]==a and rebuilt['new_events'][0]==event
 return before,activated,activation,start,resolved,resolution,verify

class ProvenanceTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'positive transition-to-end proof contract absent')
 def test_all_positive_activation_and_resolution_are_source_bound(self):
  def run(_):
   with effects.scope():
    for card in sorted(latching.CARDS):
     b,a,event,start,after,resolution,verify=actual(card)
     for before,final,ev in ((b,a,event),(start,after,resolution)):
      proof=api.event_proof(before,final,ev,verify,[])
      self.assertEqual(proof['card_id'],card);self.assertEqual(proof['certain_growth_difference'],0)
      self.assertEqual(proof['growth_deltas'],{'A':0,'B':0})
      self.assertEqual(proof['event_sha256'],state.canonical_sha256(ev))
      self.assertEqual(proof['before_envelope_sha256'],state.state_hash(before))
      self.assertEqual(proof['after_envelope_sha256'],state.state_hash(final))
     expected='none' if card in ('C-bat','M-antlion-06') else 'verified_runtime_this_turn'
     self.assertEqual(api.event_proof(start,after,resolution,verify,[])['duration'],expected)
   return {}
  runtime.operation(initial(),run)
 def test_bad_delta_hash_and_unverified_transition_never_get_zero_proof(self):
  def run(_):
   with effects.scope():
    b,a,ev,start,after,resolution,verify=actual('C-bat')
    for mutation in ('growth','event','no_verifier'):
     target=copy.deepcopy(after);event=copy.deepcopy(resolution);check=verify
     if mutation=='growth':target['legacy_continuation']['game_state']['players']['B']['growth']+=1
     elif mutation=='event':event['game_state_after_sha256']='0'*64
     else:check=lambda *args:False
     with self.assertRaises(ValueError,msg=mutation):api.event_proof(start,target,event,check,[])
   return {}
  runtime.operation(initial(),run)

class ReachHistoryTests(unittest.TestCase):
 def test_no_growth_effect_preserves_existing_100_reach(self):
  from unittest.mock import patch
  def run(_):
   with effects.scope():
    b,a,ev,start,after,event,verify=actual('C-bat')
    start['legacy_continuation']['game_state']['players']['A']['growth']=100
    result=effects.resolve(start,initial());after=result['new_envelopes'][0];event=result['new_events'][0]
    proof=api.event_proof(start,after,event,verify,[])
    history=dict(events=[event],snapshots=[dict(state=x['legacy_continuation']['game_state']) for x in (start,after)],stop=dict(game_state=after['legacy_continuation']['game_state'],last_valid_event_seq=event['seq']))
    rule=dict(growth_delta=proof['certain_growth_difference'],duration=proof['duration'],reference=proof['source_reference'])
    with patch.object(end.old.reached.provenance,'EVENT_PROVENANCE_ADAPTER',return_value=rule):
     derived=end.old.reached.provenance.derive_provenance(history,{})
    self.assertEqual(derived['unresolved_codes'],[]);self.assertEqual(derived['growth_reach_100'],[{'actor':'A','event_seq':0}])
    self.assertEqual(derived['growth_trace'][-1]['growth']['A'],100)
   return {}
  runtime.operation(initial(),run)

class EndJoinTests(unittest.TestCase):
 def test_verified_events_join_end_proofs_and_unexpired_lifetime_stays_closed(self):
  self.assertTrue(hasattr(api,'scope'),'positive end proof join absent')
  from unittest.mock import patch
  def run(_):
   with effects.scope():
    for card in sorted(latching.CARDS):
     b,a,ev,start,after,event,verify=actual(card)
     # Isolate the additive proof port; actual transition replay remains real.
     with patch.object(end,'verify_new_events',return_value=[]),api.scope(verify):
      proofs=end.verify_new_events([event],[],[start,after])
      self.assertEqual(len(proofs),1);rule=proofs[0]
      if card in ('M-antlion-03','P-cliff_goat'):
       self.assertFalse(end.old.reached.provenance.RUNTIME_DURATION_VERIFIER(event,rule))
      else:self.assertEqual(rule['duration'],'none')
   return {}
  runtime.operation(initial(),run)

class LifetimeTests(unittest.TestCase):
 def test_expiration_is_proved_for_both_typed_families_including_at_100(self):
  from unittest.mock import patch
  import proxy_continuation_payments as payments
  import proxy_population_growth_runtime as bounded
  def run(_):
   with effects.scope(),bounded.scope():
    for card in ('M-antlion-03','P-cliff_goat'):
     for growth in (25,100):
      b,a,ev,start,after,event,verify=actual(card)
      start['legacy_continuation']['game_state']['players']['A']['growth']=growth
      start['legacy_continuation']['game_state']['phase']='turn_end_response'
      start['legacy_continuation']['response_context']['source_phase']='turn_end'
      result=effects.resolve(start,initial());after=result['new_envelopes'][0];event=result['new_events'][0]
      expired=payments.expire(after);final=expired['new_envelopes'][0];expiry=expired['new_events'][0]
      with patch.object(end,'verify_new_events',return_value=[]),api.scope(verify):
       proof=end.verify_new_events([event,expiry],[],[start,after,final])[0]
       self.assertEqual(proof['growth_before']['A'],growth);self.assertEqual(proof['growth_after']['A'],growth)
       self.assertTrue(proof['lifetime_closed']);self.assertEqual(proof['lifetime_closures'][0]['action_type'],'expire_payment_modifiers')
       self.assertTrue(end.old.reached.provenance.RUNTIME_DURATION_VERIFIER(event,proof))
       # A different event/rule cannot borrow the duration certificate.
       bad=dict(event,seq=event['seq']+1)
       self.assertFalse(end.old.reached.provenance.RUNTIME_DURATION_VERIFIER(bad,proof))
      corrupted=copy.deepcopy(expiry);corrupted['expired_effect_ids']=[]
      with patch.object(end,'verify_new_events',return_value=[]),api.scope(verify),self.assertRaises(ValueError):
       end.verify_new_events([event,corrupted],[],[start,after,final])
   return {}
  runtime.operation(initial(),run)
 def test_lifetime_identity_mutation_and_reappearance_are_rejected(self):
  from unittest.mock import patch
  import proxy_continuation_payments as payments
  def run(_):
   with effects.scope():
    b,a,ev,start,after,event,verify=actual('M-antlion-03')
    start['legacy_continuation']['game_state']['phase']='turn_end_response'
    start['legacy_continuation']['response_context']['source_phase']='turn_end'
    result=effects.resolve(start,initial());after=result['new_envelopes'][0];event=result['new_events'][0]
    expired=payments.expire(after);final=expired['new_envelopes'][0];expiry=expired['new_events'][0]
    for reappear in (False,True):
     altered=copy.deepcopy(final if reappear else after)
     altered['event_seq']=(final if reappear else after)['event_seq']+1
     altered['runtime']['stat_effects']=copy.deepcopy(after['runtime']['stat_effects'])
     if not reappear:altered['runtime']['stat_effects'][0]['source_instance_id']='changed'
     mutation=dict(expiry,seq=altered['event_seq'])
     events=[event,expiry,mutation] if reappear else [event,mutation]
     envelopes=[start,after,final,altered] if reappear else [start,after,altered]
     with patch.object(end,'verify_new_events',return_value=[]),patch.object(end,'RUNTIME_TRANSITION_VERIFIER',return_value=True),api.scope(verify):
      with self.assertRaisesRegex(ValueError,'identity changed or reappeared'):end.verify_new_events(events,[],envelopes)
   return {}
  runtime.operation(initial(),run)
 def test_duration_delegation_restoration_and_source_binding(self):
  from unittest.mock import patch,Mock
  provenance=end.old.reached.provenance
  def run(_):
   with effects.scope():
    b,a,ev,start,after,event,verify=actual('C-bat')
    for source in ('foreign-source','unknown-source'):
     forged=dict(event,source_instance_id=source)
     with self.assertRaises(ValueError):api.event_proof(start,after,forged,verify,[])
    original=end.verify_new_events;delegate=Mock(return_value=True)
    with patch.object(provenance,'RUNTIME_DURATION_VERIFIER',delegate):
     with api.scope(verify):self.assertTrue(provenance.RUNTIME_DURATION_VERIFIER(event,{'duration':'legacy'}))
     self.assertIs(provenance.RUNTIME_DURATION_VERIFIER,delegate)
    delegate.assert_called_once_with(event,{'duration':'legacy'});self.assertIs(end.verify_new_events,original)
   return {}
  runtime.operation(initial(),run)
 def test_absent_target_has_explicit_nonapplication_without_inventing_lifetime(self):
  def run(_):
   with effects.scope():
    for card in sorted(latching.CARDS):
     b,a,ev,start,after,event,verify=actual(card);p=start['legacy_continuation']['game_state']['players']['A']
     if card=='C-bat':
      target=start['legacy_continuation']['activation_zone'][-1]['target_instance_ids'][0]
      p['board']['prepared'].remove(target);p['hand'].append(target);start['runtime']['public_prepared'].pop(target);start['runtime']['attachments'].pop(target,None)
     elif card=='M-antlion-06':
      target=start['legacy_continuation']['activation_zone'][-1]['target_instance_ids'][0];p['discard'].remove(target);p['hand'].append(target)
     else:p['discard'].append(p['board']['main']);p['board']['main']=None
     result=effects.resolve(start,initial());after=result['new_envelopes'][0];event=result['new_events'][0]
     self.assertFalse(event['result']['effect_applied']);proof=api.event_proof(start,after,event,verify,[])
     self.assertEqual(proof['created_effects'],{});self.assertEqual(proof['duration'],'none')
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
