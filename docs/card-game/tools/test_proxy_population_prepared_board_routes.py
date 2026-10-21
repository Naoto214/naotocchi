"""Public board-link replacement negatives; no hidden card identity access."""
import copy,unittest
import proxy_population_prepared_predicates as api
import proxy_population_activation_reference as references
import test_proxy_population_paid_activation_effect as paid
import test_proxy_population_cat_activation_effect as cat

class PreparedBoardRouteTests(unittest.TestCase):
 run_case=paid.PaidActivationEffectTests.run_case
 def test_actual_paid_board_links_have_no_enemy_person_removal_route(self):
  def run():
   for card in ('M-antlion-02','M-antlion-08'):
    b,a,event=paid.actual(card,False);link=a['legacy_continuation']['activation_zone'][-1]
    proof=api.public_effect_route(a,link)
    self.assertEqual(proof['status'],'registered_no_person_removal');self.assertEqual(proof['resolution_audit_family'],'draw_effect_audits');self.assertFalse(proof['effect_execution_proven'])
    for mode in ('receipt','reference','payment','action','unknown'):
     bad=copy.deepcopy(link)
     if mode=='receipt':bad.pop('activation_receipt')
     elif mode=='reference':bad['source_references']=['unknown']
     elif mode=='payment':bad['payment']['time']=True
     elif mode=='action':bad['action_type']='use_item'
     else:bad['card_id']='unknown-board-removal'
     with self.subTest(card=card,mode=mode):self.assertEqual(api.public_effect_route(a,bad)['status'],'unproved')
   return {}
  self.assertTrue(hasattr(api,'public_effect_route'),'public board route audit absent');self.run_case(run)
 def test_real_cat_link_survives_own_source_departure_without_enemy_removal(self):
  def run():
   b,a,event,_=cat.actual(False);link=a['legacy_continuation']['activation_zone'][-1]
   self.assertNotIn(link['source_instance_id'],a['legacy_continuation']['game_state']['players']['A']['board']['companions'])
   proof=api.public_effect_route(a,link);self.assertEqual(proof['status'],'registered_no_person_removal');self.assertEqual(proof['resolution_audit_family'],'zone_effect_audits');return {}
  self.assertTrue(hasattr(api,'public_effect_route'),'public board route audit absent');cat.CatActivationEffectTests.run_case(self,run)

 def test_actual_group_routes_include_start_challenge_end_and_forced(self):
  import test_proxy_population_board_group_effect as group
  def run():
   for card in ('C-chicken','I-bowtie','M-antlion-04','W-countryside','P-cat_ceo','M-antlion-07','P-anglerfish'):
    b,a,event,record,history=group.actual(card)
    self.assertEqual(api.public_effect_route(a,a['legacy_continuation']['activation_zone'][-1])['status'],'registered_no_person_removal',card)
   return {}
  group.BoardGroupEffectTests.run_case(self,run)
 def test_actual_inventory_checks_board_link_without_concealed_identity_reads(self):
  import proxy_continuation_triggers as triggers
  import proxy_continuation_state as state
  import proxy_continuation_quick as quick
  from test_proxy_population_runtime import initial
  from test_proxy_population_response_pass_effect import origin
  class Tracked(dict):
   def __getitem__(self,key):
    if key in ('card_id','card_copy_id','initial_instance_id'):reads.append(key)
    return super().__getitem__(key)
   def get(self,key,default=None):
    if key in ('card_id','card_copy_id','initial_instance_id'):reads.append(key)
    return super().get(key,default)
  reads=[]
  def run():
   b,source,costs=paid.fixture.fixture('M-antlion-08');g=b['legacy_continuation']['game_state'];p=g['players']['B']
   hidden=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-poop1');(p['hand'] if hidden in p['hand'] else p['deck']).remove(hidden);p['board']['prepared'].append(hidden)
   b['runtime']['public_prepared'][hidden]=dict(controller='B',face_up=False,paid_time=1,placed_event_seq=2)
   h=[origin(b,'turn_start_and_normal_draw','A')]
   action=triggers.board_candidates(state.current(b),h,source,runtime=b['runtime'])[0][0]
   a,events=triggers.activate(b,dict(selected_action=action),h);h+=events
   inv=quick.actions.response_inventory(a,initial(),h)
   a['legacy_continuation']['game_state']['cards'][hidden]=Tracked(a['legacy_continuation']['game_state']['cards'][hidden])
   proof=api.audit(a,h,inv);self.assertTrue(proof['prepared_predicates_verified'],proof);self.assertEqual(reads,[]);self.assertEqual(len(proof['verified_preparations']),1)
   bad=copy.deepcopy(a);bad['legacy_continuation']['activation_zone'][0].pop('activation_receipt');self.assertFalse(api.audit(bad,h,inv)['prepared_predicates_verified']);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
