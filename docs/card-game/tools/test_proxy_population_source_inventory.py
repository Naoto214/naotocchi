"""Current source/variant coverage; not a second game executor."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_continuation_candidates as candidates
import proxy_population_activation_legality as legality
from test_proxy_population_activation_legality import fixture
from test_proxy_population_runtime import initial
try:import proxy_population_source_inventory as api
except ImportError:api=None

class SourceInventoryTests(unittest.TestCase):
 def test_source_and_variant_omissions_do_not_disappear_with_legal_projection(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,actor,source=fixture('E-first-date',1);e['legacy_continuation']['game_state']['phase']='normal_action'
   with legality.scope():
    inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
    self.assertTrue(proof['source_and_variant_coverage_verified'],proof['errors'])
    self.assertFalse(proof['complete_legal_set_proven']);self.assertFalse(proof['information_use_proven'])
    self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted'])
    def rebuild_projection(b):
     b['legal_candidate_details']=sorted((r for r in b['enumeration_units'] if r['disposition']=='admitted'),key=lambda r:r['candidate_id']);b['legal_candidate_ids']=[r['candidate_id'] for r in b['legal_candidate_details']]
    for mutate in (lambda b:b.update(enumeration_units=[r for r in b['enumeration_units'] if r['source_instance_id']!=source]),lambda b:b.update(enumeration_units=[r for r in b['enumeration_units'] if not(r['action_type']=='challenge' and r['candidate_variant']=='wisdom')]),lambda b:b['enumeration_units'].append(copy.deepcopy(b['enumeration_units'][0]))):
     bad=copy.deepcopy(inv);mutate(bad);rebuild_projection(bad)
     self.assertFalse(api.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    for field in ('source_instance_id','card_id','source_zone'):
     bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==source);u[field]='wrong-binding';rebuild_projection(bad)
     self.assertFalse(api.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    bad=copy.deepcopy(inv);bad['legal_candidate_ids'].pop()
    self.assertFalse(api.audit_normal(e,bad)['source_and_variant_coverage_verified'])
   return {}
  runtime.operation(initial(),run)


class ResponseSourceTests(unittest.TestCase):
 def test_response_sources_cannot_be_removed_with_their_candidate(self):
  import proxy_continuation_quick as quick
  import proxy_continuation_state as state
  def run(forced):
   e,actor,source=fixture('E-first-date',0);e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3
   c=state.current(e);event=dict(seq=3,action_type='response_pass',actor=actor,game_state_after_sha256=quick.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=quick.old.start._hash(c))
   with legality.scope():
    opportunity=quick.actions.response_inventory(e,initial(),[event]);proof=api.audit_response(e,opportunity)
    self.assertTrue(proof['source_coverage_verified'],proof['errors']);self.assertFalse(proof['complete_legal_set_proven'])
    bad=copy.deepcopy(opportunity);bad['legal_candidate_details']=[r for r in bad['legal_candidate_details'] if r.get('source_instance_id')!=source];bad['legal_candidate_ids']=[r['candidate_id'] for r in bad['legal_candidate_details']]
    bad['excluded_candidates']=[r for r in bad['excluded_candidates'] if r.get('source_instance_id')!=source]
    self.assertFalse(api.audit_response(e,bad)['source_coverage_verified'])
    bad=copy.deepcopy(opportunity);bad['actor']='B' if actor=='A' else 'A'
    self.assertFalse(api.audit_response(e,bad)['source_coverage_verified'])
   return {}
  runtime.operation(initial(),run)


class ConnectedSourceTests(unittest.TestCase):
 def test_actual_normal_and_response_entries_carry_source_audits(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  record=connected.reconstruct(bundle(),'test-1A',4)
  audits=[step['decision_source_inventory'] for step in record['runtime']['steps'] if step['decision'] is not None]
  self.assertTrue(audits)
  self.assertTrue(any(a['schema'].startswith('current_normal') for a in audits))
  self.assertTrue(any(a['schema'].startswith('current_response') for a in audits))
  for proof in audits:
   self.assertFalse(proof['errors']);self.assertFalse(proof['complete_legal_set_proven'])

if __name__=='__main__':unittest.main()
