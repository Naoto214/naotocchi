"""Prepared negative evidence from public quick effects, never hidden identity."""
import copy,unittest
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
from test_proxy_population_response_expansions import history
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_paid_draw as paid
import proxy_continuation_quick as quick
try:import proxy_population_prepared_predicates as api
except ImportError:api=None


def current():
 e,source,prepared=fixture('M-antlion-02');events=history(e);events[-1]['action_type']='turn_start_and_normal_draw'
 return e,events,prepared[0]


def link(e,card):
 g=e['legacy_continuation']['game_state'];p=g['players']['A'];s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
 for z in ('hand','deck'):
  if s in p[z]:p[z].remove(s)
 row=dict(link_id='test-public-'+s,actor='A',source_instance_id=s,card_id=card,card_copy_id=g['cards'][s]['card_copy_id'],source_zone='hand',action_type='use_event' if card.startswith('E-') else 'use_item' if card.startswith('I-') else 'use_play',target_instance_ids=[],candidate_variant=None,payment=dict(time=1),source_references=[])
 e['legacy_continuation']['activation_zone'].append(row);e['legacy_continuation']['response_context'].update(chain_status='building',chain_links=[x['link_id'] for x in e['legacy_continuation']['activation_zone']])
 return row


class PreparedPredicateTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'prepared current-public-effect audit absent')

 def test_real_inventory_negative_coverage_and_corruption(self):
  def run(forced):
   with paid.scope():
    e,h,s=current();inv=quick.actions.response_inventory(e,initial(),h);proof=api.audit(e,h,inv)
    self.assertTrue(proof['prepared_predicates_verified'],proof['errors']);self.assertEqual(len(proof['verified_preparations']),1)
    for mode in ('omit','duplicate','reoffer','priority'):
     bad=copy.deepcopy(inv)
     if mode=='omit':bad['preparation_exclusions']=[]
     elif mode=='duplicate':bad['preparation_exclusions']*=2
     elif mode=='priority':bad['actor']='B'
     else:bad['legal_candidate_details'].append(dict(source_instance_id=s,action_type='activate_prepared'))
     self.assertFalse(api.audit(e,h,bad)['prepared_predicates_verified'],mode)
   return {}
  runtime.operation(initial(),run)

 def test_public_quick_dispatch_boundaries_and_unknown_are_not_absence(self):
  def run(forced):
   for card in ('I-c_coin2','G-hit-blow','E-first-date','E-final-time','E-big-illness','G-archery-3d','G-asteroids-classic','G-area-claim','E-boss','G-animal-shogi','E-fateful-transform','G-air-hockey','G-baseball-batting','G-basketball-3d','G-beach-volley'):
    e,h,s=current();r=link(e,card);proof=api.quick_effect_route(r)
    self.assertEqual(proof['status'],'registered_no_person_removal',card);self.assertTrue(proof['handler']);self.assertTrue(proof['source_reference'])
    r['source_zone']='board';self.assertEqual(api.quick_effect_route(r)['status'],'unproved',card)
   e,h,s=current();r=link(e,'I-c_coin2');r['card_id']='future-removal'
   self.assertEqual(api.quick_effect_route(r)['status'],'unproved')
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_every_public_link_is_checked_even_with_nonactivation_origin(self):
  def run(forced):
   with paid.scope():
    e,h,s=current();inv=quick.actions.response_inventory(e,initial(),h);link(e,'I-c_coin2');inv['response_context']=copy.deepcopy(e['legacy_continuation']['response_context'])
    self.assertTrue(api.audit(e,h,inv)['prepared_predicates_verified'])
    # A card's existence in a capability table cannot certify another route.
    g=e['legacy_continuation']['game_state'];p=g['players']['A'];row=e['legacy_continuation']['activation_zone'][0];p['hand'].append(row['source_instance_id']);main=p['board']['main']
    row.update(source_zone='board',action_type='activate_board_ability',source_instance_id=main,card_id=g['cards'][main]['card_id'],card_copy_id=g['cards'][main]['card_copy_id'])
    proof=api.audit(e,h,inv);self.assertFalse(proof['prepared_predicates_verified']);self.assertTrue(proof['unproved_public_effects']);self.assertEqual(proof['errors'],[])
   return {}
  runtime.operation(initial(),run)

 def test_public_source_and_origin_binding_fail_closed(self):
  def run(forced):
   with paid.scope():
    e,h,s=current();inv=quick.actions.response_inventory(e,initial(),h);row=link(e,'I-c_coin2');inv['response_context']=copy.deepcopy(e['legacy_continuation']['response_context'])
    bad=copy.deepcopy(e);bad['legacy_continuation']['activation_zone'][0]['card_copy_id']='forged'
    self.assertFalse(api.audit(bad,h,inv)['prepared_predicates_verified'])
    duplicate=h+[copy.deepcopy(h[0])];self.assertTrue(api.audit(e,duplicate,inv)['errors'])
    for missing in ([],[dict(h[0],seq=0)]):self.assertTrue(api.audit(e,missing,inv)['errors'])
    unbound=[dict(h[0],action_type='activate_response',source_instance_id=row['source_instance_id'],chain_link_id='missing')]
    p=api.audit(e,unbound,inv);self.assertFalse(p['prepared_predicates_verified']);self.assertTrue(p['unproved_public_effects'])
    bound=[dict(h[0],action_type='activate_response',source_instance_id=row['source_instance_id'],chain_link_id=row['link_id'])]
    self.assertTrue(api.audit(e,bound,inv)['prepared_predicates_verified'])
    del row['source_zone']
    self.assertTrue(api.audit(e,bound,inv)['prepared_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_opponent_concealed_identity_is_neither_inspected_nor_exported(self):
  def run(forced):
   with paid.scope():
    e,h,s=current();e['legacy_continuation']['response_context']['priority_actor']='B';h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
    inv=quick.actions.response_inventory(e,initial(),h);one=api.audit(e,h,inv);self.assertTrue(one['prepared_predicates_verified'],one['errors'])
    other=copy.deepcopy(e);other['legacy_continuation']['game_state']['cards'][s]['card_id']='unknown-hidden-card'
    self.assertEqual(one,api.audit(other,h,inv));self.assertNotIn('source_instance_id',one['verified_preparations'][0])
   return {}
  runtime.operation(initial(),run)

 def test_recovery_override_dispatch_is_certified_in_actual_scope(self):
  import proxy_population_discard_recovery as recovery
  def run(forced):
   e,h,s=current();r=link(e,'G-animal-shogi')
   with recovery.scope():self.assertEqual(api.quick_effect_route(r)['status'],'registered_no_person_removal')
   return {}
  runtime.operation(initial(),run)

 def test_opponent_concealed_identity_has_no_read_access(self):
  class Tracked(dict):
   def __getitem__(self,key):
    if key in ('card_id','card_copy_id','initial_instance_id'):reads.append(key)
    return super().__getitem__(key)
   def get(self,key,default=None):
    if key in ('card_id','card_copy_id','initial_instance_id'):reads.append(key)
    return super().get(key,default)
  reads=[]
  def run(forced):
   with paid.scope():
    e,h,s=current();e['legacy_continuation']['response_context']['priority_actor']='B';h=history(e);h[-1]['action_type']='turn_start_and_normal_draw'
    inv=quick.actions.response_inventory(e,initial(),h);cards=e['legacy_continuation']['game_state']['cards'];cards[s]=Tracked(cards[s])
    p=api.audit(e,h,inv);self.assertTrue(p['prepared_predicates_verified'],p['errors']);self.assertEqual(reads,[])
   return {}
  runtime.operation(initial(),run)

 def test_connected_entry_exports_scope_without_claiming_full_closure(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',4)
  proofs=[x['response_prepared_predicates'] for x in r['runtime']['steps'] if x.get('response_candidate_expansions')]
  self.assertTrue(proofs)
  for p in proofs:self.assertFalse(p['all_rule_opportunities_proven']);self.assertFalse(p['information_use_proven']);self.assertIsNone(p['balance_admitted'])

if __name__=='__main__':unittest.main()
