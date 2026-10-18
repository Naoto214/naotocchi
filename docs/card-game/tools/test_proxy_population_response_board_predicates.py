import copy,unittest
from unittest.mock import patch
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_paid_draw as paid
import proxy_population_discard_recovery as recovery
import proxy_continuation_quick as quick
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
from test_proxy_population_response_expansions import history
try:from proxy_population_board_predicates import audit_response
except ImportError:audit_response=None

class ResponseBoardPredicateTests(unittest.TestCase):
 def test_paid_sources_costs_usage_and_turn_owner(self):
  self.assertIsNotNone(audit_response)
  def run(forced):
   with paid.scope():
    for card in paid.DESCRIPTORS:
     for mode in ('allowed','used','other_turn'):
      e,source,_=fixture(card);g=e['legacy_continuation']['game_state'];actor=e['legacy_continuation']['response_context']['priority_actor']
      if mode=='used':e['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1)]
      if mode=='other_turn':g['turn_player']='B' if actor=='A' else 'A'
      events=history(e);events[-1].update(action_type='turn_start_and_normal_draw',actor=g['turn_player']);inv=quick.actions.response_inventory(e,initial(),events);proof=audit_response(e,events,inv)
      self.assertTrue(proof['response_board_predicates_verified'],(card,mode,proof['errors']));self.assertIn(source,proof['verified_source_ids'])
      rows=[r for r in inv['legal_candidate_details'] if r.get('source_instance_id')==source];self.assertEqual(bool(rows),mode=='allowed')
      if rows:
       for mutation in ('omit','cost','target'):
        bad=copy.deepcopy(inv);row=next(r for r in bad['legal_candidate_details'] if r.get('source_instance_id')==source)
        if mutation=='omit':bad['legal_candidate_details'].remove(row)
        elif mutation=='cost':row['cost_instance_ids']=['missing']
        else:row['target_instance_ids']=['missing']
        self.assertFalse(audit_response(e,events,bad)['response_board_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_recovery_current_source_targets_and_response_use(self):
  self.assertIsNotNone(audit_response)
  from test_proxy_population_discard_recovery import fixture as cat_fixture
  def run(forced):
   with recovery.scope():
    e,events,source,target=cat_fixture();e=runtime.engine.payments.upgrade(e)
    inv=quick.actions.response_inventory(e,initial(),events);proof=audit_response(e,events,inv)
    self.assertTrue(proof['response_board_predicates_verified'],proof['errors']);self.assertIn(source,proof['verified_source_ids'])
    self.assertTrue(any(r.get('source_instance_id')==source for r in inv['legal_candidate_details']))
    bad=copy.deepcopy(inv);next(r for r in bad['legal_candidate_details'] if r.get('source_instance_id')==source)['target_instance_ids']=[source]
    self.assertFalse(audit_response(e,events,bad)['response_board_predicates_verified'])
    used_history=events+[dict(seq=4,actor=inv['actor'],action_type='activate_response',source_zone='board',source_instance_id=source)]
    self.assertFalse(audit_response(e,used_history,inv)['response_board_predicates_verified'])
    emptied=copy.deepcopy(inv);emptied['legal_candidate_details']=[r for r in emptied['legal_candidate_details'] if r.get('source_instance_id')!=source]
    self.assertTrue(audit_response(e,used_history,emptied)['response_board_predicates_verified'])
    used=copy.deepcopy(e);g=used['legacy_continuation']['game_state'];used['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1)]
    self.assertFalse(audit_response(used,events,inv)['response_board_predicates_verified'])
    self.assertTrue(audit_response(used,events,emptied)['response_board_predicates_verified'])
    other=copy.deepcopy(e);other['legacy_continuation']['game_state']['turn_player']='B' if inv['actor']=='A' else 'A'
    self.assertFalse(audit_response(other,events,inv)['response_board_predicates_verified'])
    self.assertTrue(audit_response(other,events,emptied)['response_board_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_all_person_world_sources_are_verified_or_explicitly_unproved(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  import proxy_continuation_rules as rules
  import proxy_continuation_state as state
  def run(forced):
   with paid.scope(),recovery.scope():
    for card in rules.table()['cards']:
     if card['card_type'] not in ('main','companion','partner','world'):continue
     g,actor,source=game_with(card['card_id']);p=g['players'][actor];p['hand'].remove(source)
     slot={'main':'main','companion':'companions','partner':'partner','world':'world'}[card['card_type']]
     if slot=='companions':p['board'][slot].append(source)
     else:p['board'][slot]=source
     if slot=='partner':p['board']['partner_stage']=0
     e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3))
     e['legacy_continuation']['response_context']['origin_event_seq']=3
     events=history(e);events[-1]['action_type']='turn_start_and_normal_draw'
     inv=quick.actions.response_inventory(e,initial(),events);proof=audit_response(e,events,inv)
     self.assertTrue(proof['response_board_predicates_verified'],(card['card_id'],proof['errors']))
     checked=source in proof['verified_source_ids'];unknown=source in [r['source_instance_id'] for r in proof['unproved_sources']]
     self.assertNotEqual(checked,unknown,card['card_id'])
     if checked:
      bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(source_instance_id=source,card_id=card['card_id'],action_type='forged'))
      self.assertFalse(audit_response(e,events,bad)['response_board_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_prepared_source_stays_unproved_without_capability_lookup(self):
  import proxy_population_board_predicates as board
  def run(forced):
   with paid.scope():
    e,source,costs=fixture('M-antlion-02');events=history(e);events[-1]['action_type']='turn_start_and_normal_draw'
    inv=quick.actions.response_inventory(e,initial(),events);prior=board.rules.classification
    def classified(card):
     if card=='I-poop1':raise ValueError('not registered for this proof')
     return prior(card)
    with patch.object(board.rules,'classification',classified):proof=audit_response(e,events,inv)
    self.assertTrue(proof['response_board_predicates_verified'],proof['errors'])
    self.assertIn(costs[0],[r['source_instance_id'] for r in proof['unproved_sources']])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_actual_entry_exports_narrow_board_predicate_scope(self):
  self.assertIsNotNone(audit_response)
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',4)
  proofs=[s['response_board_predicates'] for s in r['runtime']['steps'] if s.get('response_candidate_expansions')]
  self.assertTrue(proofs)
  for p in proofs:self.assertTrue(p['response_board_predicates_verified'],p['errors']);self.assertFalse(p['complete_legal_set_proven'])

if __name__=='__main__':unittest.main()
