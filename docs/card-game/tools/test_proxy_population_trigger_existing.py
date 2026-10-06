"""One group contract across end and arrival, retaining physical targets."""
import copy,unittest
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_continuation_triggers as triggers
try:import proxy_population_trigger_existing as api
except ImportError:api=None

class ExistingTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_end_sources_use_existing_inventory_and_same_flat_contract(self):
  def run(forced):
   e=case('end');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];source=p['board']['world'];p['board']['world']=None;p['hand'].append(source)
   country=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='W-countryside');(p['hand'] if country in p['hand'] else p['deck']).remove(country);p['board']['world']=country;c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0,origin_event_seq=3)
   coin=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-c_coin2');(p['hand'] if coin in p['hand'] else p['deck']).remove(coin);p['discard'].append(coin)
   history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item',source_instance_id=coin),dict(seq=3,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[country])]
   adapter=api.ExistingAdapter(history);proof=adapter.collect(e);self.assertEqual([o['source_instance_id'] for o in proof['occurrences']],[country]);l=ledger.observe(ledger.create('A'),proof['occurrences'],'empty')
   inv=sequential.inventory(e,l,adapter);self.assertEqual(len(inv['legal_candidate_ids']),2)
   option=next(r for r in inv['legal_candidate_details'] if r['action']=='activate');after,events=adapter.activate(e,option['activation'],proof['occurrences'][0]);self.assertEqual(after['legacy_continuation']['activation_zone'][-1]['source_instance_id'],country)
   self.assertEqual(events[0]['envelope_before_sha256'],state.canonical_sha256(e));return {}
  runtime.operation(initial(),run)
 def test_arrival_recovery_keeps_every_discarded_quick_target(self):
  def run(forced):
   e=case();c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];world=p['board']['world'];p['board']['world']=None;p['hand'].append(world);c['activation_zone']=[];c['response_context'].update(chain_status='empty',chain_links=[],origin_event_seq=3,consecutive_passes=0,window_kind='after_normal_action')
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-antlion-04');(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['main']=source
   targets=[]
   for card in ('I-c_coin2','G-hit-blow'):
    target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if target in p['hand'] else p['deck']).remove(target);p['discard'].append(target);targets.append(target)
   history=[dict(seq=3,actor='A',action_type='main_movement',source_instance_id=source,candidate_variant='birth')];adapter=api.ExistingAdapter(history);proof=adapter.collect(e);l=ledger.observe(ledger.create('A'),proof['occurrences'],'empty');inv=sequential.inventory(e,l,adapter)
   self.assertEqual(len(inv['legal_candidate_ids']),3);self.assertEqual(sorted(r['activation']['target_instance_ids'][0] for r in inv['legal_candidate_details'] if r['action']=='activate'),sorted(targets));return {}
  runtime.operation(initial(),run)
 def test_city_occurrence_uses_the_actual_second_play_not_later_window(self):
  def run(forced):
   from unittest.mock import patch
   e=case();c=e['legacy_continuation'];source=c['game_state']['players']['A']['board']['world'];c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',origin_event_seq=5)
   history=[dict(seq=3,actor='A',action_type='use_item'),dict(seq=5,actor='A',action_type='place_companion')]
   action=dict(candidate_id='city',trigger_origin_event_seq=3)
   with patch.object(triggers,'board_candidates',return_value=([action],{})):
    proof=api.ExistingAdapter(history).collect(e)
   self.assertEqual(proof['occurrences'][0]['origin_event_seq'],3)
   return {}
  runtime.operation(initial(),run)
 def test_single_forced_relationship_activation_is_not_a_seeded_judgment(self):
  def run(forced):
   e=case();c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];world=p['board']['world'];p['board']['world']=None;p['hand'].append(world);c['activation_zone']=[];c['response_context'].update(chain_status='empty',chain_links=[],origin_event_seq=3,consecutive_passes=0,window_kind='after_normal_action')
   for card,slot in [('M-antlion-04','main'),('P-cat_ceo','partner')]:
    source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board'][slot]=source
   p['board']['partner_stage']=0;c['pending_triggers']=[f'mandatory:3:{source}'];history=[dict(seq=3,actor='A',action_type='relationship_start',source_instance_id=source)]
   adapter=api.ExistingAdapter(history);proof=adapter.collect(e);l=ledger.observe(ledger.create('A'),proof['occurrences'],'empty');result=sequential.step(e,initial(),l,adapter)
   self.assertIsNone(result['decision']);self.assertEqual(result['selection_basis'],'forced_singleton_rule_operation');self.assertFalse(result['excluded_by_116']);self.assertIsNone(result['balance_admitted']);self.assertEqual(result['after_envelope']['legacy_continuation']['pending_triggers'],[])
   history.extend({k:v for k,v in event.items() if k not in runtime.BIND_KEYS} for event in result['events'])
   repeated=api.ExistingAdapter(history).collect(result['after_envelope'])
   self.assertEqual(repeated['occurrences'],[])
   return {}
  runtime.operation(initial(),run)
 def test_end_group_uses_shared_loop_before_provenance_boundary(self):
  import proxy_population_trigger_window as window
  def prepare(forced):
   e=case('end');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];source=p['board']['world'];p['board']['world']=None;p['hand'].append(source)
   country=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='W-countryside');(p['hand'] if country in p['hand'] else p['deck']).remove(country);p['board']['world']=country;c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0,origin_event_seq=3)
   coin=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-c_coin2');(p['hand'] if coin in p['hand'] else p['deck']).remove(coin);p['discard'].append(coin)
   for owner in g['players'].values():owner['time']=0
   cnow=state.current(e);history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item',source_instance_id=coin),dict(seq=3,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[country],game_state_after_sha256=triggers.old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=triggers.old.start._hash(cnow))]
   return dict(envelope=e,history=history,proof=api.ExistingAdapter(history).proof(e))
  prepared=runtime.operation(initial(),prepare);e=prepared["envelope"];history=prepared["history"];proof=prepared["proof"];r=window.segment(e,initial(),history,[],[e],3,proof)
  self.assertIsNone(r['stop']);self.assertTrue(r['trigger_records']);self.assertTrue(all(record['inventory']['category']=='optional' for record in r['trigger_records']));self.assertFalse(r['ready_for_execution'])
if __name__=='__main__':unittest.main()
