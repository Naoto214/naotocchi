"""Existing Connection scope must retain native406 full hashes and metadata."""
import copy,unittest
from contextlib import contextmanager
from unittest.mock import patch
import proxy_population_incarnation_runtime as incarnation
import proxy_population_incarnation_policy as policy
import proxy_population_designated_effects as semantics
from test_proxy_population_designated_effects import actual
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_continuation_quick as quick

class FinalTimeBoundaryTests(unittest.TestCase):
 def run_case(self,fn):
  original=policy.handler_scope
  @contextmanager
  def scope(session):
   record=session.registry(None);connection=incarnation.Connection.__new__(incarnation.Connection);connection.records={record['current_envelope_sha256']:copy.deepcopy(record)}
   with connection.scope(),original(session):yield
  with window.contract_scope(),patch.object(policy,'handler_scope',scope):return runtime.operation(initial(),fn)
 def test_connection_retains_full_metadata_and_native_receipt(self):
  def run(forced):
   prior=quick.final_time.verify_transition
   for mode in ('retained','retained_source','retained_target'):
    b,a,event,decisions,registry=actual(forced,'E-final-time',mode)
    self.assertEqual(semantics.audit(b,a,event,decisions,registry)['errors'],[])
    self.assertEqual(b['legacy_continuation']['game_state']['cards'],a['legacy_continuation']['game_state']['cards'])
   self.assertIs(quick.final_time.verify_transition,prior)
   return {}
  self.run_case(run)
 def test_bad_retained_metadata_and_duplicate_locations_still_refused(self):
  def run(forced):
   native=quick.final_time.verify_transition
   for mode in ('metadata','duplicate','hash'):
    def corrupt(row,after,event):
     if mode=='metadata':next(iter(after['game_state']['cards'].values()))['card_id']='C-box'
     elif mode=='duplicate':p=after['game_state']['players']['A'];p['hand'].append(p['deck'][0])
     else:event['game_state_after_sha256']='0'*64
     return native(row,after,event)
    with patch.object(quick.final_time,'verify_transition',corrupt):
     with self.assertRaises(ValueError):actual(forced,'E-final-time','retained')
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
