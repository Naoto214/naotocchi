"""Conditional old executor + complete sequential group + positive effects."""
import copy,unittest
from test_proxy_population_trigger_effects import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_trigger_existing as existing
try:import proxy_population_positive_window as api
except ImportError:api=None

def setup():
 def build(forced):
  e,row=case('M-antlion-06');g=e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='E-boss')
  for z in ('hand','deck'):
   if source in p[z]:p[z].remove(source)
  link=dict(link_id='response-link-3-'+source,action_type='use_event',source_zone='hand',actor='A',card_id='E-boss',card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant=None,payment=dict(time=2),source_references=['91-event-21-card-text-draft.md#E-boss'])
  e['legacy_continuation']['activation_zone']=[link];e['legacy_continuation']['response_context'].update(chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2)
  event=dict(seq=3,action_type='activate_response',actor='A',source_instance_id=source,source_zone='hand',chain_link_id=link['link_id']);history=[event];proof=existing.ExistingAdapter(history).proof(e,3)
  return dict(envelope=e,history=history,proof=proof)
 return base.operation(initial(),build)

class PositiveWindowTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'positive bundle connection missing')
 def test_actual_quick_resolution_latches_group_before_normal_actions(self):
  source=setup();e=source['envelope'];r=api.segment(e,initial(),source['history'],[],[e],4,source['proof'])
  self.assertEqual(r['events'][0]['action_type'],'resolve_immediate_effect');self.assertIsNone(r['stop']);self.assertEqual(len(r['trigger_records']),1);record=r['trigger_records'][0]
  self.assertGreaterEqual(len(record['inventory']['legal_candidate_ids']),2);self.assertEqual(record['decision']['reason_code'],'strategic_unresolved_seeded_fallback');self.assertFalse(r['ready_for_execution']);self.assertTrue(r['positive_timing_proofs'][0]['occurrences'])
  self.assertEqual(api.validate(r,e,initial(),source['history'],[],[e],4,source['proof']),[])
  bad=copy.deepcopy(r);bad['positive_timing_proofs'][0]['occurrences']=[];self.assertTrue(api.validate(bad,e,initial(),source['history'],[],[e],4,source['proof']))
 def test_scopes_restore_and_bad_capture_does_not_suppress_existing_guard(self):
  import proxy_continuation_batch as batch
  import proxy_population_trigger_observation as observation
  import proxy_population_trigger_replay as replay
  before=(base.operation,base._step,batch.guard_applied_effect,batch.guard_resolution_result,observation.observe,observation.Adapter,replay.scope)
  source=setup();e=source['envelope'];api.segment(e,initial(),source['history'],[],[e],4,source['proof'])
  self.assertEqual(before,(base.operation,base._step,batch.guard_applied_effect,batch.guard_resolution_result,observation.observe,observation.Adapter,replay.scope))
 def test_paid_draw_inventory_and_activation_remain_connected_inside_bundle(self):
  from test_proxy_population_paid_draw import fixture
  def build(forced):
   e,source,costs=fixture('M-antlion-02');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players']['A'];p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   event=dict(seq=3,actor='A',action_type='set_item',source_instance_id=costs[0]);history=[event]
   return dict(envelope=e,history=history,proof=existing.ExistingAdapter(history).proof(e,3))
  source=base.operation(initial(),build);e=source['envelope'];r=api.segment(e,initial(),source['history'],[],[e],1,source['proof']);self.assertIsNone(r['stop']);self.assertEqual(len(r['decisions'][0]['inventory']['legal_candidate_ids']),2)

if __name__=='__main__':unittest.main()
