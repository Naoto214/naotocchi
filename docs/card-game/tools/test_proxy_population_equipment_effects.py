"""Public printed equipment operands and supplied archery full effect delta."""
import copy,unittest
from test_proxy_population_equipment_predicates import equipment
from test_proxy_population_prepared_predicates import link
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
try:import proxy_population_equipment_effects as api
except ImportError:api=None

def actual(forced,mode='normal',card='I-bond1',paid=2):
 b,_,target,_=equipment(card,'B');c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];other=g['players']['B'];row=link(b,'G-archery-3d');row.update(target_instance_ids=[target],payment=dict(time=2));c['response_context'].update(chain_status='resolving',consecutive_passes=2)
 b['runtime']['public_prepared'][target]['paid_time']=paid
 if mode=='departed':other['board']['prepared'].remove(target);other['hand'].append(target);del b['runtime']['public_prepared'][target];del b['runtime']['attachments'][target]
 if mode=='hidden':b['runtime']['public_prepared'][target]['face_up']=False;del b['runtime']['attachments'][target]
 if mode=='world':
  source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='W-city');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
  if p['board']['world']:p['hand'].append(p['board']['world'])
  p['board']['world']=source
 if mode=='outer':
  outer=copy.deepcopy(row);outer['link_id']='supplied-outer';source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['companions'].append(source)
  outer.update(source_instance_id=source,card_id='C-chicken',card_copy_id=g['cards'][source]['card_copy_id'],action_type='activate_board_ability',source_zone='board',payment=dict(time=0),target_instance_ids=[]);c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 r=forced(b,initial(),[],[],[b])
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=r['new_envelopes'][0] if 'new_envelopes' in r else state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);return b,a,ev,target

class EquipmentEffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'independent equipment effects absent')
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)
 def test_printed_cost_not_paid_cost_and_current107_no_high_equipment(self):
  def run(forced):
   for card in ('I-bond1','I-bowtie','I-sleepboost1'):
    for paid in (0,2,9):
     b,a,ev,target=actual(forced,card=card,paid=paid)
     self.assertEqual(api.targets(b,'A','G-archery-3d'),[target]);self.assertEqual(api.targets(b,'B','G-asteroids-classic'),[]);self.assertEqual(api.audit(b,a,ev)['errors'],[])
   return {}
  self.run_case(run)
 def test_current_targets_contexts_and_world_activation_separation(self):
  def run(forced):
   for mode in ('normal','world','departed','hidden','outer','start','end','comparing','resolved'):
    b,a,ev,target=actual(forced,mode);proof=api.audit(b,a,ev)
    with self.subTest(mode=mode):
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_archery_verified']);self.assertEqual(proof['target_legal'],mode not in ('departed','hidden'));self.assertFalse(proof['activation_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_unknown_public_metadata_and_missing_attachment_are_not_empty_targets(self):
  def run(forced):
   b,_,_,target=actual(forced)
   for mode in ('face','owner','missing','target'):
    bad=copy.deepcopy(b)
    if mode=='face':bad['runtime']['public_prepared'][target]['face_up']=1
    elif mode=='owner':bad['runtime']['attachments'][target]['controller']='A'
    elif mode=='missing':del bad['runtime']['attachments'][target]
    else:bad['runtime']['attachments'][target]['target_instance_id']='foreign'
    with self.subTest(mode=mode),self.assertRaises(ValueError):api.targets(bad,'A','G-archery-3d')
   with self.assertRaises(ValueError):api.targets(b,'A','future-card')
   return {}
  self.run_case(run)
 def test_wrong_movement_cleanup_refund_and_effect_receipt_rejected(self):
  def run(forced):
   b,a,ev,target=actual(forced)
   for mode in ('destination','attachment','public','main','refund','reservation','receipt','dispatch'):
    bad=copy.deepcopy(a);event=copy.deepcopy(ev);g=bad['legacy_continuation']['game_state'];p=g['players']['B']
    if mode=='destination':p['discard'].remove(target);p['hand'].append(target)
    elif mode=='attachment':bad['runtime']['attachments'][target]=copy.deepcopy(b['runtime']['attachments'][target])
    elif mode=='public':bad['runtime']['public_prepared'][target]=copy.deepcopy(b['runtime']['public_prepared'][target])
    elif mode=='main':g['players']['A']['board']['main']=None
    elif mode=='refund':g['players']['A']['time']+=2
    elif mode=='reservation':p['reservations'].append('forged')
    elif mode=='receipt':event['created_effect']['target_instance_id']='foreign'
    else:event['action_type']='resolve_payment_modifier'
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_activation_predicate_does_not_reuse_native_target_enumeration(self):
  from unittest.mock import patch
  import proxy_population_hand_predicates as hand
  import proxy_continuation_payments as payments
  import proxy_continuation_rules as rules
  def run(forced):
   b,_,_,target=actual(forced,'world');c=b['legacy_continuation'];g=c['game_state'];source=c['activation_zone'][-1]['source_instance_id'];g['players']['A']['hand'].append(source);c['activation_zone']=[];c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=0);g['phase']='normal_action';g['players']['A']['time']=10
   template=next(a for r in rules.table()['cards'] if r['card_id']=='G-archery-3d' for a in r['actions'] if a['action_type']=='use_play');row=dict(source_zone='hand',source_id=source,source_instance_id=source,card_id='G-archery-3d',target_instance_ids=[target],candidate_variant=template['candidate_variants'][0])
   self.assertTrue(hand._allowed(b,[],row,template)[0])
   with patch.object(payments,'equipment_targets',return_value=[]):self.assertTrue(hand._allowed(b,[],row,template)[0])
   return {}
  self.run_case(run)
 def test_coverage_rejects_self_consistent_wrong_destination(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run(forced):
   b,a,ev,target=actual(forced);p=a['legacy_continuation']['game_state']['players']['B'];p['discard'].remove(target);p['hand'].append(target);event=payments.transition_event(b,a,'resolve_targeted_zone_move','A',**{k:ev[k] for k in ('source_instance_id','chain_link_id','source_reference','created_effect')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false equipment move'
   self.assertIn('equipment effect semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
