"""Conditional post-reentry segment in unchanged472/positive driver."""
import copy,unittest
from test_proxy_population_departure import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_incarnation_runtime as runtime
import proxy_population_trigger_existing as existing
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
try:import proxy_population_incarnation_window as api
except ImportError:api=None

class WindowTests(unittest.TestCase):
 def test_existing_segment_continues_after_real_native_reentry(self):
  self.assertIsNotNone(api,'lifecycle window absent')
  def build(forced):
   e,source,targets=fixture();e=payments.upgrade(e);p=e['legacy_continuation']['game_state']['players']['A'];p['hand'].remove(source);p['hand'].append(targets[0]);p['board']['companions'][0]=source
   connection=runtime.Connection(e);before=copy.deepcopy(e);p['board']['companions'][0]=targets[0];p['hand'].remove(targets[0]);p['hand'].append(source);e['event_seq']+=1
   event=payments.transition_event(before,e,'unit_recovery','A');connection.capture(before,e,event);history=[dict(seq=1,actor='A',action_type='person_placement',source_instance_id=source),event]
   with departure.scope(),recovery.scope(),connection.scope():
    a=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']=='place_companion');r=departure.replace_companion(e,a,history);after=r['envelope'];history.extend({k:v for k,v in event.items() if k not in base.BIND_KEYS} for event in r['events']);proof=existing.ExistingAdapter(history).proof(after)
   return dict(e=after,history=history,proof=proof,connection=connection,source=source)
  built=base.operation(initial(),build);e=built['e'];history=built['history'];proof=built['proof'];connection=built['connection'];source=built['source']
  r=api.segment(e,initial(),history,[],[e],2,proof,connection=connection)
  self.assertIsNone(r['stop']);self.assertEqual(len(r['events']),2);self.assertFalse(r['ready_for_execution']);self.assertIn(source,r['final_envelope']['legacy_continuation']['game_state']['cards']);self.assertEqual(len(r['physical_lifecycle_steps']),2)

 def test_bad_initial_connection_does_not_leave_shared_lock(self):
  class Missing:
   records={}
  try:
   with self.assertRaises((ValueError,KeyError)):
    api.segment(dict(schema=payments.SCHEMA),initial(),[],[],[],1,{},connection=Missing())
   self.assertFalse(api._LOCK.locked())
  finally:
   if api._LOCK.locked():api._LOCK.release()

if __name__=='__main__':unittest.main()
