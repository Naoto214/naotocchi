import copy,unittest
import test_proxy_continuation_challenge as fixtures
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_continuation_challenge as challenge
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
try:import proxy_population_growth_runtime as api
except ImportError:api=None

class GrowthRuntimeTests(unittest.TestCase):
 def test_board_growth_cap_and_verified_provenance_use_actual_delta(self):
  from unittest.mock import patch
  from test_proxy_population_trigger_latching import case
  import proxy_continuation_state as state
  import proxy_continuation_triggers as triggers
  import proxy_continuation_end as end
  def run(forced):
   e,_,_,_=case();g=e['legacy_continuation']['game_state'];p=g['players']['A'];link=e['legacy_continuation']['activation_zone'][-1];p['discard'].append(link['source_instance_id']);source=next(s for s in p['deck']+p['hand'] if g['cards'][s]['card_id']=='W-countryside');(p['deck'] if source in p['deck'] else p['hand']).remove(source)
   if p['board']['world']:p['discard'].append(p['board']['world'])
   p['board']['world']=source;p['growth']=100;link.update(source_instance_id=source,card_id='W-countryside',card_copy_id=g['cards'][source]['card_copy_id'],action_type='activate_board_ability',source_zone='board',candidate_variant=None,payment={'time':0});current=state.current(e)
   with patch.object(end,'verify_new_events',return_value=[dict(event_seq=e['event_seq']+1,card_id='W-countryside',certain_growth_difference=5)]),api.scope():
    result=triggers.resolve(current,initial());event=result['new_events'][0];after=state.advance(e,result['new_snapshots'][0]['continuation_state'],event['seq'])
    self.assertEqual(after['legacy_continuation']['game_state']['players']['A']['growth'],100);self.assertEqual(event['result']['growth_added'],0);self.assertEqual(event['application_evidence']['status'],'not_applied')
    self.assertEqual(end.verify_new_events([event],[],[e,after])[0]['certain_growth_difference'],0)
   return {}
  base.operation(initial(),run)
 def test_connected_scope_overrides_native_hardcoded_growth_provenance(self):
  from unittest.mock import patch
  from contextlib import nullcontext
  import proxy_population_challenge_window as window
  from test_proxy_population_trigger_latching import case
  import proxy_continuation_state as state
  import proxy_continuation_triggers as triggers
  import proxy_continuation_end as end
  def run(forced):
   e,_,_,_=case();g=e['legacy_continuation']['game_state'];p=g['players']['A'];link=e['legacy_continuation']['activation_zone'][-1];p['discard'].append(link['source_instance_id']);source=next(s for s in p['deck']+p['hand'] if g['cards'][s]['card_id']=='W-countryside');(p['deck'] if source in p['deck'] else p['hand']).remove(source)
   if p['board']['world']:p['discard'].append(p['board']['world'])
   p['board']['world']=source;p['growth']=100;link.update(source_instance_id=source,card_id='W-countryside',card_copy_id=g['cards'][source]['card_copy_id'],action_type='activate_board_ability',source_zone='board',candidate_variant=None,payment={'time':0});current=state.current(e)
   with nullcontext():
    result=triggers.resolve(current,initial());event=result['new_events'][0];after=state.advance(e,result['new_snapshots'][0]['continuation_state'],event['seq'])
    self.assertEqual(after['legacy_continuation']['game_state']['players']['A']['growth'],100);self.assertEqual(event['result']['growth_added'],0);self.assertEqual(event['application_evidence']['status'],'not_applied')
    self.assertEqual(end.verify_new_events([event],[],[e,after])[0]['certain_growth_difference'],0)
   return {}
  with patch.object(end,'verify_new_events',return_value=[]),window.contract_scope():base.operation(initial(),run)
 def test_closed_end_expires_known_modifiers_at100_without_deciding_victory(self):
  from test_proxy_population_trigger_latching import case
  def run(forced):
   e,_,_,_=case();e=payments.upgrade(e);c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];p['discard'].append(c['activation_zone'][-1]['source_instance_id']);c['activation_zone']=[];c['pending_triggers']=[];c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=2);g['phase']='turn_end';c['return_target']='turn_end';p['growth']=100
   source=next(s for s,v in g['cards'].items() if v['card_id']=='E-big-illness');payments.add_stat_modifier(e,'A',source,p['board']['main']);original=copy.deepcopy(e)
   with api.scope():r=payments.expire(e)
   self.assertEqual(e,original);self.assertEqual(r['new_envelopes'][0]['runtime']['stat_effects'],[]);self.assertEqual(r['new_envelopes'][0]['legacy_continuation']['game_state']['players']['A']['growth'],100);self.assertEqual(r['new_envelopes'][0]['legacy_continuation']['game_state']['phase'],'turn_end');self.assertNotIn('winner',r['new_events'][0])
   return {}
  base.operation(initial(),run)
 def test_challenge_reward_is_bounded_in_state_result_and_hashes(self):
  self.assertIsNotNone(api,'shared runtime upper bound missing');h=fixtures.ChallengeTests();h.setUp()
  def run(forced):
   e=payments.upgrade(h.e);a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power');after,_=challenge.declare(e,a);c=after['legacy_continuation'];g=c['game_state'];g['phase']='challenge_comparison';c['response_context']['consecutive_passes']=2
   source=next(s for s,v in g['cards'].items() if s.startswith('B-') and v['card_id']=='E-big-illness');payments.add_stat_modifier(after,'B',source,g['players']['A']['board']['main']);g['players']['B']['growth']=100
   with api.scope():result=challenge.compare(after)
   event=result['new_events'][0];final=result['new_envelopes'][0];self.assertEqual(event['result']['winner'],'B');self.assertEqual(event['result']['growth_added'],0);self.assertEqual(event['result']['growth_requested'],5);self.assertEqual(final['legacy_continuation']['game_state']['players']['B']['growth'],100);self.assertEqual(final['legacy_continuation']['game_state']['challenge']['result'],event['result'])
   self.assertEqual(api.audit_challenge(result,after),[])
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
