import copy,gzip,json,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_rules as rules
from proxy_resource_value_comparison import validate_problem
try:import proxy_continuation_batch as batch
except ImportError:batch=None

class BatchTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.r=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results']
 def setUp(self):self.assertIsNotNone(batch);self.e=copy.deepcopy(self.r[5]['final_envelope'])
 def action(self,kind):return next(a for a in candidates.audit(self.e,[])['legal_candidate_details'] if a['action_type']==kind)
 def test_current_four_main_gaps_are_classified_without_faking_passive(self):
  for c in ('M-antlion-03','M-antlion-04','M-antlion-05','M-antlion-07'):
   self.assertEqual(batch.classification(c)['kind'],'triggered')
  self.assertEqual(batch.classification('M-antlion-04')['timing'],'main_arrival')
 def test_whole_source_section_mutation_fails(self):
  real=rules.source_section
  with patch.object(rules,'source_section',side_effect=lambda r:(real(r)[0]+'\n> 自分のそだち+5。\n',real(r)[1])):
   with self.assertRaises(ValueError):batch.classification('M-antlion-03')
 def test_relationship_payment_flag_and_response_are_atomic(self):
  with batch.scope():
   a=self.action('relationship');before=copy.deepcopy(self.e);p=batch.outcome(self.e,a)
   after,events=batch.transition(self.e,a)
  b=after['legacy_continuation']['game_state']['players']['B']
  self.assertEqual((b['time'],b['board']['partner_stage'],b['relationship_progressed']),(0,1,True))
  self.assertEqual(b['board']['main'],before['legacy_continuation']['game_state']['players']['B']['board']['main'])
  self.assertEqual(p['certain_growth_difference'],0);self.assertEqual(len(events),1)
  self.assertEqual(events[0]['envelope_before_sha256'],state.state_hash(before));self.assertEqual(self.e,before)
 def test_noncanonical_action_and_payment_are_rejected(self):
  with batch.scope():
   a=self.action('relationship');a['evidence']['payment_time']=0
   with self.assertRaises(ValueError):batch.transition(self.e,a)
 def test_relationship_full_inventory_preserved_in_scores(self):
  with batch.scope():
   inv=candidates.audit(self.e,[]);original=copy.deepcopy(inv);scores,_=candidates._scores(self.e,inv)
  self.assertEqual([s['candidate_id'] for s in scores],inv['legal_candidate_ids']);self.assertEqual(inv,original)
 def test_relationship_problem_uses_public_partner_identity(self):
  with batch.scope():
   inv=candidates.audit(self.e,[]);g=self.e['legacy_continuation']['game_state']
   ctx=dict(actor=g['turn_player'],round=g['round'])
   problem=candidates.problem(self.e,inv,ctx)
  self.assertEqual(validate_problem(problem),[])
 def test_scope_restores_after_error(self):
  original=candidates._scores;registry=copy.deepcopy(rules.CAPABILITIES)
  with self.assertRaises(RuntimeError):
   with batch.scope():raise RuntimeError('probe')
  self.assertIs(candidates._scores,original);self.assertEqual(rules.CAPABILITIES,registry)

if __name__=='__main__':unittest.main()

class BatchWorldAndResponseTests(BatchTests):
 def test_first_city_placement_has_no_second_card_trigger(self):
  self.e=copy.deepcopy(self.r[1]['final_envelope'])
  history=self.r[1]['events']
  with batch.scope():
   a=self.action('place_world');after,events=batch.transition(self.e,a,history)
   self.assertEqual(after['legacy_continuation']['game_state']['players']['A']['board']['world'],a['source_instance_id'])
   raw={k:v for k,v in events[0].items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}
   c=state.current(after);reason=batch.response_capability(c,history+[raw],a['source_instance_id'],'world')
  self.assertEqual(reason['reason_code'],'trigger_condition_not_met')
 def test_unknown_board_capability_cannot_be_excluded(self):
  with batch.scope(),self.assertRaises(ValueError):batch.response_capability(state.current(self.e),self.r[5]['events'],'B-001#1','main')

