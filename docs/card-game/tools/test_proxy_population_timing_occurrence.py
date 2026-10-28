"""Reject omitted event obligations even when producer and replay agree."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
from test_proxy_population_positive_window import setup
import proxy_population_runtime as runtime
import proxy_population_trigger_latching as producer
import proxy_population_challenge_window as connected
try:import proxy_population_timing_occurrence as api
except ImportError:api=None

class TimingOccurrenceTests(unittest.TestCase):
 def test_independent_check_binds_negative_classifications_and_positive_rows(self):
  self.assertIsNotNone(api,'independent timing occurrence check missing')
  def run(forced):
   before,after,event,source=case();capture=producer.capture(before,after,event)
   check=api.audit(before,after,event,capture)
   self.assertEqual(check['errors'],[]);self.assertTrue(check['supplied_timing_occurrences_verified'])
   self.assertFalse(check['all_rule_opportunities_proven'])
   mutations=[]
   for field in ('occurrences','classifications'):
    bad=copy.deepcopy(capture);bad[field]=[];mutations.append(bad)
   bad=copy.deepcopy(capture);bad['occurrences']*=2;mutations.append(bad)
   bad=copy.deepcopy(capture);bad['occurrences'][0]['actor']='B';mutations.append(bad)
   bad=copy.deepcopy(capture);bad['before_envelope_sha256']='0'*64;mutations.append(bad)
   for bad in mutations:self.assertTrue(api.audit(before,after,event,bad)['errors'])
   event['result']['effect_applied']=False;negative=producer.capture(before,after,event)
   self.assertEqual(api.audit(before,after,event,negative)['errors'],[])
   negative['occurrences']=capture['occurrences'];self.assertTrue(api.audit(before,after,event,negative)['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_real_entry_does_not_accept_consistently_omitted_producer_occurrence(self):
  supplied=setup();before=supplied['envelope'];native=producer.capture
  def omitted(*args):
   result=native(*args);result['occurrences']=[];return result
  with patch.object(producer,'capture',omitted):
   result=connected.segment(before,initial(),supplied['history'],[],[before],1,supplied['proof'])
  self.assertIsNotNone(result['stop'],'producer omission silently accepted')
  self.assertIn('timing occurrence',result['stop']['detail'])

import proxy_population_trigger_effects as effects
import proxy_population_effect_creation as creation
import proxy_continuation_payments as payments
import proxy_continuation_end as end
from test_proxy_population_effect_creation import quick_case

def raw(event):return {k:v for k,v in event.items() if k not in end.BIND_KEYS}

class TypedCreationApplicationTests(unittest.TestCase):
 """M-antlion-06 timing on a resolved own quick typed-creation card (474/67).

 The producers emit the typed row itself, never an effect_applied bool; the
 verdict must come from the existing creation full-delta audit, not receipt keys.
 """
 def run_case(self,callback):
  def run(forced):
   with effects.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def resolved(self,card,illegal_target=False):
  e=quick_case(card);c=e['legacy_continuation'];g=c['game_state'];link=c['activation_zone'][-1]
  self.assertEqual(g['cards'][g['players']['A']['board']['main']]['card_id'],'M-antlion-06');self.assertEqual(g['turn_player'],'A')
  if illegal_target:link['target_instance_ids']=[g['players']['A']['hand'][0]]
  r=payments.resolve(e,initial());return e,r['new_envelopes'][0],raw(r['new_events'][0]),link
 def test_created_typed_row_is_certified_by_creation_audit_not_receipt_keys(self):
  def run():
   for card in ('E-fateful-transform','G-beach-volley','G-basketball-3d'):
    with self.subTest(card=card):
     e,a,ev,link=self.resolved(card)
     self.assertEqual(ev['action_type'],'resolve_payment_modifier');self.assertNotIn('effect_applied',ev['created_effect']);self.assertNotIn('application_evidence',ev)
     capture=producer.capture(e,a,ev);self.assertEqual([o['ability_key'] for o in capture['occurrences']],['after_own_quick_effect_applied'])
     check=api.audit(e,a,ev,capture);self.assertEqual(check['errors'],[]);self.assertEqual(check['expected_occurrence_count'],1)
     # The receipt alone never latches: the typed row must exist exactly as derived.
     family=creation.audit(e,a,ev)['effect_family'];bad=copy.deepcopy(a);bad['runtime'][family]=[]
     self.assertTrue(api.audit(e,bad,ev,producer.capture(e,bad,ev))['errors'])
     forged=copy.deepcopy(ev);forged['created_effect']=dict(forged['created_effect'],effect_id='stat-effect-999-forged')
     with self.assertRaises(ValueError):api.application(e,a,forged,link)
     kind=copy.deepcopy(ev);kind['action_type']='resolve_event'
     with self.assertRaises(ValueError):api.application(e,a,kind,link)
     boundary=copy.deepcopy(e);boundary['legacy_continuation']['response_context']['consecutive_passes']=1
     with self.assertRaises(ValueError):api.application(boundary,a,ev,link)
   return {}
  self.run_case(run)
 def test_target_recheck_failure_is_not_applied_only_with_474_evidence(self):
  def run():
   for card in ('G-beach-volley','G-basketball-3d'):
    with self.subTest(card=card):
     e,a,ev,link=self.resolved(card,illegal_target=True)
     self.assertIsNone(ev['created_effect']);self.assertEqual(ev['application_evidence']['status'],'not_applied')
     capture=producer.capture(e,a,ev);self.assertEqual(capture['occurrences'],[])
     check=api.audit(e,a,ev,capture);self.assertEqual(check['errors'],[]);self.assertEqual(check['expected_occurrence_count'],0)
     flipped=copy.deepcopy(ev);flipped['application_evidence']['status']='applied'
     with self.assertRaises(ValueError):api.application(e,a,flipped,link)
     stripped=copy.deepcopy(ev);del stripped['application_evidence']
     with self.assertRaisesRegex(ValueError,'typed application evidence'):api.application(e,a,stripped,link)
     unproved=copy.deepcopy(ev);unproved['application_evidence']['parts'][0]['status']='unproved';unproved['application_evidence']['status']='unproved'
     with self.assertRaises(ValueError):api.application(e,a,unproved,link)
   return {}
  self.run_case(run)
 def test_untyped_non_creation_receipts_stay_unproved(self):
  def run():
   e,a,ev,link=self.resolved('G-beach-volley')
   final=copy.deepcopy(ev);final.update(action_type='resolve_event',created_effect=None,result=dict(drawn_instance_ids=['A-001#1'],returned_discard_to_deck_bottom='A-002#1',growth_added=0))
   with self.assertRaisesRegex(ValueError,'typed application evidence'):api.application(e,a,final,dict(link,card_id='E-final-time'))
   typed=copy.deepcopy(ev);typed['created_effect']={'effect_applied':False}
   self.assertIs(api.application(e,a,typed,link),False)
   from test_proxy_population_trigger_latching import case
   b,a2,ev2,_=case();self.assertEqual(api.audit(b,a2,ev2,producer.capture(b,a2,ev2))['expected_occurrence_count'],1)
   ev2['result']['effect_applied']=False;self.assertEqual(api.audit(b,a2,ev2,producer.capture(b,a2,ev2))['expected_occurrence_count'],0)
   return {}
  self.run_case(run)

import test_proxy_population_trigger_latching as timing_fixtures
class OtherTimingCrossAuditTests(timing_fixtures.OtherTimingTests):
 def setUp(self):
  native=producer.capture
  def checked(before,after,event):
   capture=native(before,after,event)
   self.assertEqual(api.audit(before,after,event,capture)['errors'],[])
   return capture
  self.capture_patch=patch.object(producer,'capture',checked)
  self.capture_patch.start();self.addCleanup(self.capture_patch.stop)

if __name__=='__main__':unittest.main()
