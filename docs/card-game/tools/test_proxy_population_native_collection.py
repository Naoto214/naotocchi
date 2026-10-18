"""Current public native-source coverage, including early negative conditions."""
import copy,unittest
from unittest.mock import patch
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as predicates
import proxy_population_challenge_window as connected
import proxy_population_runtime as runtime
import proxy_population_start_obligations as sources
from test_proxy_population_relationship_predicates import relationship
from test_proxy_population_runtime import initial

class CollectionTests(unittest.TestCase):
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback(*relationship()))
 def test_negative_relationship_gets_fresh_semantic_audit(self):
  def run(e,h,o):
   h[0]['action_type']='relationship_progress'
   proof=existing.ExistingAdapter(h).collect(e,3)
   row=next(r for r in proof['classifications'] if r['source_instance_id']==o['source_instance_id'])
   self.assertFalse(row['condition_met'])
   self.assertIn('proof',row,'early negative relationship bypasses semantic audit')
   self.assertTrue(row['proof']['current_predicate_audit']['current_trigger_predicates_verified'])
   self.assertFalse(proof['opportunity_completeness_proven'])
   return {}
  self.run_case(run)
 def test_source_omission_and_duplicate_are_rejected_at_collect(self):
  native=existing.ExistingAdapter.collect
  for mutation in ('omit','duplicate','outside'):
   def corrupt(adapter,e,origin=None):
    result=native(adapter,e,origin);source=next(r for r in result['classifications'] if e['legacy_continuation']['game_state']['cards'][r['source_instance_id']]['card_id']=='P-cat_ceo')
    if mutation=='omit':result['classifications'].remove(source)
    elif mutation=='duplicate':result['classifications'].append(copy.deepcopy(source))
    else:
     result['classifications'].remove(source);result['unproved_sources'].append(dict(source_instance_id=source['source_instance_id'],card_id='P-cat_ceo',reason='outside_existing_trigger_adapter_scope'))
    return result
   with self.subTest(mutation=mutation),patch.object(existing.ExistingAdapter,'collect',corrupt):
    with self.assertRaisesRegex(ValueError,'collection'):self.run_case(lambda e,h,o:existing.ExistingAdapter(h).collect(e,3))
 def test_early_negative_cannot_suppress_a_met_forced_obligation(self):
  native=existing.ExistingAdapter.collect
  def corrupt(adapter,e,origin=None):
   result=native(adapter,e,origin)
   source=next(r for r in result['classifications'] if e['legacy_continuation']['game_state']['cards'][r['source_instance_id']]['card_id']=='P-cat_ceo')
   source.clear();source.update(source_instance_id=e['legacy_continuation']['game_state']['players']['A']['board']['partner'],condition_met=False)
   result['occurrences']=[r for r in result['occurrences'] if r['category']!='forced']
   return result
  with patch.object(existing.ExistingAdapter,'collect',corrupt):
   with self.assertRaisesRegex(ValueError,'collection'):self.run_case(lambda e,h,o:existing.ExistingAdapter(h).collect(e,3))

 def test_projection_cannot_rebind_occurrence_to_another_supplied_event(self):
  native=existing.ExistingAdapter.collect
  def corrupt(adapter,e,origin=None):
   result=native(adapter,e,origin)
   for row in result['occurrences']:
    if row['category']=='forced':row['origin_event_seq']=2
   return result
  def run(e,h,o):
   h.insert(0,dict(seq=2,actor='A',action_type='relationship_progress'))
   return existing.ExistingAdapter(h).collect(e,3)
  with patch.object(existing.ExistingAdapter,'collect',corrupt):
   with self.assertRaisesRegex(ValueError,'collection'):self.run_case(run)
 def test_collection_wrapper_restores_after_failure(self):
  original=existing.ExistingAdapter.collect
  with self.assertRaisesRegex(RuntimeError,'injected'):
   with connected.contract_scope():
    self.assertIsNot(existing.ExistingAdapter.collect,original)
    raise RuntimeError('injected')
  self.assertIs(existing.ExistingAdapter.collect,original)

 def test_city_collection_retains_second_play_origin_after_earlier_scan_anchor(self):
  from test_proxy_population_city_predicates import fixture
  def run(forced):
   e,h,o=fixture(True)
   result=existing.ExistingAdapter(h).collect(e,4)
   self.assertEqual([r['origin_event_seq'] for r in result['occurrences']],[5])
   self.assertTrue(result['current_collection_audit']['current_source_collection_bound'])
   self.assertFalse(result['current_collection_audit']['all_rule_opportunities_proven'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
 def test_projection_and_current_proof_mutations_fail_closed(self):
  native=existing.ExistingAdapter.collect
  for mode in ('missing','duplicate','actor','category','condition','proof'):
   def corrupt(adapter,e,origin=None):
    r=native(adapter,e,origin);o=next(x for x in r['occurrences'] if x['category']=='forced')
    if mode=='missing':r['occurrences'].remove(o)
    elif mode=='duplicate':r['occurrences'].append(copy.deepcopy(o))
    elif mode=='actor':o['actor']='B'
    elif mode=='category':o['category']='optional'
    else:
     row=next(x for x in r['classifications'] if x['source_instance_id']==o['source_instance_id'])
     if mode=='condition':row['condition_met']=1
     else:row['proof']['current_predicate_audit']['current_envelope_sha256']='0'*64
    return r
   with self.subTest(mode=mode),patch.object(existing.ExistingAdapter,'collect',corrupt):
    with self.assertRaisesRegex(ValueError,'collection'):self.run_case(lambda e,h,o:existing.ExistingAdapter(h).collect(e,3))

if __name__=='__main__':unittest.main()
