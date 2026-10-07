"""Conditional current-action audits; no new experiment inputs."""
import copy, unittest
from unittest.mock import patch
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_latching as latching
import proxy_population_trigger_sequential as sequential
import proxy_continuation_batch as batch
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
try: import proxy_population_trigger_predicates as api
except ImportError: api=None


def case(card):
 e,old,_=fixture('M-antlion-08');g=e['legacy_continuation']['game_state'];p=g['players']['A'];p['board']['main']=None;p['hand'].append(old)
 source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
 for zone in ('hand','deck'):
  if source in p[zone]:p[zone].remove(source)
 slot='main' if card.startswith('M-') else 'partner' if card.startswith('P-') else 'companions'
 if slot=='companions':p['board'][slot].append(source)
 else:p['board'][slot]=source
 if slot=='partner':p['board']['partner_stage']=0;p['hand'].remove(old);p['board']['main']=old
 if card in ('M-antlion-03','C-bat'):
  g['turn_player']='B';prepared=p['discard'].pop();p['board']['prepared'].append(prepared)
  e['runtime']['public_prepared'][prepared]=dict(controller='A',face_up=False,paid_time=1,placed_event_seq=2)
 if card=='M-antlion-06':
  worlds=[s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('W-')]
  for s in worlds:
   for z in ('hand','deck'):
    if s in p[z]:p[z].remove(s)
  p['hand'].extend(worlds[:2]);p['discard'].extend(worlds[2:])
 cap=batch.classification(card)
 occurrence=dict(origin_event_seq=2,source_instance_id=source,actor='A',category='optional',ability_key=cap['timing'],source_reference=cap['reference'])
 return e,occurrence


class TriggerPredicateTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'current trigger predicate audit absent')

 def test_all_latched_cards_check_full_alternatives_and_reject_mutations(self):
  def run(forced):
   for card in ('M-antlion-03','M-antlion-06','C-bat','P-cliff_goat'):
    e,o=case(card);rows,_=latching.current_actions(e,o)
    self.assertTrue(rows,card)
    proof=api.audit_latched(e,o,rows)
    self.assertTrue(proof['current_trigger_predicates_verified'],proof['errors'])
    self.assertEqual(proof['verified_candidate_count'],len(rows));self.assertFalse(proof['origin_authenticated']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted'])
    for mutation in ('omit','duplicate','target','cost','payment','copy','source','variant'):
     bad=copy.deepcopy(rows)
     if mutation=='omit':bad.pop()
     elif mutation=='duplicate':bad.append(copy.deepcopy(bad[0]))
     else:
      field,value={'target':('target_instance_ids',['missing']),'cost':('cost_instance_ids',['missing']),'payment':('base_time_cost',1),'copy':('card_copy_id','missing'),'source':('source_instance_id','missing'),'variant':('candidate_variant','invented')}[mutation];bad[0][field]=value
     self.assertFalse(api.audit_latched(e,o,bad)['current_trigger_predicates_verified'],(card,mutation))
   return {}
  runtime.operation(initial(),run)

 def test_current_usage_turn_departure_and_no_cost_are_negative_not_unknown(self):
  def run(forced):
   for card in ('M-antlion-03','M-antlion-06','C-bat','P-cliff_goat'):
    e,o=case(card);rows,_=latching.current_actions(e,o);g=e['legacy_continuation']['game_state'];cap=batch.classification(card)
    used=copy.deepcopy(e);used['runtime']['ability_uses']=[dict(source_instance_id=o['source_instance_id'],ability_key=cap.get('ability_key',cap['timing']),turn_player=g['turn_player'],round=g['round'],count=1)]
    self.assertFalse(api.audit_latched(used,o,rows)['current_trigger_predicates_verified']);self.assertTrue(api.audit_latched(used,o,[])['current_trigger_predicates_verified'])
    departed=copy.deepcopy(e);p=departed['legacy_continuation']['game_state']['players']['A'];s=o['source_instance_id']
    if s in p['board']['companions']:p['board']['companions'].remove(s)
    elif p['board']['partner']==s:p['board']['partner']=None;p['board']['partner_stage']=None
    else:p['board']['main']=None
    p['discard'].append(s)
    self.assertFalse(api.audit_latched(departed,o,rows)['current_trigger_predicates_verified']);self.assertTrue(api.audit_latched(departed,o,[])['current_trigger_predicates_verified'])
   e,o=case('M-antlion-06');p=e['legacy_continuation']['game_state']['players']['A'];p['deck'].extend(p['hand']);p['hand']=[]
   self.assertTrue(api.audit_latched(e,o,[])['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_wrong_turn_hidden_visibility_and_egg_suppress_current_actions(self):
  def run(forced):
   for card in ('M-antlion-03','M-antlion-06','C-bat'):
    e,o=case(card);rows,_=latching.current_actions(e,o);g=e['legacy_continuation']['game_state'];g['turn_player']='B' if g['turn_player']=='A' else 'A'
    self.assertFalse(api.audit_latched(e,o,rows)['current_trigger_predicates_verified']);self.assertTrue(api.audit_latched(e,o,[])['current_trigger_predicates_verified'])
   e,o=case('M-antlion-03');rows,_=latching.current_actions(e,o);prepared=e['legacy_continuation']['game_state']['players']['A']['board']['prepared'][0]
   e['runtime']['public_prepared'][prepared]['face_up']=True
   e['runtime']['attachments'][prepared]=dict(controller='A',target_instance_id=o['source_instance_id'],attached_event_seq=2)
   self.assertFalse(api.audit_latched(e,o,rows)['current_trigger_predicates_verified']);self.assertTrue(api.audit_latched(e,o,[])['current_trigger_predicates_verified'])
   e,o=case('P-cliff_goat');rows,_=latching.current_actions(e,o);p=e['legacy_continuation']['game_state']['players']['A'];p['discard'].append(p['board']['main']);p['board']['main']=None
   self.assertFalse(api.audit_latched(e,o,rows)['current_trigger_predicates_verified']);self.assertTrue(api.audit_latched(e,o,[])['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_start_threshold_empty_deck_and_occurrence_identity(self):
  from test_proxy_population_trigger_connection import both
  def run(forced):
   e,journal,proof=both();p=e['legacy_continuation']['game_state']['players']['A']
   self.assertEqual(len(p['hand']),2)
   for o in proof['occurrences']:
    rows,_=sequential.StartAdapter().enumerate(e,o)
    self.assertTrue(api.audit_start(e,o,rows)['current_trigger_predicates_verified'])
    self.assertFalse(api.audit_start(e,o,[])['current_trigger_predicates_verified'])
    for key,value in (('actor','B'),('origin_event_seq',e['event_seq']+1),('ability_key','unknown'),('source_reference','unknown')):
     changed=dict(o,**{key:value});self.assertFalse(api.audit_start(e,changed,rows)['current_trigger_predicates_verified'])
    bad=copy.deepcopy(e);owner=bad['legacy_continuation']['game_state']['players']['A'];owner['hand'].append(owner['deck'].pop())
    want=o['ability_key']=='own_start_reveal_companion'
    self.assertEqual(api.audit_start(bad,o,rows)['current_trigger_predicates_verified'],want)
    self.assertEqual(api.audit_start(bad,o,[])['current_trigger_predicates_verified'],not want)
    empty=copy.deepcopy(e);owner=empty['legacy_continuation']['game_state']['players']['A'];owner['discard'].extend(owner['deck']);owner['deck']=[]
    self.assertTrue(api.audit_start(empty,o,rows)['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_scope_is_connected_and_rejects_corrupt_native_inventory(self):
  def run(forced):
   e,o=case('M-antlion-06');rows,proof=latching.current_actions(e,o)
   self.assertIn('current_predicate_audit',proof)
   self.assertTrue(proof['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
  def corrupt(forced):
   e,o=case('M-antlion-06');native=latching.current_actions
   def missing(*args):
    rows,proof=native(*args);return rows[:-1],proof
   with patch.object(latching,'current_actions',missing),api.scope():
    with self.assertRaisesRegex(ValueError,'trigger current predicates'):latching.current_actions(e,o)
   return {}
  runtime.operation(initial(),corrupt)

 def test_start_adapter_audit_is_connected_to_real_inventory(self):
  from test_proxy_population_trigger_connection import both
  # Existing start fixture includes both source types and a source-bound capture.
  def run(forced):
   import proxy_population_start_obligations as starts
   import proxy_population_opportunity_ledger as ledger
   e,journal,proof=both()
   inv=sequential.inventory(e,journal,sequential.StartAdapter())
   self.assertTrue(inv['occurrence_proofs'])
   for p in inv['occurrence_proofs']:self.assertTrue(p['proof']['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
