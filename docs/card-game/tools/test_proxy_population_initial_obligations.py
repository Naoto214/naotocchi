"""Actual initial-entry source projection; old115/zero roots only."""
import copy,unittest
from unittest.mock import patch
import proxy_population_opening as opening
import proxy_population_connected_entry as entry
from test_proxy_mandatory_population_input import bundle

class InitialObligationsTests(unittest.TestCase):
 def test_shared_initial_dealer_cannot_substitute_manifest_top_card(self):
  native=opening.opening.build_initial_state
  def changed(route):
   game=native(route);p=game['players']['A']
   p['hand'][0],p['deck'][0]=p['deck'][0],p['hand'][0]
   return game
  with patch.object(opening.opening,'build_initial_state',changed):
   with self.assertRaisesRegex(ValueError,'initial.*(deal|obligation)'):entry.reconstruct(bundle(),'test-1A',1)

 def test_runtime_upgrade_cannot_introduce_an_uncreated_effect(self):
  import proxy_continuation_payments as payments
  native=payments.upgrade;seen=[]
  def injected(envelope):
   result=native(envelope)
   if envelope['schema']!=payments.SCHEMA:
    g=result['legacy_continuation']['game_state'];actor=g['turn_player']
    source=next(s for s,c in g['cards'].items() if s.startswith(actor+'-') and c['card_id']=='E-fateful-transform')
    payments.add_modifier(result,actor,source);seen.append(source)
   return result
  with patch.object(payments,'upgrade',injected),self.assertRaisesRegex(ValueError,'initial.*(runtime|obligation)'):
   entry.reconstruct(bundle(),'test-1A',1)
  self.assertTrue(seen);self.assertFalse(entry._LOCK.locked())

 def test_both_mirrors_join_source_order_to_first_opportunity_without_promotion(self):
  import proxy_population_initial_obligations as api
  supplied=bundle()
  for mid in ('test-1A','test-1B'):
   prefix=opening.reconstruct_opening(supplied,mid);record=dict(opening=prefix,binding=dict(match_id=mid))
   before=copy.deepcopy(record);proof=api.audit(record,supplied)
   self.assertTrue(proof['initial_deal_and_first_opportunities_verified'],proof)
   self.assertEqual(record,before);self.assertFalse(proof['external_input_provenance_verified']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertFalse(proof['preflight_ready']);self.assertIsNone(proof['policy_eligible'])
   for mode in ('initial_order','initial_growth','initial_board','ordinary_draw','egg_draw','choices','selected','return_order','response_actor','pending','public_source','sequence','ledger','snapshot','event'):
    changed=copy.deepcopy(record);p=changed['opening'];actor=proof['actor']
    if mode=='initial_order':p['initial']['initial_game_state']['players'][actor]['deck'].reverse()
    elif mode=='initial_growth':p['initial']['initial_game_state']['players'][actor]['growth']=21
    elif mode=='initial_board':p['initial']['initial_game_state']['players'][actor]['board']['main']=p['initial']['initial_game_state']['players'][actor]['hand'][0]
    elif mode=='ordinary_draw':p['normal_draw_intermediate']['players'][actor]['hand'].reverse()
    elif mode=='egg_draw':p['mandatory_record']['local_record']['application']['boundary']['choice_game_state']['players'][actor]['hand'].reverse()
    elif mode=='choices':p['mandatory_record']['local_record']['application']['boundary']['candidate_ids'].pop()
    elif mode=='selected':p['mandatory_record']['local_record']['application']['selected_candidate']='unknown'
    elif mode=='return_order':p['mandatory_record']['local_record']['application']['local_after_game_state']['players'][actor]['deck'].reverse()
    elif mode=='response_actor':p['final_envelope']['legacy_continuation']['response_context']['priority_actor']='B' if actor=='A' else 'A'
    elif mode=='pending':p['final_envelope']['legacy_continuation']['pending_triggers']=[{}]
    elif mode=='public_source':p['final_envelope']['runtime']['public_prepared']={'unknown':{}}
    elif mode=='sequence':p['final_envelope']['event_seq']=True
    elif mode=='ledger':p['opening_obligations']['steps'].pop()
    elif mode=='snapshot':p['snapshots'][1]['state_sha256']='0'*64
    elif mode=='event':p['events'][1]['source_instance_id']='unknown'
    with self.subTest(mid=mid,mode=mode):self.assertFalse(api.audit(changed,supplied)['initial_deal_and_first_opportunities_verified'])

 def test_both_runtime_roots_and_no_event_upgrade_are_exact(self):
  import proxy_population_initial_obligations as api
  for mid in ('test-1A','test-1B'):
   record=entry.reconstruct(bundle(),mid,1);before=copy.deepcopy(record);proof=api.audit_runtime_root(record)
   self.assertTrue(proof['initial_runtime_root_verified'],proof);self.assertEqual(proof,record['initial_runtime_root_audit']);self.assertEqual(before,record)
   self.assertFalse(proof['external_input_provenance_verified']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['policy_eligible'])
   for mode in ('payment_effects','stat_effects','conditional_effects','missing_effects','schema','contract','sequence','context','usage','game','unproved_initial','opening_binding'):
    changed=copy.deepcopy(record);root=changed['runtime']['source_envelope']
    if mode in ('payment_effects','stat_effects','conditional_effects'):root['runtime'][mode]=[{'invented':True}]
    elif mode=='missing_effects':del root['runtime']['stat_effects']
    elif mode=='schema':root['schema']='wrong'
    elif mode=='contract':root['execution_contract_id']='wrong'
    elif mode=='sequence':root['event_seq']+=1
    elif mode=='context':root['legacy_continuation']['response_context']['response_opportunity_index']+=1
    elif mode=='usage':root['runtime']['ability_uses']=[{'invented':True}]
    elif mode=='game':root['legacy_continuation']['game_state']['players']['A']['time']+=1
    elif mode=='unproved_initial':changed['initial_obligation_audit']['initial_deal_and_first_opportunities_verified']=1
    elif mode=='opening_binding':changed['initial_obligation_audit']['final_envelope_sha256']='0'*64
    with self.subTest(mid=mid,mode=mode):self.assertFalse(api.audit_runtime_root(changed)['initial_runtime_root_verified'])

 def test_connected_gate_rejects_unverified_runtime_root(self):
  import proxy_population_initial_obligations as api
  native=api.audit_runtime_root
  def unproved(*args):
   proof=native(*args);self.assertTrue(proof['initial_runtime_root_verified']);proof['initial_runtime_root_verified']=False;return proof
  with patch.object(api,'audit_runtime_root',unproved),self.assertRaisesRegex(ValueError,'initial runtime root'):entry.reconstruct(bundle(),'test-1A',1)
  self.assertFalse(entry._LOCK.locked())

 def test_connected_gate_rejects_unverified_fresh_initial_audit(self):
  import proxy_population_initial_obligations as api
  native=api.audit
  def unproved(*args):
   result=native(*args);self.assertTrue(result['initial_deal_and_first_opportunities_verified'],result);result['initial_deal_and_first_opportunities_verified']=False;return result
  with patch.object(api,'audit',unproved),self.assertRaisesRegex(ValueError,'initial obligations'):entry.reconstruct(bundle(),'test-1A',1)
  self.assertFalse(entry._LOCK.locked())

if __name__=='__main__':unittest.main()
