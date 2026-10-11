"""Bind existing comparison payments to source-pinned entry predicates."""
import copy, unittest
from unittest.mock import patch
from test_proxy_population_information_use import supplied,execute,window,runtime,initial
try:import proxy_population_payment_operands as api
except ImportError:api=None


class PaymentOperandTests(unittest.TestCase):
 def run_scoped(self,body):
  with window.contract_scope():runtime.operation(initial(),body)

 def test_partial_unknown_frontier_checks_proved_payments_without_certifying_unknowns(self):
  def run(forced):
   e,_,source,h=supplied('normal_action','I-c_coin2');d=execute(e,h,forced)['decision']
   evidence=d['execution_evidence']['candidate_comparison_evidence']
   self.assertIn('pass',evidence['proved_scores']);self.assertTrue(evidence['unproved'])
   for mode in ('cost','missing','overlap','identity','evidence','reason','cost_bool','foreign_route'):
    bad=copy.deepcopy(d);part=bad['execution_evidence']['candidate_comparison_evidence']
    if mode=='cost':part['proved_scores']['pass']['payment_time']=1;part['proved_scores']['pass']['time_after_certain_resolution']-=1
    elif mode=='missing':part['proved_scores'].pop('pass')
    elif mode=='overlap':part['unproved']['pass']='invented'
    elif mode=='identity':part['proved_scores']['pass']['candidate_id']='foreign'
    elif mode=='evidence':bad['execution_evidence'].pop('candidate_comparison_evidence')
    elif mode=='reason':part['unproved'][next(iter(part['unproved']))]=''
    elif mode=='foreign_route':bad['fallback_priority_problem']=dict(legal_candidate_ids=['foreign'],candidates=[dict(candidate_id='foreign',payment_time=999)])
    else:part['proved_scores']['pass']['payment_time']=False
    with self.subTest(mode=mode):self.assertTrue(api.audit_normal(e,h,bad)['errors'])
   proof=api.audit_normal(e,h,d)
   self.assertTrue(proof['applicable']);self.assertTrue(proof['supported_payment_operands_verified']);self.assertEqual(proof['errors'],[])
   self.assertEqual({r['candidate_id'] for r in proof['verified_candidates']},set(evidence['proved_scores']))
   self.assertEqual({r['candidate_id'] for r in proof['unproved_candidates']},set(evidence['unproved']))
   self.assertFalse(proof['operand_provenance_verified']);self.assertIsNone(proof['policy_eligible'])
   self.assertEqual(runtime._evaluate(d)['legacy_116'],'excluded')
   return {}
  self.run_scoped(run)

 def test_actual_entry_rejects_partial_frontier_conflicting_route(self):
  prior=runtime._step
  def tampered(*args,**kwargs):
   step=prior(*args,**kwargs)
   step['decision']['fallback_priority_problem']=dict(legal_candidate_ids=['foreign'],candidates=[dict(candidate_id='foreign',payment_time=999)])
   return step
  def run(forced):
   e,_,_,h=supplied('normal_action','I-c_coin2')
   with self.assertRaisesRegex(ValueError,'normal payment operands differ'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',tampered),window.contract_scope():runtime.operation(initial(),run)

 def test_actual_entry_rejects_partial_frontier_payment_tampering(self):
  prior=runtime._step
  def tampered(*args,**kwargs):
   step=prior(*args,**kwargs)
   row=step['decision']['execution_evidence']['candidate_comparison_evidence']['proved_scores']['pass']
   row['payment_time']=1;row['time_after_certain_resolution']-=1
   return step
  def run(forced):
   e,_,_,h=supplied('normal_action','I-c_coin2')
   with self.assertRaisesRegex(ValueError,'normal payment operands differ'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',tampered),window.contract_scope():runtime.operation(initial(),run)

 def test_partial_proved_row_requires_a_certified_payment_at_actual_entry(self):
  native=api.core.audit_normal;seen=[]
  def missing(*args,**kwargs):
   proof=native(*args,**kwargs)
   for unit in proof['verified_units']:
    if unit.get('action_type')=='set_item':unit['payment_time']=None;seen.append(True)
   return proof
  def run(forced):
   e,actor,_,h=supplied('normal_action','I-c_coin2');g=e['legacy_continuation']['game_state'];p=g['players'][actor]
   item=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-poop1');p['deck'].remove(item);p['hand'].append(item)
   with patch.object(api.core,'audit_normal',missing):
    with self.assertRaisesRegex(ValueError,'normal payment operands differ'):execute(e,h,forced)
   self.assertTrue(seen)
   return {}
  self.run_scoped(run)

 def test_actual_comparisons_reject_self_consistent_payment_and_time_tampering(self):
  self.assertIsNotNone(api)
  def run(forced):
   for card in ('E-boss','G-hit-blow','I-c_coin2','M-antlion-02','C-box','P-anglerfish','W-city','I-poop1'):
    e,actor,source,h=supplied('normal_action',card);step=execute(e,h,forced);d=step['decision']
    proof=api.audit_normal(e,h,d)
    if d['problem'] is None:
     self.assertTrue(proof['applicable']);self.assertEqual(proof['errors'],[])
     evidence=d['execution_evidence']['candidate_comparison_evidence']
     self.assertEqual({r['candidate_id'] for r in proof['unproved_candidates']},set(evidence['unproved']))
     self.assertEqual({r['candidate_id'] for r in proof['verified_candidates']},set(evidence['proved_scores']))
     self.assertEqual(step['normal_payment_operands'],proof);continue
    self.assertTrue(proof['supported_payment_operands_verified'],proof)
    self.assertEqual(proof['unproved_candidates'],[])
    self.assertEqual(len(proof['verified_candidates']),len(d['problem']['candidates']))
    self.assertEqual(step['normal_payment_operands'],proof)
    self.assertFalse(proof['operand_provenance_verified']);self.assertFalse(proof['origin_authenticated'])
    self.assertIsNone(proof['balance_admitted'])
    for row_index in range(len(d['problem']['candidates'])):
     for mode in ('both','cost_bool','remaining_bool','missing_cost','missing_time'):
      bad=copy.deepcopy(d);row=bad['problem']['candidates'][row_index]
      if mode=='both':row['payment_time']+=1;row['time_after_certain_resolution']-=1
      elif mode=='cost_bool':row['payment_time']=bool(row['payment_time'])
      elif mode=='remaining_bool':row['time_after_certain_resolution']=bool(row['time_after_certain_resolution'])
      elif mode=='missing_cost':row.pop('payment_time')
      else:row.pop('time_after_certain_resolution')
      with self.subTest(card=card,row=row_index,mode=mode):self.assertFalse(api.audit_normal(e,h,bad)['supported_payment_operands_verified'])
   return {}
  self.run_scoped(run)

 def test_source_pins_and_other_priority_limits_remain_explicit(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1');d=execute(e,h,forced)['decision']
   with patch.dict(api.core.SOURCES,{'01-core-rules.md':'0'*64}):
    self.assertFalse(api.audit_normal(e,h,d)['supported_payment_operands_verified'])
   bad=copy.deepcopy(d)
   for row in bad['problem']['candidates']:row['certain_growth_difference']+=8
   p=api.audit_normal(e,h,bad)
   self.assertTrue(p['supported_payment_operands_verified']);self.assertFalse(p['other_priority_operands_proven']);self.assertFalse(p['operand_provenance_verified'])
   return {}
  self.run_scoped(run)

 def test_unknown_route_cannot_alias_a_verified_enumeration_unit(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1');d=execute(e,h,forced)['decision']
   row=copy.deepcopy(next(r for r in d['inventory']['enumeration_units'] if r['candidate_id']=='pass'))
   row.update(candidate_id='unknown-board',action_type='activate_board',source_family='board_ability',enumeration_unit_id='distinct-unknown-unit')
   d['inventory']['enumeration_units'].append(row);d['inventory']['legal_candidate_details'].append(copy.deepcopy(row))
   d['inventory']['legal_candidate_ids'].append(row['candidate_id']);d['inventory']['legal_candidate_ids'].sort()
   d['problem']['legal_candidate_ids']=copy.deepcopy(d['inventory']['legal_candidate_ids'])
   score=copy.deepcopy(next(r for r in d['problem']['candidates'] if r['candidate_id']=='pass'));score['candidate_id']=row['candidate_id'];d['problem']['candidates'].append(score)
   proof=api.audit_normal(e,h,d)
   self.assertEqual(proof['errors'],[]);self.assertEqual([r['candidate_id'] for r in proof['unproved_candidates']],['unknown-board'])
   self.assertFalse(proof['operand_provenance_verified'])
   pass_id=next(r['enumeration_unit_id'] for r in d['inventory']['enumeration_units'] if r['candidate_id']=='pass')
   for key in ('enumeration_units','legal_candidate_details'):
    next(r for r in d['inventory'][key] if r['candidate_id']=='unknown-board')['enumeration_unit_id']=pass_id
   proof=api.audit_normal(e,h,d)
   self.assertFalse(proof['supported_payment_operands_verified'],proof)
   return {}
  self.run_scoped(run)

 def test_actual_entry_rejects_tampered_comparison_without_revaluing_candidates(self):
  self.assertIsNotNone(api);prior=runtime._step
  def tampered(*args,**kwargs):
   step=prior(*args,**kwargs)
   for row in step['decision']['problem']['candidates']:row['payment_time']+=1;row['time_after_certain_resolution']-=1
   return step
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1')
   with self.assertRaisesRegex(ValueError,'normal payment operands differ'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',tampered),window.contract_scope():runtime.operation(initial(),run)

 def test_duplicate_missing_and_unbound_comparison_rows_are_not_certified(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_,h=supplied('normal_action','I-poop1');d=execute(e,h,forced)['decision']
   for mode in ('duplicate','missing','foreign','unknown_time','source'):
    bad=copy.deepcopy(d);source=copy.deepcopy(e)
    if mode=='duplicate':bad['problem']['candidates'].append(copy.deepcopy(bad['problem']['candidates'][0]))
    elif mode=='missing':bad['problem']['candidates'].pop()
    elif mode=='foreign':bad['problem']['candidates'][0]['candidate_id']='unbound'
    elif mode=='unknown_time':source['legacy_continuation']['game_state']['players'][source['legacy_continuation']['game_state']['turn_player']]['time']=True
    else:bad['inventory']['enumeration_units'][0]['candidate_variant']='invented-pass'
    with self.subTest(mode=mode):self.assertFalse(api.audit_normal(source,h,bad)['supported_payment_operands_verified'])
   # An absent comparison has no payment evidence, not an empty proof.
   bad=copy.deepcopy(d);bad['problem']=None
   proof=api.audit_normal(e,h,bad);self.assertFalse(proof['supported_payment_operands_verified']);self.assertFalse(proof['operand_provenance_verified'])
   return {}
  self.run_scoped(run)

if __name__=='__main__':unittest.main()
