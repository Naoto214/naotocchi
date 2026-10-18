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

 def test_all_unknown_upper_comparisons_keep_independently_proved_payments(self):
  from test_proxy_population_pass_end_unknown import supplied as unknown
  def run(forced):
   e,events=unknown();step=runtime._step(e,initial(),events,[],[e],forced)
   evidence=step['decision']['execution_evidence']['comparison_operands']['candidates']
   self.assertTrue(evidence)
   for row in evidence.values():
    for operand in row['operands'].values():
     self.assertEqual(operand['status'],'unknown');self.assertIsNone(operand['value'])
   proof=step['normal_payment_operands']
   self.assertEqual({r['candidate_id'] for r in proof['verified_candidates']},set(evidence))
   self.assertTrue(proof['supported_payment_operands_verified']);gate.require_current_predicates(step)
   self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertFalse(proof['operand_provenance_verified'])
   for mode in ('promote','omit','change_reason'):
    bad=copy.deepcopy(step);operands=bad['decision']['execution_evidence']['comparison_operands']['candidates']
    key=next(iter(operands));operand=operands[key]['operands']['avoid_loss_or_abort']
    if mode=='promote':operand.update(status='known',value=0)
    elif mode=='omit':del operands[key]
    else:operand['reason']='invented'
    with self.subTest(mode=mode):
     with self.assertRaisesRegex(ValueError,'current normal comparison evidence incomplete'):gate.require_current_predicates(bad)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_manifest_driver_stops_before_exporting_unproved_partial_payment(self):
  import proxy_population_connected_entry as connected
  from test_proxy_mandatory_population_input import bundle
  native=payment.audit_normal;seen=[]
  def incomplete(envelope,events,decision):
   proof=native(envelope,events,decision)
   if decision.get('execution_evidence',{}).get('contract')=='current_normal_comparison_evidence.v1':
    self.assertTrue(proof['verified_candidates']);self.assertEqual(proof['unproved_candidates'],[]);self.assertEqual(proof['errors'],[])
    proof['supported_payment_operands_verified']=False;seen.append(True)
   return proof
  with patch.object(payment,'audit_normal',incomplete):result=connected.reconstruct(bundle(),'test-1A',34)
  self.assertTrue(seen);self.assertIsNotNone(result['runtime']['stop'])
  self.assertIn('current comparison payment coverage incomplete',result['runtime']['stop']['detail'])
  self.assertFalse(any(s['decision'] and s['decision'].get('execution_evidence',{}).get('contract')=='current_normal_comparison_evidence.v1' for s in result['runtime']['steps']))

if __name__=='__main__':unittest.main()
