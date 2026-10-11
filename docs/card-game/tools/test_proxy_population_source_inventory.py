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

 def test_shared_normal_projection_cannot_omit_an_owned_hand_source(self):
  from unittest.mock import patch
  import proxy_population_challenge_window as window
  def run(forced):
   e,actor,source=fixture('E-first-date',1);e['legacy_continuation']['game_state']['phase']='normal_action'
   native=candidates.NORMAL_PROJECTION
   def omitted(envelope):
    projected=native(envelope);player=projected['legacy_continuation']['game_state']['players'][actor]
    if source in player['hand']:player['hand'].remove(source)
    return projected
   with patch.object(candidates,'NORMAL_PROJECTION',omitted):
    inv=candidates.audit(e,[])
    self.assertFalse(any(r['source_instance_id']==source for r in inv['enumeration_units']))
    proof=api.audit_normal(e,inv)
    with self.subTest(boundary='audit'):self.assertFalse(proof['source_and_variant_coverage_verified'],proof)
    with self.subTest(boundary='actual_entry'):
     with self.assertRaisesRegex(ValueError,'source inventory'):runtime._step(e,initial(),[],[],[e],forced)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_projection_layers_cannot_shrink_owner_families_or_counts(self):
  from unittest.mock import patch
  def run(forced):
   e,actor,source=fixture('E-first-date',1);g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
   native=candidates.NORMAL_PROJECTION;projector=candidates.old.candidates;public=projector.project_normal_action_information
   factory=candidates.old.normal_audit.board.extension_125;native_sources=factory.inventory_sources
   with legality.scope():
    for mode in ('all_hand','partner','public_hand','public_partner','family_count'):
     def project(envelope):
      result=native(envelope);p=result['legacy_continuation']['game_state']['players'][actor]
      if mode=='all_hand':p['hand']=[]
      if mode=='partner':p['board']['partner']=None
      return result
     def expose(*args,**kwargs):
      result=public(*args,**kwargs);p=result['players'][actor]
      if mode=='public_hand':p['hand'].remove(source)
      if mode=='public_partner':p['board']['partner']=None
      return result
     def sources(view):
      result=native_sources(view)
      if mode=='family_count':result[0]['count']=True
      return result
     with self.subTest(mode=mode),patch.object(candidates,'NORMAL_PROJECTION',project),patch.object(projector,'project_normal_action_information',expose),patch.object(factory,'inventory_sources',sources):
      inventory=candidates.audit(e,[]);proof=api.audit_normal(e,inventory)
      self.assertFalse(proof['source_and_variant_coverage_verified'],proof)
    p=g['players'][actor];p['deck'].extend(p['hand']);p['hand']=[]
    proof=api.audit_normal(e,candidates.audit(e,[]));self.assertTrue(proof['source_and_variant_coverage_verified'],proof)
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


 def test_concealed_preparation_is_retained_as_an_explicit_exclusion(self):
  from test_proxy_population_effect_application_runtime import fixture as prepared_fixture
  import proxy_continuation_quick as quick
  import proxy_continuation_state as state
  def run(forced):
   e,actor,source=prepared_fixture(growth=20);ctx=e['legacy_continuation']['response_context']
   ctx.update(chain_status='building',consecutive_passes=0,origin_event_seq=3)
   current=state.current(e);link=current['activation_zone'][-1]
   event=dict(seq=3,action_type='activate_response',actor=actor,chain_link_id=link['link_id'],game_state_after_sha256=quick.old.start.opening._stop_state_sha256(current['game_state']),continuation_state_after_sha256=quick.old.start._hash(current))
   with legality.scope():
    opportunity=quick.actions.response_inventory(e,initial(),[dict(seq=2,action_type='turn_start_and_egg_draw',actor=actor),event]);proof=api.audit_response(e,opportunity)
    self.assertTrue(proof['source_coverage_verified'],proof['errors'])
    prepared=current['game_state']['players'][actor]['board']['prepared'][0]
    self.assertIn(prepared,proof['covered_source_ids'])
    self.assertTrue(any(row.get('source_instance_id')==prepared for row in opportunity['preparation_exclusions']))
    bad=copy.deepcopy(opportunity);bad['preparation_exclusions']=[]
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
