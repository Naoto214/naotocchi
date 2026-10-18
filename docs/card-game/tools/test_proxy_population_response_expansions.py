"""Registered response source alternatives, separate from whole legality."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_activation_legality as legality
import proxy_population_paid_draw as paid
import proxy_continuation_quick as quick
import proxy_continuation_state as state
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
try:import proxy_population_response_expansions as api
except ImportError:api=None

def history(e):
 c=state.current(e);actor=c['response_context']['priority_actor']
 return [dict(seq=e['event_seq'],action_type='response_pass',actor=actor,game_state_after_sha256=quick.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=quick.old.start._hash(c))]

def remove_one(inv,source):
 b=copy.deepcopy(inv);row=next(r for r in b['legal_candidate_details'] if r.get('source_instance_id')==source);b['legal_candidate_details'].remove(row);b['legal_candidate_ids']=[r['candidate_id'] for r in b['legal_candidate_details']];return b

class ResponseExpansionTests(unittest.TestCase):
 def test_paid_order_omission_and_mutation_are_rejected(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,_=fixture('M-antlion-08');events=history(e)
   with paid.scope(),legality.scope():
    inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors']);self.assertIn(source,proof['verified_source_ids'])
    self.assertFalse(proof['complete_legal_set_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
    self.assertFalse(api.audit(e,events,remove_one(inv,source))['registered_expansions_verified'])
    bad=copy.deepcopy(inv);row=next(r for r in bad['legal_candidate_details'] if r.get('source_instance_id')==source);row['cost_instance_ids'].reverse()
    self.assertFalse(api.audit(e,events,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_seven_declarations_survive_empty_deck_and_source_coverage(self):
  self.assertIsNotNone(api)
  from test_proxy_population_activation_legality import fixture as hand_fixture
  def run(forced):
   e,actor,source=hand_fixture('G-hit-blow',1);e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3;events=history(e)
   with legality.scope():
    inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
    self.assertEqual(len([r for r in inv['legal_candidate_details'] if r.get('source_instance_id')==source]),7)
    self.assertFalse(api.audit(e,events,remove_one(inv,source))['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_unchecked_source_is_not_absence_and_shared_context_is_restored(self):
  from test_proxy_population_activation_legality import fixture as hand_fixture
  import proxy_continuation_batch as batch
  def run(forced):
   e,actor,source=hand_fixture('I-c_coin2',1);e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3;events=history(e)
   with legality.scope():
    inv=quick.actions.response_inventory(e,initial(),events);prior=(batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME)
    proof=api.audit(e,events,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
    self.assertIn(source,[r['source_instance_id'] for r in proof['unproved_sources']])
    self.assertNotIn(source,proof['verified_source_ids'])
    self.assertIs(batch.RESPONSE_FULL_CURRENT,prior[0]);self.assertIs(batch.RESPONSE_FULL_RUNTIME,prior[1])
    bad=copy.deepcopy(inv);bad['actor']='B' if actor=='A' else 'A'
    self.assertFalse(api.audit(e,events,bad)['registered_expansions_verified'])
    self.assertIs(batch.RESPONSE_FULL_CURRENT,prior[0]);self.assertIs(batch.RESPONSE_FULL_RUNTIME,prior[1])
   return {}
  runtime.operation(initial(),run)

class ConnectedResponseExpansionTests(unittest.TestCase):
 def test_actual_entries_export_registered_and_unproved_scopes(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  record=connected.reconstruct(bundle(),'test-1A',4)
  entries=[s for s in record['runtime']['steps'] if s['decision'] is not None and s['decision'].get('decision_kind')=='response_action']
  self.assertTrue(entries)
  for step in entries:
   proof=step['response_candidate_expansions']
   self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
   self.assertFalse(proof['complete_legal_set_proven']);self.assertIsNone(proof['policy_eligible'])

if __name__=='__main__':unittest.main()
