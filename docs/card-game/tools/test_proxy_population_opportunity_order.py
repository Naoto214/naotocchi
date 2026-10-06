"""Conditional ordering slices; no claims of full game-state legality."""
import copy,unittest
from test_proxy_population_opportunity_ledger import occurrence
try:import proxy_population_opportunity_order as api
except ImportError:api=None

def trace(decision=None,phase='normal_action',forced=None):
 e=dict(event_seq=1,legacy_continuation=dict(game_state=dict(turn_player='A',phase=phase),response_context=dict(chain_status='empty',priority_actor='A'),activation_zone=[],pending_triggers=[]))
 after=copy.deepcopy(e);after['event_seq']=2
 step=dict(source_envelope=e,final_envelope=after,events=[dict(seq=2)],envelopes=[after],decision=decision,forced_record=forced)
 return dict(source_envelope=e,final_envelope=after,steps=[step],trigger_records=[])

class OrderTests(unittest.TestCase):
 def test_normal_and_ordinary_response_require_their_own_decision(self):
  self.assertIsNotNone(api)
  for phase in ('normal_action','response_window'):
   with self.assertRaises(ValueError):api.audit(trace(phase=phase),[])
  d=dict(context=dict(decision_kind='normal_action',actor='A'),choice=dict(decision_kind='normal_action'))
  result=api.audit(trace(d),[]);self.assertEqual(result['ordinary_normal_count'],1);self.assertFalse(result['all_rule_opportunities_proven'])
  native=copy.deepcopy(d);native['choice']=dict(resolution_mode='priority_unique',selected_candidate='pass')
  self.assertEqual(api.audit(trace(native),[])['ordinary_normal_count'],1)
  native['choice']['decision_kind']='response_action'
  with self.assertRaises(ValueError):api.audit(trace(native),[])
  response=dict(decision_kind='response_action',actor='A')
  self.assertEqual(api.audit(trace(response,'response_window'),[])['ordinary_response_count'],1)
  with self.assertRaises(ValueError):api.audit(trace(response),[])
 def test_unconsumed_source_obligation_blocks_ordinary_choice(self):
  self.assertIsNotNone(api)
  row=occurrence('A-001#1','A','optional');row['origin_event_seq']=1
  d=dict(context=dict(decision_kind='normal_action',actor='A'),choice=dict(decision_kind='normal_action'))
  with self.assertRaises(ValueError):api.audit(trace(d),[row])
 def test_forced_resolution_is_not_mislabeled_as_no_choice_normal(self):
  self.assertIsNotNone(api)
  r=trace(phase='response_window',forced={});r['source_envelope']['legacy_continuation']['response_context']['chain_status']='resolving'
  self.assertEqual(api.audit(r,[])['automatic_step_count'],1)
  r['steps'][0]['forced_record']=None
  with self.assertRaises(ValueError):api.audit(r,[])
if __name__=='__main__':unittest.main()
