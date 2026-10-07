"""Audit existing67/89 city mechanics through the actual connected scope order."""
import copy,unittest
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as audit
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_continuation_batch as batch
import proxy_continuation_state as state


def fixture(opponent=False):
 e=case();c=e['legacy_continuation'];g=c['game_state'];g['turn_player']='B' if opponent else 'A'
 c['activation_zone']=[];c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=0,turn_player=g['turn_player'],priority_actor='A',origin_event_seq=5,window_kind='after_normal_action')
 e['event_seq']=5;source=g['players']['A']['board']['world'];cap=batch.classification('W-city')
 history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item'),dict(seq=3,actor=g['turn_player'],action_type='turn_start_and_normal_draw'),dict(seq=4,actor='A',action_type='use_item'),dict(seq=5,actor='A',action_type='use_play')]
 occurrence=dict(origin_event_seq=5,source_instance_id=source,actor='A',category='optional',ability_key=cap['timing'],source_reference=cap['reference'])
 return e,history,occurrence


def run_current(callback):
 with connected.contract_scope():return runtime.operation(initial(),callback)


class CityPredicateTests(unittest.TestCase):
 def test_opponent_turn_second_quick_is_an_existing_optional_group(self):
  def run(forced):
   e,h,o=fixture(True);proof=existing.ExistingAdapter(h).collect(e);self.assertEqual(proof['occurrences'],[o])
   journal=ledger.observe(ledger.create('B'),proof['occurrences'],'empty');inv=sequential.inventory(e,journal,existing.ExistingAdapter(h))
   self.assertEqual(len(inv['legal_candidate_details']),2)
   self.assertTrue(inv['occurrence_proofs'][0]['proof']['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  run_current(run)
 def test_current_turn_boundary_resets_count_and_once_use(self):
  def run(forced):
   e,h,o=fixture(True)
   for event in h[2:]:event['seq']+=1
   h.insert(2,dict(seq=3,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id']))
   e['event_seq']=6;o['origin_event_seq']=6;e['legacy_continuation']['response_context']['origin_event_seq']=6
   rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(len(rows),1)
   h.append(dict(seq=7,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id'],trigger_origin_event_seq=6));e['event_seq']=7
   rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[]);self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  run_current(run)
 def test_city_counts_methods_not_abilities_and_binds_second_origin(self):
  def run(forced):
   for kind in ('main_movement','person_placement','relationship_start','place_world','attach_item','set_item','use_item','use_play','use_event','activate_response'):
    e,h,o=fixture();h[3]['action_type']=kind;o['origin_event_seq']=4
    rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(len(rows),1,kind)
    self.assertEqual(rows[0]['trigger_origin_event_seq'],5);self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
    bad=copy.deepcopy(rows);bad[0]['trigger_origin_event_seq']=4
    self.assertTrue(audit.audit_city(e,o,bad,h)['errors'])
    for changed in ([],rows+rows,[dict(rows[0],base_time_cost=1)],[dict(rows[0],target_instance_ids=['foreign'])]):self.assertTrue(audit.audit_city(e,o,changed,h)['errors'])
   for kind,zone in (('activate_response','board'),('activate_response','prepared'),('relationship_progress',None),('challenge_declared',None)):
    e,h,o=fixture();h[3].update(action_type=kind,source_zone=zone)
    self.assertEqual(existing.ExistingAdapter(h).enumerate(e,o)[0],[])
   return {}
  run_current(run)
 def test_no_retroactive_second_play_when_anchor_is_third(self):
  def run(forced):
   e,h,o=fixture();h.append(dict(seq=6,actor='A',action_type='place_world',source_instance_id=o['source_instance_id']));e['event_seq']=6;o['origin_event_seq']=6
   self.assertEqual(existing.ExistingAdapter(h).enumerate(e,o)[0],[])
   return {}
  run_current(run)
 def test_opponent_turn_activation_uses_native_chain_and_effect(self):
  import proxy_continuation_triggers as triggers
  def run(forced):
   e,h,o=fixture(True);adapter=existing.ExistingAdapter(h);rows,_=adapter.enumerate(e,o);after,events=adapter.activate(e,rows[0],o)
   self.assertEqual(events[0]['actor'],'A');self.assertEqual(after['legacy_continuation']['activation_zone'][-1]['source_instance_id'],o['source_instance_id'])
   after['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
   result=triggers.resolve(state.current(after),initial());self.assertEqual(result['new_events'][0]['action_type'],'resolve_board_ability');self.assertEqual(result['new_events'][0]['actor'],'A')
   return {}
  run_current(run)
 def test_hooks_restore_after_invalid_history_and_source_check(self):
  from unittest.mock import patch
  import proxy_continuation_triggers as triggers
  native=triggers.board_candidates;usage=triggers._used;adapter=existing.ExistingAdapter.enumerate
  def broken(forced):
   e,h,o=fixture(True);existing.ExistingAdapter(h+h).enumerate(e,o);return {}
  with self.assertRaises(ValueError):run_current(broken)
  self.assertIs(triggers.board_candidates,native);self.assertIs(triggers._used,usage);self.assertIs(existing.ExistingAdapter.enumerate,adapter)
  def run(forced):
   e,h,o=fixture(True);rows,_=existing.ExistingAdapter(h).enumerate(e,o)
   with patch.object(audit,'CITY_SHA','0'*64):self.assertTrue(audit.audit_city(e,o,rows,h)['errors'])
   return {}
  run_current(run)
 def test_generated_turn_switch_is_observed_before_next_draw(self):
  import proxy_population_turn_boundary as boundary
  from proxy_population_policy_bridge import Session
  def run(forced):
   e,h,o=fixture();c=e['legacy_continuation'];c['game_state']['phase']='turn_end';c['return_target']='turn_end'
   i=dict(initial(),first_player='A');session=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});session.turn_start('A','prior')
   result=boundary.next_turn(state.current(e),i,session)
   after=state.advance(e,result['new_snapshots'][0]['continuation_state'],result['new_events'][0]['seq'])
   h.append(result['new_events'][0]);self.assertEqual(h[-1]['action_type'],'turn_end_completed')
   proof=existing.ExistingAdapter(h).proof(after,h[-1]['seq']);self.assertEqual(proof['occurrences'],[])
   city=next(r for r in proof['classifications'] if r['source_instance_id']==o['source_instance_id'])
   self.assertTrue(city['proof']['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  run_current(run)
if __name__=='__main__':unittest.main()
