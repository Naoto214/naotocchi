"""Bind response suppression to actual decline/ineligible group records."""
import copy,unittest
from test_proxy_population_trigger_closure_effect import actual
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as window
import proxy_continuation_quick as quick
try:import proxy_population_response_group_closure as api
except ImportError:api=None

def fixture(mode):
 if mode=='end':
  from test_proxy_population_board_group_effect import actual as board_actual
  from unittest.mock import patch
  from proxy_mandatory_policy_contract import canonical
  import proxy_population_trigger_sequential as sequential
  import proxy_population_trigger_existing as existing
  b,_,_,prior,h=board_actual('W-countryside')
  def decline(_initial,_current,_actor,options,*address):
   option=next(r for r in options if r['action']=='decline_group');key=canonical(option).decode()
   return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)
  with patch.object(sequential.choices,'resolve',side_effect=decline):r=sequential.step(b,initial(),prior['before_ledger'],existing.ExistingAdapter(h))
  e=r['after_envelope'];h=h+[r['events'][0]]
  with window.closed_native(r['after_ledger'],e['event_seq']):inv=quick.actions.response_inventory(e,initial(),h)
 else:
  r=actual(mode);b=r['before_envelope'];e=r['after_envelope'];h=[origin(b,'egg_exchange_bottom','A'),r['events'][0]]
  with window.closed_start():inv=quick.actions.response_inventory(e,initial(),h)
 wanted=[r['after_ledger']['occurrences'][k]['occurrence']['source_instance_id'] for k in r['events'][0]['occurrence_ids']]
 return e,h,inv,r['after_ledger'],[r],[b,e],wanted

class ResponseGroupClosureTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'response group receipt binding absent')
 def run_case(self,callback):
  with connected.contract_scope():runtime.operation(initial(),lambda forced:callback())
 def test_real_decline_and_ineligible_records_close_only_supplied_current_sources(self):
  def run():
   for mode in ('decline','ineligible','end'):
    args=fixture(mode);p=api.audit(*args);self.assertEqual(p['errors'],[],mode);self.assertEqual(p['verified_source_ids'],sorted(args[-1]));self.assertTrue(p['response_group_closure_verified']);self.assertFalse(p['occurrence_origin_authenticated']);self.assertFalse(p['all_rule_opportunities_proven'])
   return {}
  self.run_case(run)
 def test_missing_receipt_event_trace_or_inventory_binding_cannot_prove_closure(self):
  def run():
   args=fixture('decline')
   for mode in ('record','history','duplicate_event','trace','ledger','reoffer','record_inventory','foreign'):
    bad=copy.deepcopy(args);e,h,inv,j,records,trace,wanted=bad
    if mode=='record':records.clear()
    elif mode=='history':h.pop()
    elif mode=='duplicate_event':h.append(copy.deepcopy(h[-1]))
    elif mode=='trace':trace[0]['legacy_continuation']['game_state']['players']['A']['time']+=1
    elif mode=='ledger':j['occurrences'].clear()
    elif mode=='reoffer':inv['legal_candidate_details'].append(dict(source_instance_id=wanted[0],action_type='activate_board_ability'))
    elif mode=='record_inventory':records[0]['inventory']['occurrence_proofs']=[]
    else:wanted.append('foreign')
    with self.subTest(mode=mode):self.assertTrue(api.audit(*bad)['errors'])
   return {}
  self.run_case(run)
 def test_different_origin_or_unclosed_occurrence_stays_unproved(self):
  def run():
   for mode in ('origin','pending'):
    args=list(copy.deepcopy(fixture('decline')));e,h,inv,j,records,trace,wanted=args
    if mode=='origin':
     e['legacy_continuation']['response_context']['origin_event_seq']=e['event_seq'];inv['response_context']=copy.deepcopy(e['legacy_continuation']['response_context']);trace[-1]=copy.deepcopy(e)
    else:args[3]=copy.deepcopy(records[0]['before_ledger'])
    out=api.audit(*args);self.assertEqual(out['errors'],[]);self.assertEqual(out['verified_source_ids'],[]);self.assertEqual(len(out['unproved_sources']),len(wanted))
   return {}
  self.run_case(run)
 def test_real_driver_attaches_fresh_closure_to_response_composition(self):
  from test_proxy_population_trigger_connection import both
  import proxy_continuation_state as state
  e,j,proof=both()
  for p in e['legacy_continuation']['game_state']['players'].values():p['time']=0
  proof['current_envelope_sha256']=state.canonical_sha256(e);h=[origin(e,'egg_exchange_bottom','A')]
  with connected.contract_scope():r=window.segment(e,initial(),h,[quick.old._snapshot(state.current(e))],[e],3,proof)
  self.assertIsNone(r['stop']);steps=[s for s in r['steps'] if s.get('decision',{}).get('decision_kind')=='response_action']
  self.assertTrue(steps);first=steps[0];self.assertTrue(first['response_group_closure']['verified_source_ids']);self.assertEqual(first['response_group_closure']['errors'],[])
  for source in first['response_group_closure']['verified_source_ids']:self.assertEqual(first['response_source_predicate_coverage']['source_audit_families'][source],'response_group_closure')
  import proxy_population_response_composition as composition
  e=first['source_envelope'];inv=first['decision']['candidate_set_evidence'];proofs={name:first[name] for name in composition.FAMILIES}
  for mode in ('failed','binding','duplicate','foreign'):
   bad=copy.deepcopy(first['response_group_closure'])
   if mode=='failed':bad['response_group_closure_verified']=False
   elif mode=='binding':bad['current_envelope_sha256']='0'*64
   elif mode=='duplicate':bad['verified_source_ids']*=2
   else:bad['verified_source_ids'].append('foreign')
   self.assertTrue(composition.audit(e,inv,proofs,bad)['errors'],mode)
if __name__=='__main__':unittest.main()
