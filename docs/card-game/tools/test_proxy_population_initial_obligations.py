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

 def test_connected_gate_rejects_unverified_fresh_initial_audit(self):
  import proxy_population_initial_obligations as api
  native=api.audit
  def unproved(*args):
   result=native(*args);self.assertTrue(result['initial_deal_and_first_opportunities_verified'],result);result['initial_deal_and_first_opportunities_verified']=False;return result
  with patch.object(api,'audit',unproved),self.assertRaisesRegex(ValueError,'initial obligations'):entry.reconstruct(bundle(),'test-1A',1)
  self.assertFalse(entry._LOCK.locked())

if __name__=='__main__':unittest.main()
