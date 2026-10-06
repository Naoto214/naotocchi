"""Timing and current legality are separate, using conditional local states."""
import copy,unittest
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_population_opportunity_ledger as ledger
try:import proxy_population_trigger_latching as api
except ImportError:api=None

def case():
 e,source,_=fixture('M-antlion-08');g=e['legacy_continuation']['game_state'];p=g['players']['A'];main=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-antlion-06')
 for zone in ('hand','deck'):
  if main in p[zone]:p[zone].remove(main)
 p['hand'].append(source);p['board']['main']=main
 quick=next(s for s in p['discard'] if g['cards'][s]['card_id']=='I-c_coin2');p['discard'].remove(quick)
 link=dict(link_id='response-link-3-'+quick,action_type='use_item',source_zone='hand',actor='A',source_instance_id=quick,card_copy_id=g['cards'][quick]['card_copy_id'],card_id='I-c_coin2',target_instance_ids=[],candidate_variant='draw_one',payment=dict(time=1),source_references=['77-current-items-card-text-draft.md#I-c_coin2'])
 e['legacy_continuation']['activation_zone']=[link];e['legacy_continuation']['response_context'].update(chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2)
 # No payable hand world at the actual effect occurrence.
 worlds=[s for s in p['hand'] if g['cards'][s]['card_id'].startswith('W-')]
 for s in worlds:p['hand'].remove(s);p['deck'].append(s)
 after=copy.deepcopy(e);c=after['legacy_continuation'];c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0);c['game_state']['players']['A']['discard'].append(quick);after['event_seq']+=1
 event=triggers._raw_event(state.current(e),state.current(after),'resolve_item','A',source_instance_id=quick,chain_link_id=link['link_id'],result=dict(effect_applied=True))
 return e,after,event,main

class LatchingTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'timing occurrence producer missing')
 def test_effect_occurrence_without_current_cost_is_deferred_not_omitted(self):
  def run(forced):
   before,after,event,source=case();proof=api.capture(before,after,event);self.assertEqual([r['source_instance_id'] for r in proof['occurrences']],[source]);self.assertFalse(proof['origin_authenticated'])
   journal=ledger.observe(ledger.create('A'),proof['occurrences'],'resolving');self.assertIsNone(ledger.offer(journal));self.assertIsNotNone(ledger.offer(ledger.release(journal,[])))
   self.assertEqual(api.current_actions(after,proof['occurrences'][0])[0],[])
   p=after['legacy_continuation']['game_state']['players']['A'];g=after['legacy_continuation']['game_state'];worlds=[s for s in p['deck'] if g['cards'][s]['card_id'].startswith('W-')][:2]
   for s in worlds:p['deck'].remove(s)
   p['hand'].append(worlds[0]);p['discard'].append(worlds[1]);rows,why=api.current_actions(after,proof['occurrences'][0]);self.assertEqual([(r['cost_instance_ids'],r['target_instance_ids']) for r in rows],[([worlds[0]],[worlds[1]])]);self.assertTrue(why['complete'])
   return {}
  base.operation(initial(),run)
 def test_native_hand_link_without_source_zone_is_classified_by_explicit_action(self):
  def run(forced):
   before,after,event,source=case();del before['legacy_continuation']['activation_zone'][0]['source_zone']
   event=triggers._raw_event(state.current(before),state.current(after),event['action_type'],'A',source_instance_id=event['source_instance_id'],chain_link_id=event['chain_link_id'],result=event['result'])
   self.assertEqual([r['source_instance_id'] for r in api.capture(before,after,event)['occurrences']],[source])
   return {}
  base.operation(initial(),run)
 def test_effect_false_is_absent_and_missing_application_proof_is_not_false(self):
  def run(forced):
   before,after,event,_=case();event['result']['effect_applied']=False;self.assertEqual(api.capture(before,after,event)['occurrences'],[])
   event['result']={}
   with self.assertRaisesRegex(ValueError,'application unproved'):api.capture(before,after,event)
   event['result']=dict(effect_applied=1)
   with self.assertRaises(ValueError):api.capture(before,after,event)
   return {}
  base.operation(initial(),run)
 def test_only_source_present_at_actual_occurrence_can_be_latched(self):
  def run(forced):
   before,after,event,source=case();p=before['legacy_continuation']['game_state']['players']['A'];p['board']['main']=None;p['hand'].append(source)
   event=triggers._raw_event(state.current(before),state.current(after),event['action_type'],'A',source_instance_id=event['source_instance_id'],chain_link_id=event['chain_link_id'],result=event['result'])
   self.assertEqual(api.capture(before,after,event)['occurrences'],[])
   return {}
  base.operation(initial(),run)
 def test_hash_and_sequence_forgery_rejected_and_full_reconstruction_matches(self):
  def run(forced):
   before,after,event,_=case();proof=api.capture(before,after,event);self.assertEqual(api.validate(proof,before,after,event),[])
   bad=copy.deepcopy(proof);bad['occurrences']=[];self.assertTrue(api.validate(bad,before,after,event))
   bad=copy.deepcopy(event);bad['seq']=True
   with self.assertRaises(ValueError):api.capture(before,after,bad)
   bad=copy.deepcopy(event);bad['game_state_before_sha256']='0'*64
   with self.assertRaises(ValueError):api.capture(before,after,bad)
   return {}
  base.operation(initial(),run)
