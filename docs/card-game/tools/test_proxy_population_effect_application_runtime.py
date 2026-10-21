import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as base
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_challenge as challenge
import proxy_population_trigger_latching as latching
try:import proxy_population_effect_application_runtime as api
except ImportError:api=None

def fixture(card='G-area-claim',growth=100):
 g,actor,source=game_with(card);p=g['players'][actor];p['growth']=growth
 def take(card):
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
  (p['hand'] if s in p['hand'] else p['deck']).remove(s);return s
 for name,slot in [('M-antlion-06','main'),('P-cat_ceo','partner'),('W-city','world')]:p['board'][slot]=take(name)
 p['board']['partner_stage']=0
 for name in ('C-box','C-bat','C-cat_friend'):p['board']['companions'].append(take(name))
 prepared=take('I-poop1');p['board']['prepared'].append(prepared);p['hand'].remove(source)
 link=dict(link_id='response-link-3-'+source,action_type='use_play' if card=='G-area-claim' else 'use_event',source_zone='hand',actor=actor,source_instance_id=source,card_copy_id=g['cards'][source]['card_copy_id'],card_id=card,target_instance_ids=[],candidate_variant='seven_or_eight_cards' if card=='G-area-claim' else None,payment=dict(time=3 if card=='G-area-claim' else 2),source_references=[payments.capability(card)['reference']])
 # Construct before create because its validator requires preparation metadata.
 p['board']['prepared'].remove(prepared);p['hand'].append(prepared)
 e=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[link],pending_triggers=[],return_target='normal_action_opportunity'),3));p=e['legacy_continuation']['game_state']['players'][actor];p['hand'].remove(prepared);p['board']['prepared'].append(prepared);e['runtime']['public_prepared'][prepared]=dict(controller=actor,face_up=False,paid_time=2,placed_event_seq=1)
 e['legacy_continuation']['response_context'].update(chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2)
 return e,actor,source

class RuntimeApplicationTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'native application scope absent')
 def test_real_resolution_cap_zero_keeps_resolution_without_M06_M07_basis(self):
  def run(forced):
   e,actor,source=fixture();original=copy.deepcopy(e)
   with api.scope():
    r=payments.resolve(e,initial());after=r['new_envelopes'][0];event=r['new_events'][0]
    self.assertEqual(after['legacy_continuation']['game_state']['players'][actor]['growth'],100)
    self.assertIn(source,after['legacy_continuation']['game_state']['players'][actor]['discard'])
    proof=event['application_evidence'];self.assertTrue(proof['resolved']);self.assertEqual(proof['status'],'not_applied');self.assertEqual(proof['parts'][0]['requested_delta'],10);self.assertEqual(event['created_effect']['growth_added'],0)
    self.assertFalse(latching.applied(event));self.assertFalse(challenge.quick_effect_applied(after['legacy_continuation']['game_state'],[event],actor,0))
    self.assertEqual(latching.capture(e,after,event)['occurrences'],[])
    self.assertEqual(api.validate(r,e,initial()),[])
    bad=copy.deepcopy(r);bad['new_events'][0]['application_evidence']['status']='applied';self.assertTrue(api.validate(bad,e,initial()))
   self.assertEqual(api.validate(r,e,initial()),[])
   self.assertEqual(e,original);self.assertEqual(payments.resolve(e,initial())['new_envelopes'][0]['legacy_continuation']['game_state']['players'][actor]['growth'],110)
   return {}
  base.operation(initial(),run)
 def test_target_recheck_failure_is_resolved_without_effect_application(self):
  def run(forced):
   for card in ('G-archery-3d','E-big-illness','G-basketball-3d'):
    e,actor,source=fixture(card);c=e['legacy_continuation'];g=c['game_state'];link=c['activation_zone'][-1]
    link['action_type']=payments.QUICK_CARDS[card].get('action_type','use_event')
    # Conditional root: the originally selected physical target is now in hand.
    target=g['players'][actor]['hand'][0];link['target_instance_ids']=[target]
    with api.scope():
     r=payments.resolve(e,initial());event=r['new_events'][0];after=r['new_envelopes'][0]
     self.assertIsNone(event['created_effect'])
     self.assertEqual(event['application_evidence']['status'],'not_applied')
     self.assertEqual(event['application_evidence']['parts'][0]['reason'],'target_no_longer_legal')
     self.assertFalse(latching.applied(event));self.assertFalse(challenge.quick_effect_applied(after['legacy_continuation']['game_state'],[event],actor,0))
     self.assertIn(source,after['legacy_continuation']['game_state']['players'][actor]['discard'])
     self.assertEqual(api.validate(r,e,initial()),[])
   return {}
  base.operation(initial(),run)

 def test_unbound_null_receipt_remains_unproved(self):
  with api.scope():
   with self.assertRaisesRegex(ValueError,'unproved'):latching.applied(dict(created_effect=None))

 def test_ruling_source_drift_rejects_without_leaking_scope(self):
  import tempfile
  from pathlib import Path
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/api.RULING).write_text('changed ruling')
   with patch.object(api,'ROOT',root):
    with self.assertRaisesRegex(ValueError,'source'):
     with api.scope():pass
   self.assertFalse(api._LOCK.locked())

 def test_partial_growth_and_independent_draw_remain_application(self):
  def run(forced):
   for card,growth in [('G-area-claim',95),('E-boss',100)]:
    e,actor,_=fixture(card,growth)
    with api.scope():
     r=payments.resolve(e,initial());event=r['new_events'][0]
     self.assertTrue(latching.applied(event));self.assertTrue(challenge.quick_effect_applied(r['new_envelopes'][0]['legacy_continuation']['game_state'],[event],actor,0));self.assertEqual(event['application_evidence']['status'],'applied')
     self.assertEqual(r['new_envelopes'][0]['legacy_continuation']['game_state']['players'][actor]['growth'],100)
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
