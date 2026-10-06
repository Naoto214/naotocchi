import copy, unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as base
import proxy_continuation_state as state
import proxy_continuation_candidates as candidates
import proxy_continuation_quick as quick
try: import proxy_population_activation_legality as api
except ImportError: api=None

def fixture(card,stage=1):
 g,actor,source=game_with(card);p=g['players'][actor]
 partner=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('P-'))
 (p['hand'] if partner in p['hand'] else p['deck']).remove(partner)
 p['board'].update(partner=partner,partner_stage=stage)
 p['discard'].extend(p['deck']);p['deck']=[];p['time']=1
 return state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2),actor,source

class LegalityTests(unittest.TestCase):
 def test_nonzero_partner_and_empty_deck_are_not_activation_conditions(self):
  self.assertIsNotNone(api,'source-bound activation/resolution boundary absent')
  def run(forced):
   for card,count in [('E-first-date',1),('G-hit-blow',7)]:
    e,actor,source=fixture(card);c=state.current(e);entry=base.engine.base.old.start.load_candidate_rows()[card]
    with api.scope():
     rows,proof=quick.hand_candidates(c,[],actor,source,entry)
     self.assertEqual(len(rows),count);self.assertEqual(proof['activation_condition_scope'],'current_target_and_payment_only')
     e['legacy_continuation']['game_state']['phase']='normal_action'
     inv=candidates.audit(e,[]);normal=[a for a in inv['legal_candidate_details'] if a['source_instance_id']==source]
     self.assertEqual(len(normal),count)
     for action in normal:
      after,events=quick.activate(e,dict(selected_action=action),dict(public_events=[]),initial(),verify_record=False)
      self.assertEqual(after['legacy_continuation']['game_state']['players'][actor]['time'],0)
      self.assertEqual(events[0]['source_instance_id'],source)
   return {}
  base.operation(initial(),run)
 def test_response_selection_does_not_claim_legacy_five_growth_at_nonzero_stage(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,actor,source=fixture('E-first-date');e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3;c=state.current(e);event=dict(seq=e['event_seq'],action_type='response_pass',actor=actor,game_state_after_sha256=quick.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=quick.old.start._hash(c))
   with api.scope():
    chance=quick.actions.response_inventory(e,initial(),[event]);r=quick.old.start.seeded.resolve_response_choice(dict(order_id='unit-only',actor_turn_index=1,round=1),chance)
    self.assertEqual(r['resolution_mode'],'response_seeded_fallback');self.assertIsNone(r['comparison_evidence'])
    self.assertEqual(r['seed_proof']['canonical_candidate_ids'],chance['legal_candidate_ids'])
   return {}
  base.operation(initial(),run)
 def test_absent_target_cost_and_unregistered_declaration_still_rejected(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,actor,source=fixture('E-first-date');p=e['legacy_continuation']['game_state']['players'][actor];p['discard'].append(p['board']['partner']);p['board'].update(partner=None,partner_stage=None)
   with api.scope():
    rows,proof=quick.hand_candidates(state.current(e),[],actor,source,base.engine.base.old.start.load_candidate_rows()['E-first-date']);self.assertEqual(rows,[])
   self.assertIsNot(quick.hand_candidates,api.hand_candidates)
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