class OtherTimingTests(unittest.TestCase):
 def test_play_timing_captures_main_and_companion_before_current_targets(self):
  def run(forced):
   before,after,event,old=case();g=before['legacy_continuation']['game_state'];p=g['players']['A'];p['board']['main']=None;p['hand'].append(old)
   main=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-antlion-03');p['board']['main']=main
   for z in ('hand','deck'):
    if main in p[z]:p[z].remove(main)
   bat=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-bat')
   for z in ('hand','deck'):
    if bat in p[z]:p[z].remove(bat)
   p['board']['companions'].append(bat);g['turn_player']='B'
   # A playing quick on B's turn causes bat, not the opponent-quick main.
   before['legacy_continuation']['activation_zone']=[];before['legacy_continuation']['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0)
   after=copy.deepcopy(before);after['event_seq']+=1
   event=triggers._raw_event(state.current(before),state.current(after),'activate_response','A',source_instance_id=event['source_instance_id'],source_zone='hand')
   proof=api.capture(before,after,event);self.assertEqual([r['source_instance_id'] for r in proof['occurrences']],[bat]);self.assertEqual(api.current_actions(after,proof['occurrences'][0])[0],[])
   quick=next(s for s in g['players']['B']['hand']+g['players']['B']['deck'] if g['cards'][s]['card_id']=='I-c_coin2');event.update(actor='B',source_instance_id=quick)
   proof=api.capture(before,after,event);self.assertEqual([r['source_instance_id'] for r in proof['occurrences']],[main]);self.assertEqual(api.current_actions(after,proof['occurrences'][0])[0],[])
   cost=p['discard'][0];p['discard'].remove(cost);p['board']['prepared'].append(cost);before['runtime']['public_prepared'][cost]=dict(controller='A',face_up=False,paid_time=1,placed_event_seq=2)
   after=copy.deepcopy(before);after['event_seq']+=1;event=triggers._raw_event(state.current(before),state.current(after),'activate_response','B',source_instance_id=quick,source_zone='hand')
   row=api.capture(before,after,event)['occurrences'][0];self.assertEqual(len(api.current_actions(after,row)[0]),1)
   event['source_zone']='prepared';self.assertEqual(api.capture(before,after,event)['occurrences'],[])
   return {}
  base.operation(initial(),run)

 def test_goat_requires_actual_different_world_and_same_non_egg_partner(self):
  def run(forced):
   before,after,event,main=case();g=before['legacy_continuation']['game_state'];p=g['players']['A'];goat=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-cliff_goat')
   for z in ('hand','deck'):
    if goat in p[z]:p[z].remove(goat)
   p['board']['partner']=goat
   worlds=[s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('W-')][:2]
   for s in worlds:
    for z in ('hand','deck'):
     if s in p[z]:p[z].remove(s)
   p['board']['world']=worlds[0];p['hand'].append(worlds[1]);after=copy.deepcopy(before);after['event_seq']+=1;q=after['legacy_continuation']['game_state']['players']['A'];q['board']['world']=worlds[1];q['hand'].remove(worlds[1]);q['discard'].append(worlds[0])
   event=triggers._raw_event(state.current(before),state.current(after),'place_world','A',source_instance_id=worlds[1],previous_world_instance_id=worlds[0]);rows=api.capture(before,after,event)['occurrences'];self.assertEqual([r['source_instance_id'] for r in rows],[goat]);self.assertEqual(len(api.current_actions(after,rows[0])[0]),1)
   q['board']['main']=None;q['hand'].append(main);self.assertEqual(api.current_actions(after,rows[0])[0],[])
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
