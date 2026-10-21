"""A start effect still resolves after an arrival group inside the same start window rebased the context origin."""
import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as runtime
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_connection as api
import proxy_continuation_state as state


def resolving(origin_offset):
 """Activate both start sources, then mark the chain resolving with the context origin moved by origin_offset.

 group-031-B-first 207..219: start origin 207, a W-city arrival activation at 211 left
 origin_event_seq 210 in the live context when the C-chicken link came up for resolution.
 """
 before,l,proof=both();adapter=sequential.StartAdapter();current=before
 with api.scope(proof):
  for card in ('C-chicken','I-bowtie'):
   inv=sequential.inventory(current,l,adapter);option=next(r for r in inv['legal_candidate_details'] if r['action']=='activate' and r['activation']['card_id']==card)
   current,events=adapter.activate(current,option['activation'],l['occurrences'][option['occurrence_id']]['occurrence']);l=ledger.consume(l,option['occurrence_id'])
 current=copy.deepcopy(current);current['event_seq']+=3;ctx=current['legacy_continuation']['response_context'];ctx.update(chain_status='resolving',consecutive_passes=2,origin_event_seq=proof['origin_event_seq']+origin_offset)
 return current,proof


class StartResolutionAfterArrivalTests(unittest.TestCase):
 def test_rebased_origin_within_the_window_resolves_like_the_start_origin(self):
  def run(forced):
   same,proof=resolving(0);moved,_=resolving(2)
   with api.scope(proof):
    expected=api.resolve(same,initial());actual=api.resolve(moved,initial())
   strip=lambda e:{k:v for k,v in e.items() if 'sha256' not in k}
   for result in (expected,actual):self.assertEqual(result['new_events'][0]['action_type'],'resolve_board_ability')
   # First link: same effect; the moved origin is simply carried until the last link restarts the window.
   self.assertEqual(canonical(strip(expected['new_events'][0])),canonical(strip(actual['new_events'][0])))
   advance=lambda e,r:state.advance(e,r['new_snapshots'][0]['continuation_state'],r['new_events'][0]['seq'])
   with api.scope(proof):
    last_expected=api.resolve(advance(same,expected),initial());last_actual=api.resolve(advance(moved,actual),initial())
   for result in (last_expected,last_actual):self.assertEqual(result['new_events'][0]['processing_boundary']['origin_event_seq'],proof['origin_event_seq'])
   self.assertEqual(canonical(strip(last_expected['new_events'][0])),canonical(strip(last_actual['new_events'][0])))
   self.assertEqual(last_expected['new_snapshots'][0]['continuation_state']['response_context'],last_actual['new_snapshots'][0]['continuation_state']['response_context'])
   return {}
  runtime.operation(initial(),run)

 def test_origin_before_the_capture_other_window_or_other_turn_player_still_fails(self):
  def run(forced):
   earlier,proof=resolving(-1)
   other,_=resolving(1);other['legacy_continuation']['response_context']['window_kind']='after_normal_action'
   future,_=resolving(1);future['legacy_continuation']['response_context']['origin_event_seq']=future['event_seq']+1
   swapped,_=resolving(1);swapped['legacy_continuation']['game_state']['turn_player']='B' if swapped['legacy_continuation']['game_state']['turn_player']=='A' else 'A'
   with api.scope(proof):
    for bad in (earlier,other,future,swapped):
     with self.assertRaises(ValueError):api.resolve(bad,initial())
   return {}
  runtime.operation(initial(),run)


if __name__=='__main__':unittest.main()
