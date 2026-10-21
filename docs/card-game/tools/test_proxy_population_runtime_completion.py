import unittest
from test_proxy_population_runtime import boundary,initial
import proxy_population_runtime as base
import proxy_population_departure as departure
try:import proxy_population_runtime_completion as api
except ImportError:api=None
class CompletionTests(unittest.TestCase):
 def test_shared_segment_and_scope_restore(self):
  self.assertIsNotNone(api);e,_=boundary();original=base.operation
  r=api.segment(e,initial(),[],[],[e],3)
  self.assertIs(base.operation,original);self.assertEqual(len(r['decisions']),3);self.assertIsNone(r['stop']);self.assertFalse(r['ready_for_execution'])
 def test_invalid_limit_restores_operation(self):
  self.assertIsNotNone(api);e,_=boundary();original=base.operation
  with self.assertRaises(ValueError):api.segment(e,initial(),[],[],[e],False)
  self.assertIs(base.operation,original)
class ReentryTests(unittest.TestCase):
 def test_extension_scope_reentry_is_rejected_before_hook_replacement(self):
  from contextlib import contextmanager
  from unittest.mock import patch
  e,_=boundary();i=initial();original=base.operation;real=departure.scope
  @contextmanager
  def nesting():
   with self.assertRaisesRegex(ValueError,'reentry'):api.segment(e,i,[],[],[e],1)
   with real():yield
  with patch.object(departure,'scope',nesting):api.segment(e,i,[],[],[e],1)
  real_step=base._step
  def step(*args,**kwargs):
   with self.assertRaisesRegex(ValueError,'reentry'):api.segment(e,i,[],[],[e],1)
   return real_step(*args,**kwargs)
  with patch.object(base,'_step',step):api.segment(e,i,[],[],[e],1)
  self.assertIs(base.operation,original)
if __name__=='__main__':unittest.main()
