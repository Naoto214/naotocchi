"""An arrival group still open at the end boundary does not swallow the end window's own source group."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_city_predicates import fixture as city_fixture
from test_proxy_population_runtime import initial
from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_trigger_sequential as sequential
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state


def fixture():
 """Own-turn W-city arrival group inside the end-request response window (group-014-A-first 75..81 shape).

 The turn player's main is M-beetle-02, an end source whose own_turn_end group
 opens when both players pass and the turn end window opens.
 """
 e,h,o=city_fixture();c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 beetle=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-beetle-02');p['deck'].remove(beetle);p['board']['main']=beetle
 g['phase']='turn_end_response';c['return_target']='turn_end';c['response_context'].update(source_phase='turn_end')
 proof=existing.ExistingAdapter(h).proof(e)
 assert proof['group_kind']=='arrival' and [r['source_instance_id'] for r in proof['occurrences']]==[o['source_instance_id']]
 return e,h,proof,beetle


def decline(_initial,_current,_actor,options,*address):
 option=next(r for r in options if r['action']=='decline_group');key=canonical(option).decode()
 return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)


class EndWindowAfterArrivalTests(unittest.TestCase):
 def prepare(self):
  def run(forced):
   e,h,proof,beetle=fixture();return dict(e=e,h=h,proof=proof,beetle=beetle,shots=[triggers.old._snapshot(state.current(e))])
  with connected.contract_scope():return runtime.operation(initial(),run)

 def test_end_group_is_observed_and_offered_while_an_arrival_group_is_open(self):
  p=self.prepare()
  with patch.object(sequential.choices,'resolve',side_effect=decline):
   result=connected.segment(p['e'],initial(),p['h'],p['shots'],[p['e']],7,p['proof'])
  # Seven steps: the synthetic prefix carries no complete end history, so stop before turn end completion.
  self.assertIsNone(result['stop'],result['stop']);self.assertTrue(result['step_limit_reached'])
  kinds=[e['action_type'] for e in result['events']]
  self.assertIn('open_turn_end_triggers',kinds)
  opened=kinds.index('open_turn_end_triggers');self.assertEqual(kinds[opened+1],'decline_trigger_group')
  rows=[(r['occurrence']['source_instance_id'],r['occurrence']['ability_key'],r['status']) for r in result['trigger_ledger']['occurrences'].values()]
  self.assertIn((p['beetle'],'own_turn_end','declined'),rows)
  self.assertEqual(len(result['trigger_records']),2)
  self.assertTrue(result['supported_trigger_coverage']['processing_order']['phase_order_verified'])
  self.assertEqual(result['supported_trigger_coverage']['missing_occurrence_ids'],[])


if __name__=='__main__':unittest.main()
