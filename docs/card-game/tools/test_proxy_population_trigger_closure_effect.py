import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
import proxy_continuation_payments as payments
try:import proxy_population_trigger_closure_effect as api
except ImportError:api=None

def actual(mode):
 e,journal,proof=both()
 if mode=='ineligible':
  only=[o for o in proof['occurrences'] if o['ability_key']=='own_start_hand_at_most_two_draw'];journal=ledger.observe(ledger.create('A'),only,'empty');p=e['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
  return sequential.step(e,initial(),journal,sequential.StartAdapter())
 # Synthetic unit addresses only; no production input/seed generation.
 for index in range(16):
  supplied=initial();supplied['order_id']='unit-trigger-close-'+str(index)
  record=sequential.step(e,supplied,journal,sequential.StartAdapter())
  if record['chosen']['action']=='decline_group':return record
 raise AssertionError('unit cases did not exercise existing decline branch')

class TriggerClosureEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'trigger closure full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_decline_and_ineligible_close_keep_game_context_and_runtime(self):
  def run():
   for mode in ('decline','ineligible'):
    record=actual(mode);proof=api.audit(record['before_envelope'],record['after_envelope'],record['events'][0],record)
    self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_trigger_closure_verified']);self.assertFalse(proof['occurrence_adjudication_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_ineligible_current_group_preserves_a_later_supplied_group(self):
  def run():
   r=actual('ineligible');b=r['before_envelope'];prior=r['before_ledger'];row=copy.deepcopy(next(iter(prior['occurrences'].values()))['occurrence']);row['actor']='B';row['source_instance_id']=next(s for s,v in b['legacy_continuation']['game_state']['cards'].items() if s.startswith('B-') and v['card_id']=='I-bowtie')
   # A later supplied occurrence is a structural fixture, not origin evidence.
   prior=ledger.observe(prior,[row],'empty');record=sequential.step(b,initial(),prior,sequential.StartAdapter());self.assertEqual(record['chosen']['action'],'close_ineligible');self.assertEqual(ledger.offer(record['after_ledger'])['actor'],'B')
   proof=api.audit(b,record['after_envelope'],record['events'][0],record);self.assertEqual(proof['errors'],[]);return {}
  self.run_case(run)
 def test_decline_cannot_skip_closed_current_group_to_later_actor(self):
  from proxy_mandatory_policy_contract import canonical
  def run():
   r=actual('ineligible');b=r['before_envelope'];prior=r['before_ledger'];row=copy.deepcopy(next(iter(prior['occurrences'].values()))['occurrence']);row['actor']='B';row['source_instance_id']=next(s for s,v in b['legacy_continuation']['game_state']['cards'].items() if s.startswith('B-') and v['card_id']=='I-bowtie')
   prior=ledger.observe(prior,[row],'empty');r=sequential.step(b,initial(),prior,sequential.StartAdapter());effective=r['inventory']['effective_ledger'];offered=ledger.offer(effective);chosen=offered['actions'][offered['decline_candidate_id']];encoded=canonical(chosen).decode()
   r['chosen']=chosen;r['inventory']['legal_candidate_details']=[chosen];r['inventory']['legal_candidate_ids']=[encoded];r['decision']=dict(selected_candidate=encoded,selected_action=dict(candidate_id=encoded,option=chosen));r['after_ledger']=ledger.consume(effective,offered['decline_candidate_id']);r['events'][0]['action_type']='decline_trigger_group';r['events'][0]['occurrence_ids']=chosen['occurrence_ids']
   self.assertTrue(api.audit(b,r['after_envelope'],r['events'][0],r)['errors']);return {}
  self.run_case(run)
 def test_extra_draw_pass_reset_and_occurrence_rebinding_refused(self):
  def run():
   for mode in ('decline','ineligible'):
    record=actual(mode);b=record['before_envelope'];a=record['after_envelope'];event=record['events'][0]
    for mutation in ('draw','growth','pass','pending','usage','ids','actor','chosen','missing','ambiguous','ledger','decision'):
     bad=copy.deepcopy(a);ev=copy.deepcopy(event);r=copy.deepcopy(record);p=bad['legacy_continuation']['game_state']['players'][ev['actor']]
     if mutation=='draw':p['hand'].append(p['deck'].pop(0))
     elif mutation=='growth':p['growth']+=5
     elif mutation=='pass':bad['legacy_continuation']['response_context']['consecutive_passes']=1
     elif mutation=='pending':bad['legacy_continuation']['pending_triggers']=['invented']
     elif mutation=='usage':bad['runtime']['ability_uses'].append({'invented':True})
     elif mutation=='ids':ev['occurrence_ids']=['invented']
     elif mutation=='actor':ev['actor']='B' if ev['actor']=='A' else 'A'
     elif mutation=='chosen':r['chosen']['action']='activate'
     elif mutation=='missing':r=None
     elif mutation=='ambiguous':ev['occurrence_ids']*=2
     elif mutation=='ledger':r['after_ledger']['occurrences'].clear()
     else:
      if mode=='ineligible':continue
      r['decision']['selected_action']['option']={'action':'activate'}
     with self.subTest(mode=mode,mutation=mutation):self.assertTrue(api.audit(b,bad,ev,r)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_added_growth_even_when_record_and_hashes_agree(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   r=actual('decline');b=r['before_envelope'];a=copy.deepcopy(r['after_envelope']);event=r['events'][0];a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],occurrence_ids=event['occurrence_ids']);r['after_envelope']=a;r['events']=[ev]
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)],trigger_records=[r]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('trigger closure full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
