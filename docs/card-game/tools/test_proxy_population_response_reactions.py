"""Reaction semantic corruption must fail even when candidate IDs agree."""
import copy,unittest
from unittest.mock import patch
import proxy_population_runtime as runtime
import proxy_population_response_predicates as api
import proxy_population_hand_timing as timing
import proxy_population_response_context as context
import proxy_continuation_payments as payments
from test_proxy_population_runtime import initial
from test_proxy_population_hand_timing import fixture

class ReactionPredicateTests(unittest.TestCase):
 def audit(self,e,inv):
  self.assertTrue(hasattr(api,'audit_reactions'),'reaction semantic audit missing')
  return api.audit_reactions(e,inv)

 def test_batting_current_power_boundary_and_corrupt_alternatives(self):
  def run(forced):
   with context.scope():p=fixture(inventory_only=True)
   e,inv,source=p['before'],p['inventory'],p['played'];g=e['legacy_continuation']['game_state']
   proof=self.audit(e,inv)
   self.assertTrue(proof['response_reaction_predicates_verified'],proof['errors'])
   self.assertIn(source,proof['verified_source_ids'])
   row=next(r for r in inv['legal_candidate_details'] if r.get('source_instance_id')==source)
   self.assertEqual(row['target_instance_ids'],[g['players']['B']['board']['main']])
   self.assertFalse(proof['complete_legal_set_proven']);self.assertFalse(proof['information_use_proven'])
   for field,value in [('target_instance_ids',[g['players']['A']['board']['main']]),('base_time_cost',9),('candidate_variant','wisdom'),('card_copy_id','wrong')]:
    bad=copy.deepcopy(inv);next(r for r in bad['legal_candidate_details'] if r.get('source_instance_id')==source)[field]=value
    self.assertFalse(self.audit(e,bad)['response_reaction_predicates_verified'],field)
   empty=copy.deepcopy(inv);empty['legal_candidate_details'].remove(row)
   self.assertFalse(self.audit(e,empty)['response_reaction_predicates_verified'])
   duplicate=copy.deepcopy(inv);duplicate['legal_candidate_details'].append(copy.deepcopy(row))
   self.assertFalse(self.audit(e,duplicate)['response_reaction_predicates_verified'])
   for mode in ('time','wisdom','other_declarer','resolved','departed','stronger'):
    changed=copy.deepcopy(e);cg=changed['legacy_continuation']['game_state'];battle=cg['challenge']
    if mode=='time':cg['players']['B']['time']=0
    elif mode=='wisdom':battle['parameter']='wisdom'
    elif mode=='other_declarer':battle['declaring_actor']='A'
    elif mode=='resolved':battle['status']='resolved'
    elif mode=='departed':
     main=cg['players']['A']['board']['main'];cg['players']['A']['board']['main']=None;cg['players']['A']['discard'].append(main)
    else:payments.add_stat_modifier(changed,'B',source,cg['players']['B']['board']['main'])
    self.assertTrue(self.audit(changed,empty)['response_reaction_predicates_verified'],mode)
    self.assertFalse(self.audit(changed,inv)['response_reaction_predicates_verified'],mode)
   return {}
  runtime.operation(initial(),run)

 def test_nested_prepared_projection_uses_actual_challenge_modifiers(self):
  def run(forced):
   with context.scope():p=fixture(mixed=True,inventory_only=True)
   proof=self.audit(p['before'],p['inventory'])
   self.assertTrue(proof['response_reaction_predicates_verified'],proof['errors'])
   self.assertIn(p['played'],proof['verified_source_ids']);return {}
  runtime.operation(initial(),run)

 def test_hand_optional_trigger_cannot_be_reoffered_as_ordinary_response(self):
  def run(forced):
   before,e,event,history,source=fixture();occurrence=timing.capture(before,e,event)['occurrences'][0]
   e['legacy_continuation']['response_context']['priority_actor']='A'
   import proxy_continuation_quick as quick
   with timing.scope():inv=quick.actions.response_inventory(e,initial(),history)
   proof=self.audit(e,inv)
   self.assertTrue(proof['response_reaction_predicates_verified'],proof['errors']);self.assertIn(source,proof['verified_source_ids'])
   rows,_=timing.current_actions(e,occurrence,history)
   self.assertEqual(len(rows),2)
   forged=copy.deepcopy(inv);forged['legal_candidate_details'].append(rows[0])
   self.assertFalse(self.audit(e,forged)['response_reaction_predicates_verified'])
   self.assertFalse(proof['optional_group_opportunities_proven']);return {}
  runtime.operation(initial(),run)

 def test_source_and_priority_drift_fail_closed(self):
  def run(forced):
   p=fixture(inventory_only=True);e,inv=p['before'],p['inventory']
   self.audit(e,inv)
   with patch.dict(api.hand.SOURCES,{'81-play-batch-2-card-text-draft.md':'0'*64}):
    self.assertFalse(self.audit(e,inv)['response_reaction_predicates_verified'])
   bad=copy.deepcopy(inv);bad['actor']='A'
   self.assertFalse(self.audit(e,bad)['response_reaction_predicates_verified']);return {}
  runtime.operation(initial(),run)

 def test_connected_entry_requires_reaction_audit(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  result=entry.reconstruct(bundle(),'test-1A',4)
  responses=[s for s in result['runtime']['steps'] if s.get('response_candidate_expansions')]
  self.assertTrue(responses)
  for step in responses:
   self.assertIn('response_reaction_predicates',step)
   self.assertTrue(step['response_reaction_predicates']['response_reaction_predicates_verified'])

if __name__=='__main__':unittest.main()
