"""Supplied occurrence closure must agree with the executed step, not just IDs."""
import copy
import unittest
import proxy_population_opportunity_ledger as ledger
import proxy_population_opportunity_order as order
import proxy_population_trigger_coverage as coverage
import proxy_population_trigger_sequential as sequential
from test_proxy_population_opportunity_ledger import occurrence
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
import proxy_population_trigger_window as window
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers


def conditional_trace():
 e,_,proof=both()
 def prepare(forced):
  for p in e['legacy_continuation']['game_state']['players'].values():p['time']=0
  proof['current_envelope_sha256']=state.canonical_sha256(e)
  c=state.current(e)
  return dict(seq=e['event_seq'],actor='A',action_type='egg_exchange_bottom',game_state_after_sha256=triggers.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=triggers.old.start._hash(c))
 event=runtime.operation(initial(),prepare)
 result=window.segment(e,initial(),[event],[triggers.old._snapshot(state.current(e))],[e],3,proof)
 return result,proof['occurrences']


def alternate(journal):
 rows=[v['occurrence'] for v in journal['occurrences'].values()]
 result=ledger.observe(ledger.create(journal['turn_player']),rows,'empty')
 while ledger.offer(result):
  group=ledger.offer(result)
  selected=next(k for k,v in group['actions'].items() if v['action']=='activate')
  result=ledger.consume(result,selected)
 if result['occurrences']==journal['occurrences']:
  result=ledger.observe(ledger.create(journal['turn_player']),rows,'empty')
  while ledger.offer(result):result=ledger.consume(result,ledger.offer(result)['decline_candidate_id'])
 return result

class ClosureBindingTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.result,cls.rows=conditional_trace()
 def test_live_conditional_trace_binds_closure(self):
  check=order.audit(self.result,self.rows)
  self.assertTrue(check['phase_order_verified'])
  self.assertFalse(check['all_rule_opportunities_proven'])
 def test_individually_valid_active_ledger_cannot_replace_executed_status(self):
  bad=copy.deepcopy(self.result);bad['trigger_ledger']=alternate(bad['trigger_ledger'])
  sequential.audit_ledger(bad['trigger_ledger'])
  self.assertTrue(coverage.reconcile(self.rows,[bad['trigger_ledger']])['covered'])
  with self.assertRaisesRegex(ValueError,'ledger.*execution'):order.audit(bad,self.rows)
 def test_missing_final_ledger_is_not_silently_accepted(self):
  bad=copy.deepcopy(self.result);del bad['trigger_ledger']
  with self.assertRaises((ValueError,KeyError)):order.audit(bad,self.rows)
 def test_duplicate_source_obligation_is_not_collapsed_in_coverage(self):
  row=occurrence('A-001#1','A','optional');j=ledger.observe(ledger.create('A'),[row],'empty')
  with self.assertRaisesRegex(ValueError,'duplicate'):coverage.reconcile([row,row],[j])
 def test_duplicate_source_obligation_is_not_collapsed_in_order(self):
  with self.assertRaisesRegex(ValueError,'duplicate'):order.audit(self.result,self.rows+[self.rows[0]])
 def test_valid_but_different_archive_closure_is_rejected(self):
  r=copy.deepcopy(self.result);e=r['final_envelope'];e['legacy_continuation']['game_state']['phase']='completed'
  r['steps'][-1]['final_envelope']=copy.deepcopy(e);r['steps'][-1]['envelopes'][-1]=copy.deepcopy(e)
  # Conditional terminal slice: no claim that this is a real terminal effect.
  r['completed']=True
  r['closed_turn_trigger_ledgers']=[sequential.close_turn(r['trigger_ledger'],e)]
  self.assertTrue(order.audit(r,self.rows)['phase_order_verified'])
  j=alternate(r['trigger_ledger']);r['closed_turn_trigger_ledgers']=[sequential.close_turn(j,e)]
  r['trigger_ledger']=j
  with self.assertRaisesRegex(ValueError,'ledger.*execution'):order.audit(r,self.rows)

 def test_turn_change_requires_exact_archive_and_rejects_status_substitution(self):
  r=copy.deepcopy(self.result);before=r['final_envelope']
  before['legacy_continuation']['game_state']['phase']='turn_end'
  r['steps'][-1]['final_envelope']=copy.deepcopy(before);r['steps'][-1]['envelopes'][-1]=copy.deepcopy(before)
  archive=sequential.close_turn(r['trigger_ledger'],before)
  after=copy.deepcopy(before);after['event_seq']+=1
  after['legacy_continuation']['game_state'].update(turn_player='B',phase='turn_start')
  r['steps'].append(dict(source_envelope=before,final_envelope=after,events=[dict(seq=after['event_seq'])],envelopes=[after],decision=None,forced_record={}))
  r.update(final_envelope=after,completed=False,closed_turn_trigger_ledgers=[archive],trigger_ledger=ledger.observe(ledger.create('B'),[],'empty'))
  self.assertTrue(order.audit(r,self.rows)['phase_order_verified'])
  altered=copy.deepcopy(r);altered['closed_turn_trigger_ledgers']=[sequential.close_turn(alternate(archive['ledger']),before)]
  with self.assertRaisesRegex(ValueError,'ledger.*execution'):order.audit(altered,self.rows)
  r['closed_turn_trigger_ledgers']=[]
  with self.assertRaisesRegex(ValueError,'archive'):order.audit(r,self.rows)
 def test_terminal_trace_requires_final_archive(self):
  r=copy.deepcopy(self.result);e=r['final_envelope'];e['legacy_continuation']['game_state']['phase']='completed'
  r['steps'][-1]['final_envelope']=copy.deepcopy(e);r['steps'][-1]['envelopes'][-1]=copy.deepcopy(e)
  r['completed']=True;r['closed_turn_trigger_ledgers']=[]
  with self.assertRaisesRegex(ValueError,'archive'):order.audit(r,self.rows)

if __name__=='__main__':unittest.main()