class DeclarationIdentityTests(unittest.TestCase):
 def test_declared_variants_do_not_share_an_id(self):
  self.assertTrue(hasattr(batch,'qualify_ids'))
  r=BatchTests.r[0] if hasattr(BatchTests,'r') else json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][0]
  e=copy.deepcopy(r['final_envelope']);g=e['legacy_continuation']['game_state'];p=g['players']['A']
  source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='G-hit-blow');p['deck'].remove(source);p['hand'].append(source)
  with batch.scope():inv=candidates.audit(e,[])
  ds=[a for a in inv['legal_candidate_details'] if a['card_id']=='G-hit-blow']
  self.assertEqual(len(ds),7);self.assertEqual(len({a['candidate_id'] for a in ds}),7)

class TargetInventoryTests(unittest.TestCase):
 def test_targeted_normal_rows_use_public_opponent_equipment(self):
  import proxy_continuation_payments as payments
  e=copy.deepcopy(json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][5]['final_envelope'])
  template=next(a for r in rules.table()['cards'] if r['card_id']=='G-archery-3d' for a in r['actions'] if a['action_type']=='use_play')
  row=dict(enumeration_unit_id='old-own-target',source_family='hand_card_action',source_zone='hand',source_id='source',source_instance_id='source',card_id='G-archery-3d',action_type='use_play',candidate_variant=template['candidate_variants'][0],target_instance_ids=['own-equipment'],reason_codes=[],disposition='admitted',candidate_id='old-id',evidence={},source_references=[template['source_text_reference']])
  e['legacy_continuation']['game_state']['players']['B']['board']['world']='public-world'
  e['legacy_continuation']['game_state']['players']['B']['time']=3
  with patch.object(payments,'equipment_targets',return_value=['opponent-equipment-1','opponent-equipment-2']):
   rows=batch.qualify_ids(e,[row],[])
  self.assertEqual([r['target_instance_ids'] for r in rows],[['opponent-equipment-1'],['opponent-equipment-2']])
  self.assertEqual(len({r['enumeration_unit_id'] for r in rows}),2)
  self.assertEqual(len({r['candidate_id'] for r in rows}),2)
 def test_transition_threads_verified_public_history_to_outcome(self):
  e=object();action=object();history=[dict(seq=1)]
  with patch.object(batch,'outcome',side_effect=RuntimeError('probe')) as outcome:
   with self.assertRaises(RuntimeError):batch.transition(e,action,history)
  outcome.assert_called_once_with(e,action,history)

class UpperPriorityPairTests(BatchTests):
 def test_growth_frontier_limits_pair_inventory(self):
  p=self.e['legacy_continuation']['game_state']['players']['B'];p['board']['partner_stage']=3
  with batch.scope():
   inv=candidates.audit(self.e,[]);g=self.e['legacy_continuation']['game_state'];problem=candidates.problem(self.e,inv,dict(actor='B',round=g['round']))
  self.assertEqual(validate_problem(problem),[])
  self.assertEqual(problem['pairs'],[])

class BoardCountInventoryTests(BatchTests):
 def test_board_count_predicate_admits_the_registered_variant(self):
  import proxy_continuation_payments as payments
  from unittest.mock import patch
  g=self.e['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor];p['time']=3
  template=next(a for r in rules.table()['cards'] if r['card_id']=='G-area-claim' for a in r['actions'])
  unit=dict(source_family='hand_card_action',source_zone='hand',source_id='source',source_instance_id='source',card_id='G-area-claim',action_type='use_play',candidate_variant='seven_or_eight_cards',target_instance_ids=[],enumeration_unit_id='registered-count',template=template)
  with payments.scope(),batch.scope(),patch.object(payments,'board_count',return_value=7):
   rows=batch.adjudicate_source_unit(self.e,unit)
  self.assertEqual(rows[0]['disposition'],'admitted');self.assertEqual(rows[0]['candidate_id'],'candidate-use_play-source-seven_or_eight_cards')
