"""Public replacement negative conditions; conditional states, no new inputs."""
import copy, unittest
from test_proxy_population_prepared_predicates import current,link
from test_proxy_population_response_expansions import history
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_paid_draw as paid
import proxy_continuation_quick as quick
import proxy_population_prepared_predicates as api


def equipment(card='I-bond1', owner='A'):
 e,h,hidden=current();g=e['legacy_continuation']['game_state'];p=g['players'][owner]
 def take(card):
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
  for z in ('hand','deck'):
   if s in p[z]:p[z].remove(s)
  return s
 s=take(card);target=take('C-chicken');p['board']['companions'].append(target);p['board']['prepared'].append(s)
 e['runtime']['public_prepared'][s]=dict(controller=owner,face_up=True,paid_time=2,placed_event_seq=2)
 e['runtime']['attachments'][s]=dict(controller=owner,target_instance_id=target,attached_event_seq=2)
 h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
 return e,h,s,hidden


class EquipmentPredicateTests(unittest.TestCase):
 def test_replacement_binds_current_public_source_target_and_exclusion(self):
  def run(forced):
   with paid.scope():
    for owner in ('A','B'):
     e,h,s,_=equipment(owner=owner);inv=quick.actions.response_inventory(e,initial(),h);p=api.audit(e,h,inv)
     self.assertTrue(p.get('equipment_predicates_verified'),p)
     self.assertEqual([r['source_instance_id'] for r in p['verified_equipment']],[s])
     for mode in ('omit','duplicate','reason','reoffer'):
      bad=copy.deepcopy(inv)
      if mode=='omit':bad['equipment_exclusions']=[]
      elif mode=='duplicate':bad['equipment_exclusions']*=2
      elif mode=='reason':bad['equipment_exclusions'][0]['reason']='trigger_condition_not_met'
      else:bad['legal_candidate_details'].append(dict(source_instance_id=s,action_type='activate_prepared'))
      self.assertTrue(api.audit(e,h,bad)['errors'],mode)
     for mode in ('missing','controller','target'):
      bad=copy.deepcopy(e)
      if mode=='missing':del bad['runtime']['attachments'][s]
      elif mode=='controller':bad['runtime']['attachments'][s]['controller']='B' if owner=='A' else 'A'
      else:bad['runtime']['attachments'][s]['target_instance_id']=e['legacy_continuation']['game_state']['players']['A']['board']['main']
      self.assertTrue(api.audit(bad,h,inv)['errors'],mode)
   return {}
  runtime.operation(initial(),run)

 def test_all_active_quick_links_required_and_board_routes_remain_unproved(self):
  def run(forced):
   with paid.scope():
    e,h,s,hidden=equipment();g=e['legacy_continuation']['game_state']
    # Exercise equipment with no concealed sources: the route scan must still run.
    g['players']['A']['board']['prepared'].remove(hidden);g['players']['A']['discard'].append(hidden);del e['runtime']['public_prepared'][hidden]
    h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
    link(e,'I-c_coin2');link(e,'G-hit-blow');h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
    inv=quick.actions.response_inventory(e,initial(),h);p=api.audit(e,h,inv)
    self.assertTrue(p.get('equipment_predicates_verified'),p);self.assertEqual(len(p['public_effect_routes']),2)
    bad=copy.deepcopy(e);bad['legacy_continuation']['activation_zone'][-1]['source_zone']='board'
    p=api.audit(bad,h,inv);self.assertEqual(p['errors'],[]);self.assertFalse(p['equipment_predicates_verified']);self.assertTrue(p['unproved_public_equipment'])
   return {}
  runtime.operation(initial(),run)

 def test_start_and_end_equipment_are_not_proved_by_no_removal(self):
  def run(forced):
   with paid.scope():
    for card in ('I-bowtie','I-sleepboost1'):
     e,h,s,_=equipment(card);inv=quick.actions.response_inventory(e,initial(),h);p=api.audit(e,h,inv)
     self.assertIn('equipment_predicates_verified',p);self.assertFalse(p['equipment_predicates_verified']);self.assertEqual(p['verified_equipment'],[])
     self.assertEqual(p['errors'],[]);self.assertEqual(p['unproved_public_equipment'][0]['source_instance_id'],s)
   return {}
  runtime.operation(initial(),run)

 def test_equipment_audit_does_not_read_opponent_concealed_identity(self):
  class Unreadable(dict):
   def __getitem__(self,key):raise AssertionError('concealed identity read')
   def get(self,key,default=None):raise AssertionError('concealed identity read')
  def run(forced):
   with paid.scope():
    e,h,s,hidden=equipment();e['legacy_continuation']['response_context']['priority_actor']='B'
    h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
    inv=quick.actions.response_inventory(e,initial(),h)
    e['legacy_continuation']['game_state']['cards'][hidden]=Unreadable(e['legacy_continuation']['game_state']['cards'][hidden])
    proof=api.audit(e,h,inv);self.assertTrue(proof['equipment_predicates_verified'],proof['errors'])
    self.assertFalse(proof['information_use_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  runtime.operation(initial(),run)

 def test_connected_response_exports_equipment_scope(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',4)
  proofs=[x['response_prepared_predicates'] for x in r['runtime']['steps'] if x.get('response_candidate_expansions')]
  self.assertTrue(proofs)
  for p in proofs:
   self.assertEqual(p['equipment_scope'],'current_replacement_negative_only')
   self.assertFalse(p['all_rule_opportunities_proven']);self.assertIsNone(p['balance_admitted'])

if __name__=='__main__':unittest.main()
