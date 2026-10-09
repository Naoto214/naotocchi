"""119 supplied comparison premises, never proof of a future resolution."""
import copy, unittest
from unittest.mock import patch
from test_proxy_population_activation_legality import fixture
from test_proxy_population_information_use import execute,window,runtime,initial
import proxy_population_response_predicates as predicates
from proxy_mandatory_policy_contract import canonical
try:import proxy_population_response_operands as api
except ImportError:api=None


def supplied(stage=0,growth=20):
 e,a,s=fixture('E-first-date',stage);e=runtime.engine.payments.upgrade(e)
 g=e['legacy_continuation']['game_state'];p=g['players'][a]
 p['discard'] += [x for x in p['hand'] if x!=s];p['hand']=[s];p['growth']=growth
 e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3
 return e,[dict(seq=1,actor=a,action_type='turn_start_and_egg_draw')]


class ResponseOperandTests(unittest.TestCase):
 def run_scoped(self,body):
  with window.contract_scope():runtime.operation(initial(),body)

 def test_hand_predicate_rejects_forged_resolution_premises(self):
  def run(forced):
   e,h=supplied();d=execute(e,h,forced)['decision'];inv=d['candidate_set_evidence']
   self.assertTrue(predicates.audit(e,h,inv)['response_hand_predicates_verified'])
   for mode in ('stage','growth','bool','absent','extra'):
    bad=copy.deepcopy(inv);row=next(r for r in bad['legal_candidate_details'] if r['card_id']=='E-first-date');p=row['resolution_condition_evidence']
    if mode=='stage':p['partner_stage']=1
    elif mode=='growth':p['growth']=96
    elif mode=='bool':p['legacy_five_growth_premises']=1
    elif mode=='absent':row.pop('resolution_condition_evidence')
    else:p['invented']=True
    with self.subTest(mode=mode):self.assertFalse(predicates.audit(e,h,bad)['response_hand_predicates_verified'])
   return {}
  self.run_scoped(run)

 def test_actual_boundary_comparison_and_unproved_routes_remain_separate(self):
  self.assertIsNotNone(api)
  def run(forced):
   for stage,growth in ((0,20),(0,95),(0,96),(0,100),(1,20),('married',20)):
    e,h=supplied(stage,growth);original=canonical(e);step=execute(e,h,forced);d=step['decision'];p=api.audit(e,h,d)
    expected=stage==0 and growth<=95
    with self.subTest(stage=stage,growth=growth):
     self.assertEqual(p['errors'],[]);self.assertTrue(p['supplied_resolution_premises_verified'])
     self.assertEqual(p['existing_comparison_operands_verified'],expected)
     self.assertEqual(step['response_comparison_operands'],p)
     self.assertFalse(p['future_resolution_proven']);self.assertFalse(p['operand_provenance_verified'])
     self.assertIsNone(p['policy_eligible']);self.assertIsNone(p['balance_admitted'])
     self.assertEqual(canonical(e),original)
     if expected:self.assertEqual(p['comparison_values'],{r['candidate_id']:0 if r['action_type']=='response_pass' else 5 for r in d['legal_candidate_details']})
     else:self.assertEqual(p['comparison_values'],{});self.assertEqual(d['resolution_mode'],'response_seeded_fallback')
   return {}
  self.run_scoped(run)

 def test_comparison_tampering_is_rejected_without_inventing_values(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,h=supplied();d=execute(e,h,forced)['decision']
   for mode in ('selected','runner','bool','criterion','later','premises','actor'):
    bad=copy.deepcopy(d)
    if mode=='selected':bad['comparison_evidence']['selected_value']=6
    elif mode=='runner':bad['comparison_evidence']['runner_up_value']=1
    elif mode=='bool':bad['comparison_evidence']['runner_up_value']=False
    elif mode=='criterion':bad['comparison_evidence']['criterion']='invented'
    elif mode=='later':bad['comparison_evidence']['later_criteria_inspected']=['invented']
    elif mode=='actor':bad['actor']='B'
    else:
     for rows in (bad['legal_candidate_details'],bad['candidate_set_evidence']['legal_candidate_details']):
      next(r for r in rows if r['card_id']=='E-first-date')['resolution_condition_evidence']['growth']=19
     bad['selected_action']['resolution_condition_evidence']['growth']=19
    with self.subTest(mode=mode):self.assertFalse(api.audit(e,h,bad)['existing_comparison_operands_verified'])
   with patch.dict(predicates.hand.SOURCES,{'91-event-21-card-text-draft.md':'0'*64}):self.assertTrue(api.audit(e,h,d)['errors'])
   return {}
  self.run_scoped(run)

 def test_unique_and_mixed_candidates_never_gain_comparison_values(self):
  self.assertIsNotNone(api)
  def run(forced):
   for mode in ('pass_only','unknown_operand','opponent_turn'):
    e,h=supplied();g=e['legacy_continuation']['game_state'];p=g['players']['A']
    if mode=='pass_only':p['discard'].extend(p['hand']);p['hand']=[]
    elif mode=='unknown_operand':
     source=next(s for s in p['discard'] if g['cards'][s]['card_id']=='I-c_coin2');p['discard'].remove(source);p['hand'].append(source)
    else:g['turn_player']='B';e['legacy_continuation']['response_context']['turn_player']='B';h[0]['actor']='B'
    step=execute(e,h,forced);d=step['decision'];proof=api.audit(e,h,d)
    with self.subTest(mode=mode):
     self.assertEqual(proof['errors'],[]);self.assertEqual(step['response_comparison_operands'],proof)
     self.assertFalse(proof['operand_provenance_verified']);self.assertIsNone(proof['balance_admitted'])
     if mode=='opponent_turn':self.assertTrue(proof['existing_comparison_operands_verified'])
     else:
      self.assertFalse(proof['existing_comparison_operands_verified']);self.assertEqual(proof['comparison_values'],{})
      self.assertEqual(d['resolution_mode'],'response_unique' if mode=='pass_only' else 'response_seeded_fallback')
   return {}
  self.run_scoped(run)

 def test_stale_uncovered_source_never_certifies_an_old_comparison(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,h=supplied();d=execute(e,h,forced)['decision']
   for mode in ('discard','other_owner','renamed_source'):
    bad=copy.deepcopy(e);g=bad['legacy_continuation']['game_state'];p=g['players']['A'];source=p['hand'].pop();p['growth']=96
    if mode=='discard':p['discard'].append(source)
    elif mode=='other_owner':p['discard'].append(source);bad['legacy_continuation']['response_context']['priority_actor']='B'
    else:p['hand'].append(source);g['cards'][source]['card_id']='C-box'
    proof=api.audit(bad,h,d)
    with self.subTest(mode=mode):
     self.assertFalse(proof['supplied_resolution_premises_verified'],proof)
     self.assertFalse(proof['existing_comparison_operands_verified'],proof)
     self.assertTrue(proof['errors']);self.assertEqual(proof['comparison_values'],{})
   return {}
  self.run_scoped(run)

 def test_actual_entry_rejects_coherent_forged_record(self):
  self.assertIsNotNone(api);prior=runtime._step
  def altered(*args,**kwargs):
   r=prior(*args,**kwargs);d=r['decision'];d['comparison_evidence']['selected_value']=6;return r
  def run(forced):
   e,h=supplied()
   with self.assertRaisesRegex(ValueError,'response comparison operands differ'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',altered),window.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
