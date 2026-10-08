"""Typed rows alone must not excuse unrelated changes or unbound choices."""
import copy,unittest
from test_proxy_population_effect_creation import quick_case,board_case,resolving
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
import proxy_population_boundary_response as boundary
import proxy_continuation_payments as payments
import proxy_continuation_actions as actions
import proxy_continuation_state as state
try:import proxy_population_typed_resolution as api
except ImportError:api=None

QUICKS=('E-fateful-transform','E-big-illness','G-beach-volley','G-baseball-batting','G-air-hockey','G-basketball-3d')
CARDS=QUICKS+('M-antlion-03','P-cliff_goat','M-antlion-07','P-anglerfish')


def transition(card,invalid=False,restart=None,outer=False):
 if card in QUICKS:e=quick_case(card)
 elif card in ('M-antlion-03','P-cliff_goat'):
  e,row=board_case(card);action=latching.current_actions(e,row)[0][0];e,_=effects.activate(e,action,row);e=resolving(e)
 else:
  e=quick_case('G-baseball-batting');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];p['discard'].append(c['activation_zone'][-1]['source_instance_id'])
  zone,source=next((z,s) for z in ('hand','deck','discard') for s in p[z] if g['cards'][s]['card_id']==card);p[zone].remove(source);slot='main' if card.startswith('M-') else 'partner'
  if p['board'][slot]:p['discard'].append(p['board'][slot])
  p['board'][slot]=source
  if slot=='partner':p['board']['partner_stage']=0
  g['challenge']['participants']['A']=p['board']['main'];cap=payments.capability(card)
  link=dict(link_id='response-link-3-'+source,action_type='activate_board_ability',source_zone='board',actor='A',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[p['board']['main']],candidate_variant='wisdom' if card=='M-antlion-07' else None,payment=dict(time=0),source_references=[cap['reference']])
  c['activation_zone']=[link];c['response_context']['chain_links']=[link['link_id']]
 if outer:
  c=e['legacy_continuation'];g=c['game_state'];main=g['players']['A']['board']['main'];physical=g['cards'][main]
  link=dict(link_id='outer-supplied-link',action_type='activate_board_ability',source_zone='board',actor='A',card_id=physical['card_id'],card_copy_id=physical['card_copy_id'],source_instance_id=main,target_instance_ids=[],candidate_variant=None,payment=dict(time=0),source_references=[])
  c['activation_zone'].insert(0,link);c['response_context']['chain_links'].insert(0,link['link_id'])
 if invalid:
  c=e['legacy_continuation'];g=c['game_state'];link=c['activation_zone'][-1]
  target=link['target_instance_ids'][0] if link['target_instance_ids'] else g['players']['A']['board']['main']
  owner=next(p for p in g['players'].values() if p['board']['main']==target);owner['board']['main']=None;owner['discard'].append(target)
 if card in QUICKS:r=payments.resolve(e,initial())
 elif card in ('M-antlion-03','P-cliff_goat'):r=effects.resolve(e,initial())
 else:r=payments.resolve_board_stat(e)
 r=actions.normalize_resolution_result(e,r)
 if restart:r=boundary.normalize(e,r,dict(kind=restart,turn_player=e['legacy_continuation']['game_state']['turn_player'],origin_event_seq=2))
 ev=r['new_events'][0];a=r.get('new_envelopes',[None])[0]
 if a is None:a=state.advance(e,r['new_snapshots'][0]['continuation_state'],ev['seq'])
 return e,a,ev,r.get('new_decisions',[])

class TypedResolutionTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'whole typed delta audit absent')
 def run_case(self,callback):
  def run(forced):
   with effects.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def test_all_ten_existing_resolvers_and_normalized_boundaries(self):
  def run():
   for card in CARDS:
    for restart in (None,'start','end'):
     b,a,ev,choices=transition(card,restart=restart);proof=api.audit(b,a,ev,choices)
     with self.subTest(card=card,restart=restart):
      self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_typed_resolution_verified']);self.assertFalse(proof['choice_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_outer_board_link_is_preserved_for_all_ten_routes(self):
  def run():
   for card in CARDS:
    b,a,ev,choices=transition(card,outer=True);self.assertEqual(api.audit(b,a,ev,choices)['errors'],[],card)
    bad=copy.deepcopy(a);bad['legacy_continuation']['activation_zone']=[];bad['legacy_continuation']['response_context']['chain_links']=[]
    self.assertTrue(api.audit(b,bad,ev,choices)['errors'],card)
   return {}
  self.run_case(run)
 def test_correct_typed_rows_do_not_allow_draw_refund_source_return_or_reservations(self):
  def run():
   for card in CARDS:
    b,a,ev,choices=transition(card)
    for mode in ('draw','refund','source','reservation','metadata','usage'):
     bad=copy.deepcopy(a);g=bad['legacy_continuation']['game_state'];p=g['players']['A'];source=ev['source_instance_id']
     if mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='refund':p['time']+=1
     elif mode=='source':
      if card in QUICKS:p['discard'].remove(source);p['hand'].append(source)
      else:bad['legacy_continuation']['activation_zone']=copy.deepcopy(b['legacy_continuation']['activation_zone'])
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='metadata':g['cards'][source]['card_id']='C-box'
     else:bad['runtime']['ability_uses'].append(dict(forged=True))
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,ev,choices)['errors'])
   return {}
  self.run_case(run)
 def test_invalid_target_exact_nonapplication_and_wrong_dispatch(self):
  def run():
   for card in ('E-big-illness','G-basketball-3d','M-antlion-03','P-cliff_goat','P-anglerfish'):
    b,a,ev,choices=transition(card,invalid=True);proof=api.audit(b,a,ev,choices);self.assertEqual(proof['errors'],[],card)
    self.assertTrue(api.audit(b,a,dict(ev,action_type='resolve_unregistered'),choices)['errors'])
    if 'application_evidence' in ev:
     bad=copy.deepcopy(ev);bad['application_evidence']['parts'][0]['target_instance_id']='foreign';self.assertTrue(api.audit(b,a,bad,choices)['errors'])
   return {}
  self.run_case(run)
 def test_parameter_receipt_must_match_supplied_resolution_choice(self):
  def run():
   b,a,ev,choices=transition('M-antlion-03');self.assertEqual(api.audit(b,a,ev,choices)['errors'],[])
   self.assertTrue(api.audit(b,a,ev,[])['errors'])
   bad=copy.deepcopy(choices);old=bad[0]['selected_action']['option']['parameter'];bad[0]['selected_action']['option']['parameter']='wisdom' if old=='power' else 'power'
   self.assertTrue(api.audit(b,a,ev,bad)['errors'])
   ev=copy.deepcopy(ev);ev['result']['unrelated']=1;self.assertTrue(api.audit(b,a,ev,choices)['errors']);return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_unrelated_draw_with_valid_effect_row(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,a,ev,choices=transition('E-fateful-transform');p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0));fields={k:ev[k] for k in ('source_instance_id','chain_link_id','source_reference','created_effect')};ev=payments.transition_event(b,a,'resolve_payment_modifier','A',**fields)
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a,mandatory_decisions=choices)])
   try:coverage.audit(result,[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted collateral draw'
   self.assertIn('typed resolution semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
