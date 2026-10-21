"""Start group activation -> mixed chain -> fresh response, no new input."""
import copy,unittest
from test_proxy_population_start_obligations import fixture,opened
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_start_obligations as starts
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
try:import proxy_population_trigger_connection as api
except ImportError:api=None

def both():
 e,actor,chicken=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor];item=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-bowtie');(p['hand'] if item in p['hand'] else p['deck']).remove(item);p['board']['prepared'].append(item)
 e['runtime']['attachments'][item]=dict(controller=actor,target_instance_id=chicken,attached_event_seq=1);e['runtime']['public_prepared'][item]=dict(controller=actor,face_up=True,paid_time=2,placed_event_seq=1)
 while len(p['hand'])>2:p['deck'].append(p['hand'].pop())
 o=opened(e,actor);proof=starts.collect(starts.capture(e),o);l=ledger.observe(ledger.create(actor),proof['occurrences'],'empty')
 return o,l,proof

class ConnectionTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_actual_sources_stack_resolve_reverse_then_both_receive_response(self):
  def run(forced):
   before,l,proof=both();adapter=sequential.StartAdapter();current=before
   with api.scope(proof):
    for card in ('C-chicken','I-bowtie'):
     inv=sequential.inventory(current,l,adapter);option=next(r for r in inv['legal_candidate_details'] if r['action']=='activate' and r['activation']['card_id']==card)
     current,events=adapter.activate(current,option['activation'],l['occurrences'][option['occurrence_id']]['occurrence']);l=ledger.consume(l,option['occurrence_id'])
    current=copy.deepcopy(current);current['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
    before_count=len(current['legacy_continuation']['game_state']['players']['A']['hand'])
    one=api.resolve(current,initial());after=state.advance(current,one['new_snapshots'][0]['continuation_state'],one['new_events'][0]['seq'])
    self.assertEqual(len(after['legacy_continuation']['game_state']['players']['A']['hand']),before_count+1);self.assertEqual(len(after['legacy_continuation']['activation_zone']),1)
    two=api.resolve(after,initial());last=state.advance(after,two['new_snapshots'][0]['continuation_state'],two['new_events'][0]['seq'])
    self.assertEqual(last['legacy_continuation']['game_state']['phase'],'response_window');self.assertEqual(last['legacy_continuation']['response_context']['consecutive_passes'],0);self.assertEqual(last['legacy_continuation']['response_context']['priority_actor'],'A')
    self.assertEqual(two['new_events'][0]['processing_boundary']['origin_event_seq'],2)
    self.assertEqual(len(two['new_decisions']),0)
   return {}
  runtime.operation(initial(),run)
 def test_proof_cannot_rebind_to_different_start_source_or_hash(self):
  def run(forced):
   e,l,proof=both();bad=copy.deepcopy(proof);bad['current_envelope_sha256']='0'*64
   with self.assertRaises(ValueError):api.validate_opening(e,bad)
   self.assertEqual(api.validate_opening(e,proof)['origin_authenticated'],False)
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
