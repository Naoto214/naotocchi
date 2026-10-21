"""Conditional107 trace invariants, not global replacement unreachability."""
import copy,unittest
import proxy_population_source_root as source
import proxy_population_policy_journal as journal
import proxy_population_connected_entry as connected
import test_proxy_population_main_movement_effect as movement
from test_proxy_mandatory_population_input import bundle

class SourceInvariantTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.record=connected.reconstruct(bundle(),'test-1A',3)
 def test_actual_trace_reports_only_supplied_invariants(self):
  proof=journal.audit_opportunities(self.record);self.assertEqual(proof['errors'],[]);self.assertTrue(proof.get('supplied_source_invariants_verified',False));self.assertFalse(proof['global_replacement_unreachability_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
 def test_legacy_reservation_at_initial_or_runtime_root_is_rejected(self):
  for mode in ('initial','prefix','runtime'):
   bad=copy.deepcopy(self.record)
   if mode=='initial':game=bad['opening']['initial']['initial_game_state']
   elif mode=='prefix':game=bad['opening']['final_envelope']['legacy_continuation']['game_state']
   else:game=bad['runtime']['source_envelope']['legacy_continuation']['game_state']
   game['players']['A']['reservations']=[{'unproved_legacy_reservation':True}]
   with self.subTest(mode=mode):self.assertTrue(journal.audit_opportunities(bad)['errors'])
 def test_actual_own_main_movement_and_counterfactual_enemy_or_reservation_changes(self):
  self.assertTrue(hasattr(source,'check_transition'),'source trace invariant audit absent')
  def run(template):
   for variant in ('birth','time_skip','transform'):
    b,a,event=movement.actual(template,variant);source.check_transition(b,a,event)
    for mode in ('reserve_before','reserve_after','reserve_type','enemy_main','enemy_companion','actor'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(event);other='B' if event['actor']=='A' else 'A'
     if mode=='reserve_before':before['legacy_continuation']['game_state']['players'][other]['reservations']=[{'unknown':True}]
     elif mode=='reserve_after':after['legacy_continuation']['game_state']['players'][other]['reservations']=[{'unknown':True}]
     elif mode=='reserve_type':after['legacy_continuation']['game_state']['players'][other]['reservations']={}
     elif mode=='enemy_main':after['legacy_continuation']['game_state']['players'][other]['board']['main']='counterfactual-other-main'
     elif mode=='enemy_companion':after['legacy_continuation']['game_state']['players'][other]['board']['companions'].append('counterfactual-other-companion')
     else:ev['actor']='unknown'
     with self.subTest(variant=variant,mode=mode):
      with self.assertRaises((ValueError,KeyError,TypeError)):source.check_transition(before,after,ev)
   return {}
  movement.MainMovementEffectTests.run_case(self,run)

 def test_actual_enemy_equipment_removal_preserves_people(self):
  import test_proxy_population_equipment_effects as equipment
  def run(forced):
   b,a,event,target=equipment.actual(forced);source.check_transition(b,a,event)
   self.assertNotIn(target,a['legacy_continuation']['game_state']['players']['B']['board']['prepared'])
   bad=copy.deepcopy(a);bad['legacy_continuation']['game_state']['players']['B']['board']['companions'].pop()
   with self.assertRaisesRegex(ValueError,'opponent'):source.check_transition(b,bad,event)
   return {}
  equipment.EquipmentEffectsTests.run_case(self,run)
 def test_actual_own_cat_cost_is_not_opponent_person_removal(self):
  import test_proxy_population_cat_activation_effect as cat
  def run():
   b,a,event,_=cat.actual(False,gear=2);source.check_transition(b,a,event)
   self.assertNotIn(event['source_instance_id'],a['legacy_continuation']['game_state']['players']['A']['board']['companions']);return {}
  cat.CatActivationEffectTests.run_case(self,run)

if __name__=='__main__':unittest.main()
