"""A partial predicate audit must not silently authorize a current action."""
import unittest
from unittest.mock import patch
import proxy_population_board_predicates as normal
import proxy_population_response_composition as response
import proxy_population_connected_entry as connected
from test_proxy_mandatory_population_input import bundle

class PredicateGateTests(unittest.TestCase):
 def test_incomplete_normal_predicates_stop_before_exporting_the_action(self):
  native=normal.compose
  def incomplete(*args,**kwargs):
   proof=native(*args,**kwargs);self.assertEqual(proof['errors'],[])
   proof.update(supplied_normal_unit_predicates_covered=False,unproved_enumeration_unit_ids=['missing-component-unit']);return proof
  with patch.object(normal,'compose',incomplete):r=connected.reconstruct(bundle(),'test-1A',4)
  self.assertIsNotNone(r['runtime']['stop'],'normal partial coverage was accepted')
  self.assertIn('current predicate coverage incomplete',r['runtime']['stop']['detail'])
  self.assertFalse(any(s['decision'] and s['decision'].get('context',{}).get('decision_kind')=='normal_action' for s in r['runtime']['steps']))
 def test_incomplete_response_predicates_stop_before_exporting_the_action(self):
  native=response.audit
  def incomplete(*args,**kwargs):
   proof=native(*args,**kwargs);self.assertEqual(proof['errors'],[])
   if len(args)>=4 or kwargs.get('group_closure') is not None:proof.update(supplied_response_source_predicates_covered=False,unproved_source_ids=['missing-component-source'])
   return proof
  with patch.object(response,'audit',incomplete):r=connected.reconstruct(bundle(),'test-1A',4)
  self.assertIsNotNone(r['runtime']['stop'],'response partial coverage was accepted')
  self.assertIn('current predicate coverage incomplete',r['runtime']['stop']['detail'])
  self.assertFalse(any(s['decision'] and s['decision'].get('decision_kind')=='response_action' for s in r['runtime']['steps']))

if __name__=='__main__':unittest.main()
