"""Prepared-predicate coverage binds a main/companion activation origin to its live link."""
import copy,unittest
from test_proxy_population_concealed_origin import activated
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_challenge_window as connected
import proxy_population_prepared_predicates as api
import proxy_continuation_actions as actions
import proxy_population_activation_reference as references


def receipted(after):
 """Attach the live runtime's activation receipt to the fixture's board link."""
 e=copy.deepcopy(after);link=e['legacy_continuation']['activation_zone'][-1];before=copy.deepcopy(e);before['event_seq']-=1
 link['activation_receipt']=references.receipt(before,e,link);return e


class PreparedActivationOriginTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  with connected.contract_scope():base.operation(initial(),run)

 def test_paid_draw_origin_is_bound_and_the_concealed_exclusion_verified(self):
  def run():
   after,history,hidden=activated();after=receipted(after);after['legacy_continuation']['response_context']['priority_actor']='B'
   inv=actions.response_inventory(after,initial(),history)
   proof=api.audit(after,history,inv)
   self.assertEqual(proof['errors'],[]);self.assertEqual(proof['unproved_public_effects'],[])
   self.assertTrue(proof['prepared_predicates_verified']);self.assertEqual(len(proof['verified_preparations']),1)
   self.assertEqual([r['status'] for r in proof['public_effect_routes']],['registered_no_person_removal'])
  self.run_case(run)

 def test_unbound_or_forged_activation_origin_stays_unproved(self):
  def run():
   after,history,hidden=activated();after=receipted(after);after['legacy_continuation']['response_context']['priority_actor']='B'
   inv=actions.response_inventory(after,initial(),history)
   forged=copy.deepcopy(history);forged[-1]['chain_link_id']='response-link-forged'
   proof=api.audit(after,forged,inv)
   self.assertFalse(proof['prepared_predicates_verified']);self.assertIn('origin_effect_not_bound_to_current_public_link',[r.get('reason') for r in proof['unproved_public_effects']])
   other=copy.deepcopy(history);other[-1]['action_type']='activate_unknown_ability'
   self.assertFalse(api.audit(after,other,inv)['prepared_predicates_verified'])
  self.run_case(run)


if __name__=='__main__':unittest.main()


class ReplacementCoverageTests(unittest.TestCase):
 def test_bond_exclusion_for_the_paid_draw_origin_passes_the_coverage_audit(self):
  from test_proxy_population_concealed_origin import with_bond
  def run(forced):
   after,history,hidden=activated();after=receipted(after);e,bond=with_bond(after);e['legacy_continuation']['response_context']['priority_actor']='B'
   inv=actions.response_inventory(e,initial(),history)
   proof=api.audit(e,history,inv)
   self.assertEqual(proof['errors'],[]);self.assertTrue(proof['equipment_predicates_verified']);self.assertEqual([r['source_instance_id'] for r in proof['verified_equipment']],[bond])
   return {}
  with connected.contract_scope():base.operation(initial(),run)
