"""Actual activation reconstruction, including metadata-bearing source costs."""
import copy, unittest
from test_proxy_population_discard_recovery import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
import proxy_continuation_end as end
try:import proxy_population_trigger_replay as api
except ImportError:api=None

class ReplayTests(unittest.TestCase):
 def test_paid_source_receipt_replays_without_weakening_runtime_validation(self):
  self.assertIsNotNone(api)
  e,history,source,target=fixture()
  def run(forced):
   before=base.engine.payments.upgrade(e)
   with recovery.scope(),references.scope(),api.scope():
    action=triggers.board_candidates(state.current(before),history,source,'companions',before['runtime'])[0][0]
    after,events=triggers.activate(before,dict(selected_action=action),history)
    event={k:v for k,v in events[0].items() if k not in base.BIND_KEYS}
    self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(before,after,event,history))
    bad=copy.deepcopy(after);bad['runtime']['ability_uses']=[]
    self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(before,bad,event,history))
    bad=copy.deepcopy(after);bad['legacy_continuation']['activation_zone'][0]['activation_receipt']['before_envelope_sha256']='0'*64
    self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(before,bad,event,history))
   return {}
  base.operation(initial(),run)
if __name__=='__main__':unittest.main()
