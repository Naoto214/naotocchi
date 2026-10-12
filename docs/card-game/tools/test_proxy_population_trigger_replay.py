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
 def test_closed_group_end_provenance_requires_actual_full_delta_receipt(self):
  from unittest.mock import patch
  from test_proxy_population_trigger_closure_effect import actual
  import proxy_population_challenge_window as connected
  def run(forced):
   for mode in ('decline','ineligible'):
    record=actual(mode);event={k:v for k,v in record['events'][0].items() if k not in base.BIND_KEYS};trace=[record['before_envelope'],record['after_envelope']]
    # The underlying whole-history check is tested separately; this exercises
    # the extra receipt-to-provenance join on actual sequential output.
    with patch.object(end,'verify_new_events',return_value=[]):
     with api.scope([record]):
      proofs=end.verify_new_events([event],[],trace)
      self.assertEqual(len(proofs),1);self.assertEqual(proofs[0]['certain_growth_difference'],0)
      self.assertEqual(proofs[0]['kind'],event['action_type'])
     for mutation in ('missing','duplicate','delta','event','ledger'):
      records=copy.deepcopy([record]);ev=copy.deepcopy(event);states=copy.deepcopy(trace)
      if mutation=='missing':records=[]
      elif mutation=='duplicate':records*=2
      elif mutation=='delta':states[-1]['legacy_continuation']['game_state']['players']['A']['growth']+=1;records[0]['after_envelope']=copy.deepcopy(states[-1])
      elif mutation=='event':ev['occurrence_ids']=['invented']
      else:records[0]['after_ledger']['occurrences']={}
      with api.scope(records),self.assertRaises(ValueError,msg=mutation):end.verify_new_events([ev],[],states)
   return {}
  with connected.contract_scope():base.operation(initial(),run)

if __name__=='__main__':unittest.main()
