"""Current P11 comparisons: unknown upper operands cannot spend lower ranks."""
import copy
import unittest
from unittest.mock import patch
from test_proxy_population_information_use import supplied,execute,window,runtime,initial
try:import proxy_population_comparison_evidence as api
except ImportError:api=None

class ComparisonEvidenceTests(unittest.TestCase):
 def test_current_general_contract_keeps_paid_and_free_candidates_with_unknown_upper(self):
  def run(forced):
   for card in ('I-poop1','M-antlion-02','C-box','P-anglerfish','W-city','E-boss','G-hit-blow','I-c_coin2'):
    with self.subTest(card=card):
     e,_,_,h=supplied('normal_action',card);step=execute(e,h,forced);d=step['decision']
     self.assertEqual(d['choice']['resolution_mode'],'seeded_fallback')
     self.assertEqual(d['choice']['seeded_fallback_candidates'],d['inventory']['legal_candidate_ids'])
     self.assertEqual(runtime._evaluate(d)['legacy_116'],'excluded')
     self.assertIsNotNone(api)
     proof=d['execution_evidence']['comparison_operands']
     self.assertEqual(set(proof['candidates']),set(d['inventory']['legal_candidate_ids']))
     for cid,row in proof['candidates'].items():
      self.assertEqual(row['operands']['avoid_loss_or_abort']['status'],'unknown')
      self.assertIsNone(row['operands']['avoid_loss_or_abort']['value'])
      self.assertEqual(row['payment']['candidate_id'],cid)
     self.assertEqual(step['normal_comparison_evidence']['errors'],[])
     self.assertFalse(d['execution_evidence']['strategic_proof'])
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_unknown_at_each_rank_blocks_lower_difference_but_known_earlier_order_wins(self):
  self.assertIsNotNone(api)
  for index in range(4):
   left={k:dict(status='known',value=0) for k in api.PRIORITIES}
   right=copy.deepcopy(left);key=api.PRIORITIES[index]
   left[key]=dict(status='unknown',value=None)
   right[api.PRIORITIES[-1]]=dict(status='known',value=99)
   self.assertEqual(api.compare(left,right)['winner'],'unresolved')
   if index:
    left[api.PRIORITIES[0]]=dict(status='known',value=1)
    self.assertEqual(api.compare(left,right)['winner'],'left')

 def test_proved_upper_equalities_allow_time_order_without_replacing_unknown(self):
  self.assertIsNotNone(api)
  left={k:dict(status='known',value=0) for k in api.PRIORITIES}
  right=copy.deepcopy(left);left[api.PRIORITIES[-1]]['value']=1
  result=api.compare(left,right)
  self.assertEqual(result['winner'],'left');self.assertEqual(result['decided_at'],'time_after_certain_resolution')
  right[api.PRIORITIES[-1]]['value']=1
  self.assertEqual(api.compare(left,right)['winner'],'unresolved')

 def test_conditional_proved_unique_order_does_not_use_fallback(self):
  # Arithmetic wiring only. Supplied integer examples are NOT a source proof
  # for I-poop1, and the actual runtime builder must reject this evidence.
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1');actual=execute(e,h,forced)['decision']
   proof=copy.deepcopy(actual['execution_evidence']['comparison_operands'])
   for row in proof['candidates'].values():
    for value in row['operands'].values():value.update(status='known',value=0)
   proof['candidates']['pass']['operands']['time_after_certain_resolution']['value']=1
   with patch.object(api,'operands',return_value=proof):
    conditional=api.select(e,actual['inventory'],actual['context'],runtime.POLICY)
   self.assertEqual(conditional['selected_candidate'],'pass')
   self.assertEqual(conditional['choice']['resolution_mode'],'priority_unique')
   self.assertNotIn('seed_proof',conditional['choice'])
   self.assertTrue(api.audit(e,conditional)['errors'])
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_boolean_and_missing_proofs_are_not_numeric_equality(self):
  self.assertIsNotNone(api)
  left={k:dict(status='known',value=0) for k in api.PRIORITIES}
  for bad in ({},dict(status='known',value=False),dict(status='unknown',value=0)):
   right=copy.deepcopy(left);right[api.PRIORITIES[0]]=bad
   with self.assertRaises(ValueError):api.compare(left,right)

 def test_fresh_entry_and_export_reject_forged_operands_partition_or_exclusion(self):
  self.assertIsNotNone(api)
  import proxy_population_decision_binding as binding
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1');step=execute(e,h,forced)
   binding.require_current_comparison(step)
   for kind in ('zero','reason','payment','missing','frontier','flag','proof','contract'):
    bad=copy.deepcopy(step);d=bad['decision'];rows=d['execution_evidence']['comparison_operands']['candidates']
    if kind=='zero':rows['pass']['operands']['avoid_loss_or_abort']=dict(status='known',value=0)
    elif kind=='reason':rows['pass']['operands']['avoid_loss_or_abort']['reason']=''
    elif kind=='payment':rows['pass']['payment']['payment_time']=1
    elif kind=='missing':rows.pop('pass')
    elif kind=='frontier':d['choice']['seeded_fallback_candidates']=['pass']
    elif kind=='flag':d['execution_evidence']['strategic_proof']=True
    elif kind=='contract':d['execution_evidence']['contract']='existing116_unproved_upper_comparison.v1'
    else:bad['normal_comparison_evidence']['comparison_evidence_verified']=False
    with self.subTest(kind=kind):
     with self.assertRaises(ValueError):binding.require_current_comparison(bad)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_actual_entry_rejects_self_consistent_known_zero_claim_before_export(self):
  native=runtime._step
  def forged(*args,**kwargs):
   step=native(*args,**kwargs)
   rows=step['decision']['execution_evidence']['comparison_operands']['candidates']
   for row in rows.values():
    for value in row['operands'].values():value.update(status='known',value=0)
   return step
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1')
   with self.assertRaisesRegex(ValueError,'normal comparison evidence differs'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',forged),window.contract_scope():runtime.operation(initial(),run)

 def test_shared_operand_producer_cannot_promote_unproved_zero(self):
  self.assertIsNotNone(api)
  native=api.operands
  def forged(*args):
   proof=native(*args)
   for row in proof['candidates'].values():
    for value in row['operands'].values():value.update(status='known',value=0)
   return proof
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1')
   with patch.object(api,'operands',forged),self.assertRaisesRegex(ValueError,'normal comparison evidence differs'):execute(e,h,forced)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_hidden_order_and_opponent_hand_do_not_change_proof_or_selection(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,actor,_,h=supplied('normal_action','I-poop1');other=copy.deepcopy(e)
   g=other['legacy_continuation']['game_state'];opponent='B' if actor=='A' else 'A'
   g['players'][actor]['deck'].reverse();p=g['players'][opponent]
   p['hand'],p['deck'][:len(p['hand'])]=p['deck'][:len(p['hand'])],p['hand']
   self.assertEqual(execute(e,h,forced)['decision'],execute(other,h,forced)['decision'])
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
