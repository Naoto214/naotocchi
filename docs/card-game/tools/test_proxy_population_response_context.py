"""Internal projections must retain the outer actual challenge/runtime context."""
import unittest
import proxy_population_runtime as runtime
import proxy_continuation_batch as batch
import proxy_continuation_preparation as preparation
from test_proxy_population_runtime import initial
from test_proxy_population_hand_timing import fixture
try:import proxy_population_response_context as api
except ImportError:api=None

class ResponseContextTests(unittest.TestCase):
 def test_concealed_slot_projection_preserves_legal_challenge_modifier_candidate(self):
  self.assertIsNotNone(api)
  def run(forced):
   previous=(batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME)
   with api.scope():
    p=fixture(mixed=True,inventory_only=True)
    self.assertIn(p['played'],[r.get('source_instance_id') for r in p['inventory']['legal_candidate_details']])
   self.assertIs(batch.RESPONSE_FULL_CURRENT,previous[0]);self.assertIs(batch.RESPONSE_FULL_RUNTIME,previous[1]);return {}
  runtime.operation(initial(),run)
 def test_nested_scope_and_delegate_exception_restore_context(self):
  self.assertIsNotNone(api)
  from unittest.mock import patch
  def run(forced):
   p=fixture(mixed=True,inventory_only=True);e=p['before'];outer={'last_valid_event_seq':e['event_seq'],'actual_marker':True};outer_runtime={'actual_modifier':True}
   previous=(batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME);original=preparation.response_inventory
   def inner(envelope,initial,events,delegate):
    before=(batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME)
    try:
     batch.RESPONSE_FULL_CURRENT={'projection':True};batch.RESPONSE_FULL_RUNTIME={}
     return delegate(envelope,initial,events)
    finally:batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME=before
   def fail(*args):
    self.assertIs(batch.RESPONSE_FULL_CURRENT,outer);self.assertIs(batch.RESPONSE_FULL_RUNTIME,outer_runtime);raise ValueError('unit-delegate')
   try:
    batch.RESPONSE_FULL_CURRENT=outer;batch.RESPONSE_FULL_RUNTIME=outer_runtime
    with patch.object(preparation,'response_inventory',inner),api.scope():
     with self.assertRaisesRegex(ValueError,'reentry'):
      with api.scope():pass
     with self.assertRaisesRegex(ValueError,'unit-delegate'):preparation.response_inventory(e,{},[],fail)
    self.assertIs(batch.RESPONSE_FULL_CURRENT,outer);self.assertIs(batch.RESPONSE_FULL_RUNTIME,outer_runtime)
    self.assertIs(preparation.response_inventory,original)
   finally:batch.RESPONSE_FULL_CURRENT,batch.RESPONSE_FULL_RUNTIME=previous
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
