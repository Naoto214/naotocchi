"""Unresolved cat partner suppression and existing designated no-choice route."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_partner_draw as api
import proxy_population_policy_bridge as bridge
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers

def cat(egg=True,outer=False,empty=False):
 b,_,_,_=case();c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1];p['discard'].append(link['source_instance_id']);source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-cat_ceo');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
 if p['board']['partner']:p['discard'].append(p['board']['partner'])
 p['board'].update(partner=source,partner_stage=0)
 if egg:p['discard'].append(p['board']['main']);p['board']['main']=None
 link.update(source_instance_id=source,card_id='P-cat_ceo',card_copy_id=g['cards'][source]['card_copy_id'],source_zone='board',action_type='activate_board_ability',candidate_variant=None,payment=dict(time=0))
 if outer:
  other=copy.deepcopy(link);other['link_id']='supplied-outer';c['activation_zone'].insert(0,other);c['response_context']['chain_links'].insert(0,other['link_id'])
 if empty:p['deck'].extend(p['hand']);p['hand']=[]
 state.validate(b);return b

class PartnerCycleTests(unittest.TestCase):
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)
 def test_actual_forced_suppresses_choice_cycle_and_preserves_entire_boundary(self):
  def run(forced):
   for outer in (False,True):
    for empty in (False,True):
     b=cat(outer=outer,empty=empty);original=copy.deepcopy(b);r=forced(b,initial(),[],[],[b]);ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq'])
     with self.subTest(outer=outer,empty=empty):
      self.assertEqual(r['new_decisions'],[],'06/93 forbids suppressed partner choice');self.assertEqual(ev['result'],dict(drawn_instance_ids=[],hand_bottom_instance_id=None,target_instance_id=None,growth_added=0));self.assertEqual(b,original)
      proof=api.audit_cycle(b,a,ev,[]);self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_suppression_verified']);self.assertIsNone(proof['balance_admitted'])
      bad=copy.deepcopy(a);p=bad['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0));self.assertTrue(api.audit_cycle(b,bad,ev,[])['errors']);self.assertTrue(api.audit_cycle(b,a,ev,[{}])['errors'])
   return {}
  self.run_case(run)
 def test_bound_designated_bridge_sees_zero_callbacks_and_live_partner_keeps_choice(self):
  def run(forced):
   for egg in (False,True):
    b=cat(egg=egg);current=state.current(b);s=bridge.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','unit-start');s.effect(bridge.occurrence_key(current),'A')
    with bridge.handler_scope(s):r=forced(b,initial(),[],[],[b])
    self.assertEqual(len(r['new_decisions']),0 if egg else 1);self.assertEqual(len(r['new_events'][0]['result']['drawn_instance_ids']),0 if egg else 1)
   return {}
  self.run_case(run)
 def test_descriptor_and_cycle_dispatch_restore_after_native_failure(self):
  original=triggers.resolve;draws=triggers.DRAW_EFFECTS;cycles=triggers.CYCLE_EFFECTS
  def run(forced):
   b=cat();inside_draws=triggers.DRAW_EFFECTS;inside_cycles=triggers.CYCLE_EFFECTS
   with patch.object(triggers.old,'_snapshot',side_effect=ValueError('native failure')):
    with self.assertRaisesRegex(ValueError,'native failure'):forced(b,initial(),[],[],[b])
   self.assertIs(triggers.DRAW_EFFECTS,inside_draws);self.assertIs(triggers.CYCLE_EFFECTS,inside_cycles)
   r=forced(b,initial(),[],[],[b]);self.assertEqual(r['new_decisions'],[]);return {}
  self.run_case(run);self.assertIs(triggers.resolve,original);self.assertIs(triggers.DRAW_EFFECTS,draws);self.assertIs(triggers.CYCLE_EFFECTS,cycles)
 def test_pending_response_is_not_a_resolution_and_live_cat_is_outside_audit(self):
  def run(forced):
   b=cat();b['legacy_continuation']['response_context']['chain_status']='building';p=api.audit_cycle(b,b,dict(action_type='pass_response'),[])
   self.assertFalse(p['applicable']);self.assertEqual(p['errors'],[])
   b=cat(egg=False);r=forced(b,initial(),[],[],[b]);ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);p=api.audit_cycle(b,a,ev,r['new_decisions']);self.assertFalse(p['applicable']);self.assertEqual(p['errors'],[]);return {}
  self.run_case(run)
 def test_retained_reentry_metadata_is_preserved_without_raw465_projection(self):
  import proxy_population_incarnation_runtime as incarnation
  def run(forced):
   b=cat();r=forced(b,initial(),[],[],[b]);ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq'])
   old=b['legacy_continuation']['game_state']['players']['A']['deck'][0];new=old[:-1]+'2'
   for e in (b,a):
    g=e['legacy_continuation']['game_state'];g['cards'][new]=copy.deepcopy(g['cards'][old]);p=g['players']['A'];p['deck']=[new if s==old else s for s in p['deck']]
    state.validate(e);self.assertEqual(incarnation.active_cards(g['cards'])[g['cards'][old]['card_copy_id']],new)
   self.assertEqual(api.audit_cycle(b,a,ev,[])['errors'],[])
   bad=copy.deepcopy(a);bad['legacy_continuation']['game_state']['cards'][old]['card_id']='C-box';self.assertTrue(api.audit_cycle(b,bad,ev,[])['errors']);return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_suppressed_draw(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run(forced):
   b=cat();r=forced(b,initial(),[],[],[b]);ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
   event=payments.transition_event(b,a,'resolve_board_ability','A',**{k:ev[k] for k in ('source_instance_id','source_zone','chain_link_id','source_reference','result')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted suppressed draw'
   self.assertIn('partner suppression semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
