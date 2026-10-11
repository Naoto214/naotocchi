"""Source-local target/cost alternatives survive projection tampering."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_paid_draw as paid
import proxy_continuation_candidates as candidates
import proxy_population_source_inventory as sources
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
try:import proxy_population_candidate_expansions as api
except ImportError:api=None

def repair(inv):
 inv['legal_candidate_details']=sorted((u for u in inv['enumeration_units'] if u['disposition']=='admitted'),key=lambda u:u['candidate_id']);inv['legal_candidate_ids']=[u['candidate_id'] for u in inv['legal_candidate_details']]

class ExpansionTests(unittest.TestCase):
 def test_paid_order_omission_is_distinct_from_source_coverage(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,_=fixture('M-antlion-08');e['legacy_continuation']['game_state']['phase']='normal_action'
   with paid.scope():
    inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors']);self.assertFalse(proof['complete_legal_set_proven'])
    bad=copy.deepcopy(inv);row=next(u for u in bad['enumeration_units'] if u['action_type']=='activate_main_ability');bad['enumeration_units'].remove(row);repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_current_first_date_target_and_item_targets_expand_from_state(self):
  from test_proxy_population_activation_legality import fixture as target_fixture
  import proxy_population_activation_legality as legality
  def run(forced):
   e,actor,source=target_fixture('E-first-date',1);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][actor]
   # Conditional inventory fixture with multiple known attachment targets.
   for name,zone in (('C-box','companions'),('C-chicken','companions')):
    s=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']==name)
    next(p[z] for z in ('hand','deck','discard') if s in p[z]).remove(s);p['board'][zone].append(s)
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-bowtie')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   p['time']=10
   with legality.scope():
    inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==item);bad['enumeration_units'].remove(u);repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==source);u['target_instance_ids']=[];repair(bad)
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_shared_target_expander_cannot_hide_an_attachment_alternative(self):
  from unittest.mock import patch
  from test_proxy_population_activation_legality import fixture as target_fixture
  import proxy_population_challenge_window as window
  def run(forced):
   e,actor,_=target_fixture('E-first-date',1);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][actor];p['time']=10
   companion=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='C-box');next(p[z] for z in ('hand','deck','discard') if companion in p[z]).remove(companion);p['board']['companions'].append(companion)
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-bowtie')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   native=candidates.old.candidates._targets
   def omitted(variant,view,family):
    result=native(variant,view,family)
    return result[:1] if variant=='each_legal_own_person' else result
   with patch.object(candidates.old.candidates,'_targets',omitted):
    inventory=candidates.audit(e,[]);targets=[r['target_instance_ids'] for r in inventory['enumeration_units'] if r['source_instance_id']==item]
    self.assertEqual(len(targets),1);self.assertTrue(sources.audit_normal(e,inventory)['source_and_variant_coverage_verified'])
    proof=api.audit_normal(e,inventory)
    with self.subTest(boundary='audit'):self.assertFalse(proof['registered_expansions_verified'],proof)
    with self.subTest(boundary='actual_entry'):
     with self.assertRaisesRegex(ValueError,'candidate expansions'):runtime._step(e,initial(),[],[],[e],forced)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

class PaymentExpansionTests(unittest.TestCase):
 def test_optional_discount_is_a_separate_candidate_even_when_unaffordable(self):
  def run(forced):
   e,source,_=fixture('M-antlion-01');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-poop1')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   for time in (0,10):
    p['time']=time;inv=candidates.audit(e,[])
    rows=[r for r in inv['enumeration_units'] if r['source_instance_id']==item and r['action_type']=='set_item']
    self.assertEqual(len(rows),2)
    self.assertTrue(api.audit_normal(e,inv)['registered_expansions_verified'])
    bad=copy.deepcopy(inv);bad['enumeration_units'].remove(next(r for r in bad['enumeration_units'] if r['source_instance_id']==item and r['action_type']=='set_item' and r['evidence']['cost_modifiers']));repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)

class SharedCostPoolTests(unittest.TestCase):
 def test_shared_optional_discount_omission_is_rejected(self):
  from unittest.mock import patch
  def run(forced):
   e,_,_=fixture('M-antlion-01');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-poop1')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   native=candidates.rules.cost_options
   for keep in (0,1):
    with patch.object(candidates.rules,'cost_options',lambda *args:[native(*args)[keep]] if args[1]['action_type']=='set_item' else native(*args)):
     inv=candidates.audit(e,[])
     self.assertEqual(len([r for r in inv['enumeration_units'] if r['source_instance_id']==item and r['action_type']=='set_item']),1)
     with self.subTest(keep=keep):self.assertFalse(api.audit_normal(e,inv)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_shared_paid_cost_omission_is_rejected_in_normal_and_response(self):
  from unittest.mock import patch
  import proxy_population_board_predicates as board
  import proxy_continuation_actions as actions
  def run(forced):
   for card in ('M-antlion-02','M-antlion-08'):
    e,source,costs=fixture(card);g=e['legacy_continuation']['game_state'];p=g['players'][g['turn_player']]
    native=paid.cost_options
    with paid.scope(),patch.object(paid,'cost_options',lambda *args:[] if args[2]=='M-antlion-02' else native(*args)[:1]):
     history=[dict(seq=1,action_type='turn_start_and_normal_draw',actor=g['turn_player']),dict(seq=3,action_type='normal_pass_end_request',actor=g['turn_player'])]
     import proxy_continuation_state as state
     import proxy_resource_value_trajectory as old
     current=state.current(e);history[-1].update(game_state_after_sha256=old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=old.start._hash(current))
     response=actions.response_inventory(e,initial(),history)
     with self.subTest(card=card,kind='response'):self.assertFalse(board.audit_response(e,history,response)['response_board_predicates_verified'])
     g['phase']='normal_action';inv=candidates.audit(e,[])
     self.assertEqual(len([r for r in inv['enumeration_units'] if r['source_instance_id']==source]),1)
     with self.subTest(card=card,kind='normal_expansion'):self.assertFalse(api.audit_normal(e,inv)['registered_expansions_verified'])
     with self.subTest(card=card,kind='normal_predicates'):self.assertFalse(board.audit_normal(e,inv)['board_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_actual_entry_rejects_shared_payment_omissions(self):
  from unittest.mock import patch
  import proxy_population_challenge_window as window
  def run(forced):
   for card in ('M-antlion-01','M-antlion-02','M-antlion-08'):
    e,_,_=fixture(card);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']];p['time']=0
    if card=='M-antlion-01':
     item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-poop1')
     for z in ('hand','deck','discard'):
      if item in p[z]:p[z].remove(item)
     p['deck']+=p['hand'];p['hand']=[item]
     native=candidates.rules.cost_options;guard=patch.object(candidates.rules,'cost_options',lambda *args:native(*args)[:1])
    else:
     p['deck']+=p['hand'];p['hand']=[];native=paid.cost_options;guard=patch.object(paid,'cost_options',lambda *args:[] if args[2]=='M-antlion-02' else native(*args)[:1])
    with self.subTest(card=card),paid.scope(),guard:
     with self.assertRaisesRegex(ValueError,'candidate expansions'):runtime._step(e,initial(),[],[],[e],forced)
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

 def test_independent_paid_pool_preserves_multiple_quick_costs_and_usage(self):
  import proxy_population_cost_alternatives as costs
  from unittest.mock import patch
  def run(forced):
   e,source,initial_costs=fixture('M-antlion-08');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   for card in ('G-hit-blow','E-boss'):
    target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);next(p[z] for z in ('hand','deck') if target in p[z]).remove(target);p['discard'].append(target)
   options=costs.paid_costs(e,source);self.assertEqual(len(options),6);self.assertTrue(all(a!=b for a,b in options));self.assertEqual({tuple(x) for x in options},{tuple(reversed(x)) for x in options})
   with paid.scope():
    inventory=candidates.audit(e,[]);self.assertTrue(api.audit_normal(e,inventory)['registered_expansions_verified'])
    self.assertEqual({tuple(r['cost_instance_ids']) for r in inventory['enumeration_units'] if r['source_instance_id']==source},{tuple(x) for x in options})
    g['round']=2;e['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=1,count=1)]
    self.assertEqual(costs.paid_costs(e,source),options)
    e['runtime']['ability_uses'][0]['round']=2;self.assertEqual(costs.paid_costs(e,source),[])
    self.assertTrue(api.audit_normal(e,candidates.audit(e,[]))['registered_expansions_verified'])
   with patch.dict(costs.SOURCES,{costs.TEXT:'0'*64}):
    with self.assertRaisesRegex(ValueError,'source changed'):costs.paid_costs(e,source)
   return {}
  runtime.operation(initial(),run)

class ConnectedExpansionTests(unittest.TestCase):
 def test_actual_normal_entries_export_expansion_evidence(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  result=connected.reconstruct(bundle(),'test-1A',3)
  entries=[s for s in result['runtime']['steps'] if s.get('decision',{} ) is not None and s['decision'].get('context',{}).get('decision_kind')=='normal_action']
  self.assertTrue(entries)
  for step in entries:
   proof=step['normal_candidate_expansions']
   self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
   self.assertFalse(proof['complete_legal_set_proven'])

if __name__=='__main__':unittest.main()
