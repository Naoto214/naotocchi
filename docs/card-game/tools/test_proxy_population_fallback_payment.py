"""Preserve every upper comparison row even when its frontier uses old116."""
import copy
import unittest
from unittest.mock import patch
import proxy_population_departure as departure
import proxy_population_payment_operands as payment
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
from test_proxy_population_departure import fixture
from test_proxy_population_runtime import initial


def supplied():
 e,_,_=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A']
 main=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-beetle-01');p['deck'].remove(main);p['hand'].append(main)
 return e


class FallbackPaymentTests(unittest.TestCase):
 def test_frontier_retains_all_compared_rows_and_checks_their_payments(self):
  def run(forced):
   e=supplied()
   with departure.scope():step=runtime._step(e,initial(),[],[],[e],forced)
   d=step['decision'];self.assertEqual(d['choice']['resolution_mode'],'seeded_fallback')
   self.assertIn('fallback_priority_problem',d)
   p=d['fallback_priority_problem'];self.assertEqual({r['candidate_id'] for r in p['candidates']},set(d['inventory']['legal_candidate_ids']))
   excluded=set(p['legal_candidate_ids'])-set(d['choice']['seeded_fallback_candidates']);self.assertTrue(excluded)
   proof=payment.audit_normal(step['source_envelope'],[],d)
   self.assertTrue(proof['supported_payment_operands_verified'],proof);self.assertEqual(proof['unproved_candidates'],[])
   self.assertEqual({r['candidate_id'] for r in proof['verified_candidates']},set(p['legal_candidate_ids']))
   for mode in ('absent','omit','cost','mode'):
    bad=copy.deepcopy(d)
    if mode=='absent':bad.pop('fallback_priority_problem')
    elif mode=='omit':bad['fallback_priority_problem']['candidates'].pop()
    elif mode=='mode':bad['choice']['resolution_mode']='priority_unique'
    else:
     row=next(r for r in bad['fallback_priority_problem']['candidates'] if r['candidate_id'] in excluded)
     row['payment_time']+=1;row['time_after_certain_resolution']-=1
    self.assertTrue(payment.audit_normal(step['source_envelope'],[],bad)['errors'],mode)
   self.assertEqual(runtime._evaluate(d)['legacy_116'],'excluded');self.assertFalse(proof['operand_provenance_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_shared_paid_draw_and_recovery_routes_bind_payments(self):
  import proxy_population_paid_draw as paid
  import proxy_population_discard_recovery as recovery
  from test_proxy_population_paid_draw import fixture as paid_fixture
  from test_proxy_population_discard_recovery import fixture as recovery_fixture
  for kind in ('paid','recovery'):
   with self.subTest(kind=kind):
    def run(forced):
     if kind=='paid':e,_,_=paid_fixture('M-antlion-02');events=[];scope=paid.scope
     else:e,events,_,_=recovery_fixture();e=runtime.engine.payments.upgrade(e);scope=recovery.scope
     g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
     p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
     with scope():step=runtime._step(e,initial(),events,[],[e],forced)
     d=step['decision'];self.assertEqual(d['choice']['resolution_mode'],'seeded_fallback')
     proof=payment.audit_normal(step['source_envelope'],events,d)
     self.assertTrue(proof['supported_payment_operands_verified'],proof);self.assertEqual(proof['unproved_candidates'],[])
     self.assertEqual(len(proof['verified_candidates']),len(d['inventory']['legal_candidate_ids']))
     bad=copy.deepcopy(d);bad.pop('fallback_priority_problem')
     self.assertTrue(payment.audit_normal(step['source_envelope'],events,bad)['errors'])
     return {}
    runtime.operation(initial(),run)

 def test_actual_entry_rejects_missing_fallback_comparison_record(self):
  native=departure.select_verified_zero_immediate
  def missing(*args,**kwargs):
   result=native(*args,**kwargs);result.pop('fallback_priority_problem',None);return result
  def run(forced):
   e=supplied()
   with patch.object(departure,'select_verified_zero_immediate',missing),departure.scope():
    with self.assertRaisesRegex(ValueError,'normal payment operands differ'):runtime._step(e,initial(),[],[],[e],forced)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
