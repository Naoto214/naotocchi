"""Bind existing comparison payments to source-pinned entry predicates."""
import copy, unittest
from unittest.mock import patch
from test_proxy_population_information_use import supplied,execute,window,runtime,initial
try:import proxy_population_payment_operands as api
except ImportError:api=None


class PaymentOperandTests(unittest.TestCase):
 def run_scoped(self,body):
  with window.contract_scope():runtime.operation(initial(),body)

 def test_actual_comparisons_reject_self_consistent_payment_and_time_tampering(self):
  self.assertIsNotNone(api)
  def run(forced):
   for card in ('E-boss','G-hit-blow','I-c_coin2','M-antlion-02','C-box','P-anglerfish','W-city','I-poop1'):
    e,actor,source,h=supplied('normal_action',card);step=execute(e,h,forced);d=step['decision']
    proof=api.audit_normal(e,h,d)
    if d['problem'] is None:
     self.assertFalse(proof['applicable']);self.assertFalse(proof['supported_payment_operands_verified']);self.assertEqual(proof['errors'],[])
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
   e,_,_,h=supplied('normal_action','G-hit-blow');d=execute(e,h,forced)['decision']
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
   e,_,_,h=supplied('normal_action','G-hit-blow');d=execute(e,h,forced)['decision']
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
   e,_,_,h=supplied('normal_action','G-hit-blow')
   with self.assertRaisesRegex(ValueError,'normal payment operands differ'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',tampered),window.contract_scope():runtime.operation(initial(),run)

 def test_duplicate_missing_and_unbound_comparison_rows_are_not_certified(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_,h=supplied('normal_action','G-hit-blow');d=execute(e,h,forced)['decision']
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
