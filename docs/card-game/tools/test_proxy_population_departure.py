"""Synthetic current107 states; no new sampled order or game."""
import copy,unittest
from test_proxy_population_runtime import initial
from test_proxy_population_first_response import game_with
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
try:import proxy_population_departure as api
except ImportError:api=None

def fixture(equipment=False,equipment_card='I-bond1'):
 g,a,s=game_with('C-box');p=g['players'][a];available=p['hand']+p['deck'];companions=[i for i in available if g['cards'][i]['card_id'].startswith('C-') and i!=s][:3]
 assert len(companions)==3
 p['hand']=[s];p['deck']=[i for i in available if i not in companions and i!=s];p['board']['companions']=companions;p['person_placed']=False;g['phase']='normal_action'
 e=state.create(dict(game_state=g,response_context=_context(a,a),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2)
 if equipment:
  item=next(i for i in p['deck'] if g['cards'][i]['card_id']==equipment_card)
  # e owns a detached copy ofg.
  p=e['legacy_continuation']['game_state']['players'][a];p['deck'].remove(item);p['board']['prepared'].append(item)
  e['runtime']['attachments'][item]=dict(controller=a,target_instance_id=companions[0],attached_event_seq=1)
  e['runtime']['public_prepared'][item]=dict(controller=a,face_up=True,paid_time=2,placed_event_seq=1)
 return e,s,companions
class DepartureTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_full_board_replacement_is_atomic_and_preserves_all_three_targets(self):
  e,s,old=fixture(True);before=copy.deepcopy(e)
  def run(forced):
   current=payments.upgrade(e);inv=candidates.audit(current,[]);rows=[r for r in inv['legal_candidate_details'] if r['action_type']=='place_companion']
   self.assertEqual(len(rows),3)
   action=next(r for r in rows if r['target_instance_ids']==[old[0]])
   return dict(before=current,result=api.replace_companion(current,action,[]))
  out=runtime.operation(initial(),run);current=out['before'];r=out['result'];p=r['envelope']['legacy_continuation']['game_state']['players']['A']
  self.assertEqual(len(p['board']['companions']),3);self.assertIn(s,p['board']['companions']);self.assertIn(old[0],p['discard']);self.assertTrue(p['person_placed'])
  self.assertFalse(r['envelope']['runtime']['attachments']);self.assertEqual(len(r['events']),1)
  self.assertFalse(r['safe_free_development']);self.assertEqual(e,before)
  self.assertEqual(r['events'][0]['envelope_before_sha256'],state.canonical_sha256(current))
 def test_departure_discards_start_trigger_equipment_without_firing_it(self):
  e,s,old=fixture(True,'I-bowtie')
  def run(forced):
   current=payments.upgrade(e);action=next(r for r in candidates.audit(current,[])['legal_candidate_details'] if r['action_type']=='place_companion' and r['target_instance_ids']==[old[0]])
   result=api.replace_companion(current,action,[]);self.assertEqual(len(result['events'][0]['discarded_equipment_instance_ids']),1);self.assertEqual(result['envelope']['legacy_continuation']['pending_triggers'],[]);return {}
  runtime.operation(initial(),run)
 def test_invalid_or_unbound_action_cannot_move_any_card(self):
  e,s,old=fixture();before=copy.deepcopy(e)
  def run(forced):
   current=payments.upgrade(e);action=next(r for r in candidates.audit(current,[])['legal_candidate_details'] if r['action_type']=='place_companion');action=copy.deepcopy(action);action['target_instance_ids']=['absent']
   with self.assertRaises(ValueError):api.replace_companion(current,action,[])
   return {}
  runtime.operation(initial(),run);self.assertEqual(e,before)
class ConnectionTests(unittest.TestCase):
 def test_existing114_upper_priorities_exclude_paid_action_before_pure116(self):
  e,s,old=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A'];main=next(i for i in p['deck'] if g['cards'][i]['card_id']=='M-beetle-01');p['deck'].remove(main);p['hand'].append(main)
  def run(forced):
   from proxy_normal_decision_fallback_contract import CONTRACT_VERSION
   c=payments.upgrade(e);ctx=dict(contract_version=CONTRACT_VERSION,order_id='unit-only',actor='A',actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
   with api.scope():
    inv=candidates.audit(c,[]);paid=[a['candidate_id'] for a in inv['legal_candidate_details'] if a['action_type']=='play_main'];self.assertTrue(paid)
    r=candidates.select(c,inv,ctx,runtime.POLICY)
    self.assertTrue(set(paid)<=set(r['choice']['legal_candidates']));self.assertTrue(set(paid).isdisjoint(r['choice']['seeded_fallback_candidates']))
    self.assertEqual(r['choice']['reason_code'],'strategic_unresolved_seeded_fallback')
   return {}
  runtime.operation(initial(),run)

 def test_known_upper_priority_unique_winner_is_not_stopped_by_replacement(self):
  e,source,old=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A'];g['round']=4;p['time']=4
  for card,slot in [('M-beetle-01','main'),('P-cat_ceo','partner')]:
   identifier=next(i for i in p['hand']+p['deck'] if g['cards'][i]['card_id']==card);(p['hand'] if identifier in p['hand'] else p['deck']).remove(identifier);p['board'][slot]=identifier
  p['board']['partner_stage']=3
  def run(forced):
   from proxy_normal_decision_fallback_contract import CONTRACT_VERSION
   c=payments.upgrade(e);ctx=dict(contract_version=CONTRACT_VERSION,order_id='unit-only',actor='A',actor_turn_index=4,round=4,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
   with api.scope():
    inv=candidates.audit(c,[]);r=candidates.select(c,inv,ctx,runtime.POLICY)
    self.assertEqual(r['selected_action']['action_type'],'relationship');self.assertEqual(r['choice']['resolution_mode'],'priority_unique');self.assertFalse(r['choice']['strategic_unresolved'])
   return {}
  runtime.operation(initial(),run)

 def test_scope_connects_current_selector_apply_and_runtime_replay(self):
  self.assertTrue(hasattr(api,'scope'))
  e,s,old=fixture(True)
  def run(forced):
   import proxy_continuation_end as end
   import proxy_continuation_actions as actions
   from proxy_normal_decision_fallback_contract import CONTRACT_VERSION,validate_seeded_resolution
   c=payments.upgrade(e);ctx=dict(contract_version=CONTRACT_VERSION,order_id='unit-only',actor='A',actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
   with api.scope():
    inv=candidates.audit(c,[]);r=candidates.select(c,inv,ctx,runtime.POLICY,None)
    self.assertEqual(r['choice']['resolution_mode'],'seeded_fallback');self.assertEqual(validate_seeded_resolution(r['choice']),[])
    after,events=actions.apply(c,r,dict(public_events=[]))
    if r['selected_action']['action_type']=='place_companion':
     raw={k:v for k,v in events[0].items() if k not in runtime.BIND_KEYS}
     self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(c,after,raw,[]))
     bad=copy.deepcopy(raw);bad['replaced_instance_id']='wrong';self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(c,after,bad,[]))
    self.assertEqual(runtime._evaluate(r)['legacy_116'],'excluded')
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
