"""Source-bound time cost stays distinct from physical costs and value."""
import copy
import unittest
from unittest.mock import patch
from test_proxy_population_board_predicates import runtime, initial, connected, candidates, recovery
from test_proxy_population_paid_draw import fixture, api as paid
from test_proxy_population_discard_recovery import fixture as cat_fixture
import proxy_population_board_predicates as board
import proxy_population_payment_operands as operands


def fixtures():
 for card in ('M-antlion-02', 'M-antlion-08', 'C-cat_friend'):
  if card == 'C-cat_friend':
   e, events, source, _ = cat_fixture(); e = runtime.engine.payments.upgrade(e)
  else:
   e, source, _ = fixture(card); events = []
  e['legacy_continuation']['game_state']['phase'] = 'normal_action'
  yield card, e, events, source


class BoardPaymentBindingTests(unittest.TestCase):
 def run_scoped(self, callback):
  def run(forced):
   with paid.scope(), recovery.scope(): callback()
   return {}
  with connected.contract_scope(): runtime.operation(initial(), run)

 def test_source_costs_are_explicit_without_valuing_physical_payment(self):
  def run():
   for card, e, events, source in fixtures():
    inv = candidates.audit(e, events); proof = board.audit_normal(e, inv)
    self.assertEqual(proof['errors'], [])
    rows = [r for r in proof['verified_units'] if r['source_instance_id'] == source]
    self.assertTrue(rows)
    for r in rows:
     self.assertEqual(r.get('payment_time'), 0, card)
     self.assertIs(type(r['payment_time']), int)
    self.assertFalse(proof['complete_legal_set_proven'])
    if card in paid.DESCRIPTORS:
     for value in (1, False, None):
      bad = copy.deepcopy(inv)
      for r in bad['enumeration_units']:
       if r['source_instance_id'] == source:
        if value is None: r.pop('base_time_cost')
        else: r['base_time_cost'] = value
      self.assertTrue(board.audit_normal(e, bad)['errors'], (card, value))
  self.run_scoped(run)

 def test_comparison_joins_board_proof_and_rejects_balanced_tampering(self):
  # Supply a comparison projection only to exercise the operand auditor.
  # The actual legacy selector may use fallback with no comparison at all.
  def run():
   for card, e, events, source in fixtures():
    inv = candidates.audit(e, events); g=e['legacy_continuation']['game_state']
    time=g['players'][g['turn_player']]['time']
    d=dict(context=dict(decision_kind='normal_action'),inventory=inv,
     problem=dict(legal_candidate_ids=inv['legal_candidate_ids'],candidates=[
      dict(candidate_id=r['candidate_id'],card_copy_id=g['cards'][r['source_instance_id']]['card_copy_id'] if r.get('source_instance_id') is not None else '',payment_time=0,time_after_certain_resolution=time)
      for r in inv['legal_candidate_details']]))
    # Other hand/core costs keep their independently derived actual values.
    for proof in (operands.core.audit_normal(e,inv), operands.hand.audit_normal(e,events,inv)):
     costs={r['enumeration_unit_id']:0 if r.get('action_type') in ('pass','challenge') else r['payment_time'] for r in proof['verified_units']}
     for row,unit in zip(d['problem']['candidates'],inv['legal_candidate_details']):
      if unit['enumeration_unit_id'] in costs:
       row['payment_time']=costs[unit['enumeration_unit_id']];row['time_after_certain_resolution']=time-row['payment_time']
    proof=operands.audit_normal(e,events,d)
    self.assertEqual(proof['errors'],[])
    ids={r['candidate_id'] for r in inv['legal_candidate_details'] if r['source_instance_id']==source}
    self.assertTrue(ids)
    self.assertTrue(ids <= {r['candidate_id'] for r in proof['verified_candidates']},proof)
    self.assertFalse(proof['operand_provenance_verified']);self.assertIsNone(proof['balance_admitted'])
    for candidate_id in ids:
     bad=copy.deepcopy(d);row=next(r for r in bad['problem']['candidates'] if r['candidate_id']==candidate_id)
     row['payment_time']+=1;row['time_after_certain_resolution']-=1
     self.assertTrue(operands.audit_normal(e,events,bad)['errors'])
    with patch.dict(board.SOURCES,{'132-board-active-restart.md':'0'*64}):
     self.assertTrue(operands.audit_normal(e,events,d)['errors'])
    d['problem']=None
    self.assertFalse(operands.audit_normal(e,events,d)['supported_payment_operands_verified'])
  self.run_scoped(run)

if __name__=='__main__': unittest.main()
