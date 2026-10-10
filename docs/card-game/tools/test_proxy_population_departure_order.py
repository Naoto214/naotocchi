"""Approved A: real current routes, ordered movement receipt and hash binding."""
import copy,unittest
import test_proxy_population_payment_consumption as harness
import test_proxy_population_main_movement_effect as movement
import test_proxy_population_person_placement_effect as placement
import test_proxy_population_cat_activation_effect as cat
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
from proxy_mandatory_policy_contract import canonical
try:import proxy_population_departure_order as order
except ImportError:order=None

class DepartureOrderTests(unittest.TestCase):
 run_case=harness.ConsumptionTests.run_case
 def test_real_movement_and_replacement(self):
  def run(template):
   for b,a,e in (movement.actual(template,equipment=True),placement.replacement()):
    p=b['legacy_continuation']['game_state']['players'][e['actor']];old=e.get('replaced_instance_id',p['board']['main'])
    gear=[s for s in p['board']['prepared'] if b['runtime']['attachments'].get(s,{}).get('target_instance_id')==old]
    self.assertEqual(a['legacy_continuation']['game_state']['players'][e['actor']]['discard'],p['discard']+[old]+gear)
    self.assertEqual(e['departure_order']['movements'][0]['instance_id'],old)
    self.assertEqual(order.audit(b,a,e),[])
    self.assertEqual(e['envelope_after_sha256'],state.state_hash(a))
    for mode in ('order','receipt','missing','prefix'):
     bad=copy.deepcopy(a);ev=copy.deepcopy(e)
     if mode=='order':bad['legacy_continuation']['game_state']['players'][e['actor']]['discard'][-2:]=reversed(bad['legacy_continuation']['game_state']['players'][e['actor']]['discard'][-2:])
     elif mode=='receipt':ev['departure_order']['movements'].reverse()
     elif mode=='missing':del ev['departure_order']
     else:bad['legacy_continuation']['game_state']['players'][e['actor']]['discard'].insert(0,old)
     self.assertTrue(order.audit(b,bad,ev),mode)
   return {}
  self.run_case(run)
 def test_multi_equipment_snapshot_and_dictionary_independence(self):
  self.assertIsNotNone(order)
  def run(template):
   b,a,e=movement.actual(template,equipment=True);actor=e['actor'];p=b['legacy_continuation']['game_state']['players'][actor];old=p['board']['main'];g=b['legacy_continuation']['game_state']
   source=next(s for s in p['hand'] if g['cards'][s]['card_id']=='I-bowtie');p['hand'].remove(source);p['board']['prepared'].insert(0,source)
   b['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=old,attached_event_seq=1);b['runtime']['public_prepared'][source]=dict(controller=actor,face_up=True,paid_time=2,placed_event_seq=1)
   plan=order.plan(b,old,'discard');reverse=copy.deepcopy(b);reverse['runtime']['attachments']=dict(reversed(list(reverse['runtime']['attachments'].items())))
   self.assertEqual(plan,order.plan(reverse,old,'discard'))
   gear=p['board']['prepared'];self.assertEqual([r['instance_id'] for r in plan['movements']],[old]+gear)
   reverse['legacy_continuation']['game_state']['players'][actor]['board']['prepared'].reverse()
   self.assertNotEqual(plan,order.plan(reverse,old,'discard'))
   action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['card_id']=='M-beetle-02' and a['candidate_variant']=='transform')
   after,events=batch.transition(b,action,[]);again,ev2=batch.transition(b,action,[])
   self.assertEqual(canonical([after,events]),canonical([again,ev2]))
   reversed_dict=copy.deepcopy(b);reversed_dict['runtime']['attachments']=dict(reversed(list(reversed_dict['runtime']['attachments'].items())))
   same,ev3=batch.transition(reversed_dict,action,[]);self.assertEqual(canonical([after,events]),canonical([same,ev3]))
   self.assertEqual(after['legacy_continuation']['game_state']['players'][actor]['discard'],p['discard']+[old]+gear)
   self.assertEqual(order.audit(b,after,events[0]),[])
   altered=copy.deepcopy(after);altered['legacy_continuation']['game_state']['players'][actor]['discard'][-2:]=reversed(altered['legacy_continuation']['game_state']['players'][actor]['discard'][-2:])
   self.assertNotEqual(state.state_hash(after),state.state_hash(altered))
   bottom=order.plan(b,old,'deck');self.assertEqual(bottom['movements'][0]['to_zone'],'deck');self.assertEqual(bottom['discard_additions'][actor],gear)
   return {}
  self.run_case(run)

 def test_cat_two_equipment_no_choice_and_hashes(self):
  import proxy_population_discard_recovery as recovery
  import proxy_population_cat_activation_effect as audit
  def run():
   for normal in (False,True):
    b,a,e,history=cat.actual(normal,2)
    self.assertEqual(order.audit(b,a,e),[])
    self.assertEqual(e['envelope_after_sha256'],state.state_hash(a))
    self.assertEqual(e['departure_order']['movements'][0]['to_zone'],'deck')
    gear=b['legacy_continuation']['game_state']['players']['A']['board']['prepared']
    self.assertEqual(e['departure_order']['discard_additions']['A'],gear)
    self.assertEqual(audit.audit(b,a,e,history)['errors'],[])
    source=e['source_instance_id'];b['runtime']['attachments']=dict(reversed(list(b['runtime']['attachments'].items())))
    if normal:
     action=next(row for row in candidates.audit(b,history)['legal_candidate_details'] if row['action_type']=='activate_companion_ability')
     again,events=recovery.activate_normal(b,action,history)
    else:
     action=recovery.board_candidates(state.current(b),history,source)[0][0]
     again,events=cat.triggers.activate(b,dict(selected_action=action),history)
    self.assertEqual(canonical([a,e]),canonical([again,events[0]]))
   return {}
  cat.CatActivationEffectTests.run_case(self,run)

if __name__=='__main__':unittest.main()
