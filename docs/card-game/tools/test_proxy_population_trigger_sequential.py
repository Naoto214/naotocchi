"""Approved next-action contract with state-dependent legal targets."""
import copy,unittest
from test_proxy_population_opportunity_ledger import occurrence
from test_proxy_population_start_obligations import fixture,opened
from test_proxy_population_runtime import initial
import proxy_population_opportunity_ledger as ledger
import proxy_population_runtime as runtime
import proxy_continuation_state as state
try:import proxy_population_trigger_sequential as api
except ImportError:api=None

class SequentialTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_current_state_is_reenumerated_and_no_future_sequence_is_selected(self):
  from proxy_population_start_obligations import capture,collect
  e,actor,source=fixture();o=opened(e,actor);l=ledger.observe(ledger.create(actor),collect(capture(e),o)['occurrences'],'empty')
  def run(forced):
   first=api.step(o,initial(),l,api.StartAdapter())
   self.assertEqual(first['selection_unit'],'one_current_next_activation_or_decline')
   self.assertEqual(first['decision']['resolution_mode'],'seeded_fallback');self.assertTrue(first['decision']['strategic_unresolved']);self.assertFalse(first['policy_eligible']);self.assertIsNone(first['balance_admitted'])
   self.assertEqual(len(first['inventory']['legal_candidate_ids']),2)
   self.assertEqual(first['inventory']['legal_candidate_ids'],first['decision']['legal_candidates'])
   self.assertIsNone(ledger.offer(first['after_ledger']))
   self.assertEqual(api.validate(first,initial(),api.StartAdapter()),[])
   self.assertEqual(first['before_envelope_sha256'],state.canonical_sha256(o));self.assertEqual(first['after_envelope_sha256'],state.canonical_sha256(first['after_envelope']))
   bad=copy.deepcopy(first);bad['inventory']['legal_candidate_ids'].pop();self.assertTrue(api.validate(bad,initial(),api.StartAdapter()))
   bad=copy.deepcopy(first);bad['decision']['seed_proof']['selected_index']=True;self.assertTrue(api.validate(bad,initial(),api.StartAdapter()))
   self.assertNotIn(first['before_envelope_sha256'],first['decision']['seed_context']['choice_kind'])
   return {}
  runtime.operation(initial(),run)
 def test_all_physical_sources_are_flat_and_decline_is_not_ordinary_pass(self):
  from proxy_population_start_obligations import capture,collect
  e,actor,source=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor]
  # Two current107 sources, each at a real public start.
  item=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-bowtie');(p['hand'] if item in p['hand'] else p['deck']).remove(item);p['board']['prepared'].append(item)
  e['runtime']['attachments'][item]=dict(controller=actor,target_instance_id=source,attached_event_seq=1);e['runtime']['public_prepared'][item]=dict(controller=actor,face_up=True,paid_time=2,placed_event_seq=1)
  while len(p['hand'])>2:p['deck'].append(p['hand'].pop())
  o=opened(e,actor);l=ledger.observe(ledger.create(actor),collect(capture(e),o)['occurrences'],'empty')
  def run(forced):
   adapter=api.StartAdapter();inv=api.inventory(o,l,adapter);self.assertEqual(len(inv['legal_candidate_ids']),3)
   record=api.step(o,initial(),l,adapter);after=record['after_envelope'];self.assertEqual(after['legacy_continuation']['response_context']['consecutive_passes'],0)
   if record['chosen']['action']=='activate':
    remaining=api.inventory(after,record['after_ledger'],adapter);self.assertEqual(len(remaining['legal_candidate_ids']),2);self.assertNotEqual(inv['legal_candidate_ids'],remaining['legal_candidate_ids'])
   else:self.assertIsNone(ledger.offer(record['after_ledger']))
   return {}
  runtime.operation(initial(),run)
 def test_new_state_inapplicability_is_recorded_without_a_fictional_choice(self):
  from test_proxy_population_trigger_connection import both
  def run(forced):
   e,l,proof=both();g=e['legacy_continuation']['game_state'];p=g['players']['A']
   # The source-bound current-state adapter must notice a changed condition,
   # even when a caller supplies the previous pending occurrence inventory.
   p['hand'].append(p['deck'].pop(0))
   inv=api.inventory(e,l,api.StartAdapter());self.assertEqual(len(inv['legal_candidate_ids']),2)
   self.assertEqual(len(inv['ineligible_occurrences']),1);self.assertEqual(inv['ineligible_occurrences'][0]['proof']['reason'],'hand_count_above_two')
   row=next(o for o in inv['effective_ledger']['occurrences'].values() if o['occurrence']['ability_key']=='own_start_hand_at_most_two_draw');self.assertEqual(row['status'],'ineligible')
   result=api.step(e,initial(),l,api.StartAdapter());self.assertEqual(api.validate(result,initial(),api.StartAdapter()),[]);return {}
  runtime.operation(initial(),run)
 def test_no_remaining_executable_action_closes_without_drawing_policy_randomness(self):
  from test_proxy_population_trigger_connection import both
  def run(forced):
   e,l,proof=both();only=[o for o in proof['occurrences'] if o['ability_key']=='own_start_hand_at_most_two_draw'];l=ledger.observe(ledger.create('A'),only,'empty');p=e['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
   result=api.step(e,initial(),l,api.StartAdapter());self.assertIsNone(result['decision']);self.assertEqual(result['chosen']['action'],'close_ineligible');self.assertIsNone(ledger.offer(result['after_ledger']));self.assertEqual(result['before_envelope']['legacy_continuation']['game_state'],result['after_envelope']['legacy_continuation']['game_state']);self.assertEqual(api.validate(result,initial(),api.StartAdapter()),[]);return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
