"""No old-instance reentry until the common105 allocator is connected."""
import unittest
from test_proxy_population_departure import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_departure as departure
import proxy_continuation_candidates as candidates
try:import proxy_population_instance_boundary as api
except ImportError:api=None

class InstanceTests(unittest.TestCase):
 def test_direct_replacement_rejects_old_instance_reentry(self):
  e,source,_=fixture();history=[dict(seq=1,actor='A',action_type='person_placement',source_instance_id=source)]
  def run(forced):
   current=base.engine.payments.upgrade(e);a=next(a for a in candidates.audit(current,history)['legal_candidate_details'] if a['action_type']=='place_companion')
   with self.assertRaisesRegex(ValueError,'incarnation'):departure.replace_companion(current,a,history)
   return {}
  base.operation(initial(),run)
 def test_common_entry_guard_covers_all_board_entry_families_and_restores(self):
  self.assertIsNotNone(api)
  for action in ('place_companion','place_partner','play_main','place_world','attach_item','set_item'):
   with self.subTest(action=action):
    with self.assertRaisesRegex(ValueError,'incarnation'):api.require_initial_entry(dict(action_type=action,source_instance_id='A-001#1'),[dict(action_type='person_placement',source_instance_id='A-001#1')])
  api.require_initial_entry(dict(action_type='place_companion',source_instance_id='A-001#1'),[dict(action_type='person_placement',source_instance_id='A-002#1')])
  import proxy_continuation_actions as actions
  old=actions.apply
  with api.scope():
   with self.assertRaisesRegex(ValueError,'incarnation'):actions.apply({},dict(selected_action=dict(action_type='place_companion',source_instance_id='A-001#1')),dict(public_events=[dict(action_type='person_placement',source_instance_id='A-001#1')]))
  self.assertIs(actions.apply,old)
if __name__=='__main__':unittest.main()
