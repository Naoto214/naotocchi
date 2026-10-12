"""Fresh partial/helper payment proofs must reach the ordinary export gate."""
import copy,unittest
from unittest.mock import patch
import proxy_population_payment_operands as payment
import proxy_population_decision_binding as gate
import proxy_population_departure as departure
from test_proxy_population_information_use import supplied,execute,window,runtime,initial
from test_proxy_population_fallback_payment import supplied as helper_supplied


class PaymentGateTests(unittest.TestCase):
 def fresh(self,kind,forced):
  if kind=='helper':
   e=helper_supplied()
   with departure.scope():return runtime._step(e,initial(),[],[],[e],forced)
  e,_,_,events=supplied('normal_action','I-c_coin2' if kind=='partial' else 'I-poop1')
  return execute(e,events,forced)

 def test_fresh_partial_and_helper_payment_unproved_stops_at_export_gate(self):
  for kind in ('partial','helper','normal'):
   with self.subTest(kind=kind):
    native=payment.audit_normal;seen=[]
    def incomplete(*args,**kwargs):
     proof=native(*args,**kwargs)
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supported_payment_operands_verified']);seen.append(True)
     proof['supported_payment_operands_verified']=False
     return proof
    def run(forced):
     with patch.object(payment,'audit_normal',incomplete):step=self.fresh(kind,forced)
     self.assertTrue(seen)
     with self.assertRaisesRegex(ValueError,'current comparison payment coverage incomplete'):gate.require_current_predicates(step)
     return {}
    with window.contract_scope():runtime.operation(initial(),run)

 def test_partition_mutations_are_rejected_and_unknowns_are_not_certified(self):
  def run(forced):
   for kind in ('partial','helper','normal'):
    step=self.fresh(kind,forced);gate.require_current_predicates(step)
    for mode in ('missing','schema','applicable','flag_bool','omit','duplicate','foreign','unknown','errors'):
     bad=copy.deepcopy(step);proof=bad['normal_payment_operands']
     if mode=='missing':bad.pop('normal_payment_operands')
     elif mode=='schema':proof['schema']='foreign'
     elif mode=='applicable':proof['applicable']=False
     elif mode=='flag_bool':proof['supported_payment_operands_verified']=1
     elif mode=='omit':proof['verified_candidates'].pop()
     elif mode=='duplicate':proof['verified_candidates'].append(copy.deepcopy(proof['verified_candidates'][0]))
     elif mode=='foreign':proof['verified_candidates'][0]['candidate_id']='foreign'
     elif mode=='unknown':proof['unproved_candidates'].append(dict(candidate_id='foreign',reason='unknown'))
     else:proof['errors']=['unproved source']
     with self.subTest(kind=kind,mode=mode):
      with self.assertRaisesRegex(ValueError,'current comparison payment coverage incomplete'):gate.require_current_predicates(bad)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_all_unknown_actual_comparison_remains_excluded_without_empty_payment_certificate(self):
  from test_proxy_population_pass_end_unknown import supplied as unknown
  def run(forced):
   e,events=unknown();step=runtime._step(e,initial(),events,[],[e],forced)
   evidence=step['decision']['execution_evidence']['candidate_comparison_evidence']
   self.assertEqual(evidence['proved_scores'],{});self.assertTrue(evidence['unproved'])
   proof=step['normal_payment_operands'];self.assertEqual(proof['verified_candidates'],[])
   self.assertFalse(proof['supported_payment_operands_verified']);gate.require_current_predicates(step)
   self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertFalse(proof['operand_provenance_verified'])
   for mode in ('promote','omit_unknown','change_reason','duplicate_unknown'):
    bad=copy.deepcopy(step);p=bad['normal_payment_operands']
    if mode=='promote':p['supported_payment_operands_verified']=True
    elif mode=='omit_unknown':p['unproved_candidates'].pop()
    elif mode=='change_reason':p['unproved_candidates'][0]['comparison_reason']='invented'
    else:p['unproved_candidates'].append(copy.deepcopy(p['unproved_candidates'][0]))
    with self.subTest(mode=mode):
     with self.assertRaisesRegex(ValueError,'current comparison payment coverage incomplete'):gate.require_current_predicates(bad)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_manifest_driver_stops_before_exporting_unproved_partial_payment(self):
  import proxy_population_connected_entry as connected
  from test_proxy_mandatory_population_input import bundle
  native=payment.audit_normal;seen=[]
  def incomplete(envelope,events,decision):
   proof=native(envelope,events,decision)
   if decision.get('execution_evidence',{}).get('contract')=='existing116_unproved_upper_comparison.v1':
    self.assertTrue(proof['verified_candidates']);self.assertTrue(proof['unproved_candidates']);self.assertEqual(proof['errors'],[])
    proof['supported_payment_operands_verified']=False;seen.append(True)
   return proof
  with patch.object(payment,'audit_normal',incomplete):result=connected.reconstruct(bundle(),'test-1A',34)
  self.assertTrue(seen);self.assertIsNotNone(result['runtime']['stop'])
  self.assertIn('current comparison payment coverage incomplete',result['runtime']['stop']['detail'])
  self.assertFalse(any(s['decision'] and s['decision'].get('execution_evidence',{}).get('contract')=='existing116_unproved_upper_comparison.v1' for s in result['runtime']['steps']))

if __name__=='__main__':unittest.main()
