"""77 I-bowtie start draw: no resolution-time choice, proved outside the scope."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_connection import both
from test_proxy_population_resolution_choices import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_connection as connection
import proxy_population_resolution_choices as api
import proxy_population_start_obligations as starts
import proxy_continuation_rules as rules
import proxy_continuation_batch as batch


def resolving_start_draw():
 """Activate I-bowtie at an actual start window, then leave the connection scope."""
 before,l,proof=both();adapter=sequential.StartAdapter();current=before
 with connection.scope(proof):
  inv=sequential.inventory(current,l,adapter)
  option=next(r for r in inv['legal_candidate_details'] if r['action']=='activate' and r['activation']['card_id']=='I-bowtie')
  current,events=adapter.activate(current,option['activation'],l['occurrences'][option['occurrence_id']]['occurrence']);l=ledger.consume(l,option['occurrence_id'])
 current=copy.deepcopy(current);current['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
 return current,proof


class BowtieResolutionChoiceTests(unittest.TestCase):
 def test_start_draw_resolution_is_source_proven_no_choice(self):
  def run(forced):
   current,proof=resolving_start_draw();self.assertNotIn('I-bowtie',batch.CAPABILITIES)
   result=api.audit(current,initial(),[])
   self.assertEqual(result['errors'],[]);self.assertEqual(result['route'],'source_proven_no_resolution_choice');self.assertEqual(result['required_choice_count'],0)
   self.assertTrue(result['resolution_choice_obligation_verified']);self.assertEqual(result['handler'],'proxy_population_trigger_connection.resolve:draw_only')
   row=starts.catalog()['cards']['I-bowtie'];d=result['descriptor']
   self.assertEqual((d['reference'],d['source_raw_sha256'],d['semantic_section_sha256'],d['draw_count']),(row['reference'],row['source_raw_sha256'],row['section_sha256'],1))
   self.assertFalse(result['activation_legality_proven']);self.assertFalse(result['effect_semantics_proven'])
   return {}
  runtime.operation(initial(),run)

 def test_start_draw_rejects_extra_record_and_malformed_links(self):
  def run(forced):
   current,proof=resolving_start_draw()
   extra=api.audit(current,initial(),[dict(decision_kind='mandatory_choice')])
   self.assertFalse(extra['resolution_choice_obligation_verified']);self.assertIn('extra resolution choice on source-proven no-choice route',extra['errors'])
   for mutate in (lambda l:l.update(target_instance_ids=['A-001#1']),lambda l:l.update(candidate_variant='x'),lambda l:l.update(payment=dict(time=1))):
    bad=copy.deepcopy(current);mutate(bad['legacy_continuation']['activation_zone'][-1])
    result=api.audit(bad,initial(),[])
    with self.subTest(errors=result['errors']):self.assertEqual(result['route'],'unproved');self.assertIn('start draw activated link differs',result['errors'])
   link=copy.deepcopy(current['legacy_continuation']['activation_zone'][-1])
   for mutate in (lambda l:l.update(source_zone='hand'),lambda l:l.update(action_type='use_item'),lambda l:l.update(card_id='C-box')):
    bad=copy.deepcopy(link);mutate(bad)
    with self.assertRaises(ValueError):connection.start_draw_descriptor(bad)
   return {}
  runtime.operation(initial(),run)

 def test_catalog_or_fragment_drift_fails_closed(self):
  def run(forced):
   current,proof=resolving_start_draw();row=copy.deepcopy(starts.catalog())
   drifted=copy.deepcopy(row);drifted['cards']['I-bowtie']['start_kind']='none'
   with patch.object(starts,'catalog',return_value=drifted):
    result=api.audit(current,initial(),[]);self.assertEqual(result['route'],'unproved');self.assertIn('start equipment source contract differs',result['errors'])
   cap=dict(rules.classification('I-bowtie'),timing='own_turn_end')
   with patch.object(rules,'classification',return_value=cap):
    result=api.audit(current,initial(),[]);self.assertEqual(result['route'],'unproved');self.assertIn('start draw capability differs',result['errors'])
   return {}
  runtime.operation(initial(),run)

 def test_connected_step_resolves_start_draw(self):
  def run(forced):
   current,proof=resolving_start_draw();hand=len(current['legacy_continuation']['game_state']['players']['A']['hand'])
   def native(e,i,*unused):
    with connection.scope(proof):return connection.resolve(e,i)
   result=runtime._step(current,initial(),[],[],[],native)
   ob=result['resolution_choice_obligation'];self.assertEqual(ob['route'],'source_proven_no_resolution_choice');self.assertTrue(ob['resolution_choice_obligation_verified'])
   self.assertEqual(result['resolution_choice_input_binding']['route'],'source_proven_no_resolution_choice')
   self.assertEqual([e['action_type'] for e in result['events']],['resolve_board_ability'])
   self.assertEqual(len(result['final_envelope']['legacy_continuation']['game_state']['players']['A']['hand']),hand+1)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_other_cards_unchanged(self):
  def run(forced):
   e,actor,source=fixture('C-box');self.assertEqual(api.audit(e,initial(),[])['route'],'unproved')
   link=dict(card_id='C-chicken',source_zone='board',action_type='activate_board_ability',payment=dict(time=0),target_instance_ids=[],candidate_variant=None)
   self.assertEqual(api.no_choice_route(link)[0],'proxy_population_start_effects.resolve_chicken:deterministic_reveal')
   return {}
  runtime.operation(initial(),run)


if __name__=='__main__':unittest.main()
