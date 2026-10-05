"""A source may leave after activation; identity and origin remain auditable."""
import copy,unittest
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:import proxy_population_activation_reference as api
except ImportError:api=None

class ReferenceTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_receipt_keeps_actual_activation_hash_and_survives_source_departure(self):
  def run(forced):
   before=case();c=before['legacy_continuation'];source=c['game_state']['players']['A']['board']['world'];c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0)
   history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='place_world',source_instance_id=source),dict(seq=3,actor='A',action_type='use_item',source_instance_id=next(s for s,v in c['game_state']['cards'].items() if v['card_id']=='I-c_coin2' and s.startswith('A-')))]
   with api.scope():
    action=triggers.board_candidates(state.current(before),history,source,'world')[0][0]
    after,events=triggers.activate(before,dict(selected_action=action),history)
    receipt=after['legacy_continuation']['activation_zone'][0]['activation_receipt'];self.assertEqual(receipt['before_envelope_sha256'],state.canonical_sha256(before));self.assertFalse(receipt['origin_authenticated'])
    departed=copy.deepcopy(after);p=departed['legacy_continuation']['game_state']['players']['A'];p['board']['world']=None;p['discard'].append(source);state.validate(departed)
    bad=copy.deepcopy(departed);bad['legacy_continuation']['activation_zone'][0]['activation_receipt']['card_copy_id']='B-999'
    with self.assertRaises(ValueError):state.validate(bad)
    self.assertEqual(events[0]['envelope_after_sha256'],state.canonical_sha256(after))
   with self.assertRaises(ValueError):state.validate(departed)
   return {}
  runtime.operation(initial(),run)
 def test_receipt_cannot_be_minted_for_a_non_board_source(self):
  def run(forced):
   after=case();before=copy.deepcopy(after);before['event_seq']=2;before['legacy_continuation']['activation_zone']=[];source=after['legacy_continuation']['activation_zone'][0]['source_instance_id'];p=before['legacy_continuation']['game_state']['players']['A'];p['board']['world']=None;p['hand'].append(source)
   with self.assertRaises(ValueError):api.receipt(before,after,after['legacy_continuation']['activation_zone'][0])
   return {}
  runtime.operation(initial(),run)
 def test_normal_source_cost_uses_same_origin_receipt(self):
  from test_proxy_population_discard_recovery import fixture
  import proxy_population_discard_recovery as recovery
  import proxy_continuation_candidates as candidates
  e,events,source,target=fixture();e['legacy_continuation']['game_state']['phase']='normal_action'
  def run(forced):
   with recovery.scope(),api.scope():
    before=runtime.engine.payments.upgrade(e);a=next(a for a in candidates.audit(before,events)['legal_candidate_details'] if a['action_type']=='activate_companion_ability');after,_=recovery.activate_normal(before,a,events)
    self.assertIn('activation_receipt',after['legacy_continuation']['activation_zone'][-1]);state.validate(after)
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
