"""Response hand conditions use priority actor and expose unproved routes."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_quick as quick
import proxy_continuation_state as state
import proxy_population_discard_recovery as recovery
import proxy_population_paid_draw as paid

def scoped(callback,forced):
 with paid.scope():return callback(forced)
from test_proxy_population_runtime import initial
from test_proxy_population_activation_legality import fixture
from test_proxy_population_response_expansions import history
try:import proxy_population_response_predicates as api
except ImportError:api=None

class ResponsePredicateTests(unittest.TestCase):
 def test_hand_sources_payment_targets_and_missing_candidates(self):
  self.assertIsNotNone(api)
  def run(forced):
   for card in sorted(api.SUPPORTED):
    for time in (0,10):
     e,actor,source=fixture(card,2);e=runtime.engine.payments.upgrade(e);e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3
     g=e['legacy_continuation']['game_state'];g['round']=10;g['players'][actor]['time']=time
     events=[dict(seq=1,action_type='turn_start_and_egg_draw',actor=actor),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]+history(e)
     inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
     self.assertTrue(proof['response_hand_predicates_verified'],(card,time,proof['errors']))
     self.assertIn(source,proof['verified_source_ids']);self.assertFalse(proof['complete_legal_set_proven'])
     own=[r for r in inv['legal_candidate_details'] if r.get('source_instance_id')==source]
     for row in own:
      bad=copy.deepcopy(inv);bad['legal_candidate_details'].remove(row)
      self.assertFalse(api.audit(e,events,bad)['response_hand_predicates_verified'],card)
      bad=copy.deepcopy(inv);next(r for r in bad['legal_candidate_details'] if r['candidate_id']==row['candidate_id'])['base_time_cost']=99
      self.assertFalse(api.audit(e,events,bad)['response_hand_predicates_verified'],card)
      for key,value in [('target_instance_ids',['missing']),('candidate_variant','unregistered')]:
       bad=copy.deepcopy(inv);next(r for r in bad['legal_candidate_details'] if r['candidate_id']==row['candidate_id'])[key]=value
       self.assertFalse(api.audit(e,events,bad)['response_hand_predicates_verified'],card)
   return {}
  with connected.contract_scope(),recovery.scope():runtime.operation(initial(),lambda forced:scoped(run,forced))

 def test_populated_board_and_current_turn_use(self):
  def run(forced):
   for card in sorted(api.SUPPORTED):
    e,actor,source=fixture(card,2);e=runtime.engine.payments.upgrade(e);e['event_seq']=4;e['legacy_continuation']['response_context']['origin_event_seq']=4
    g=e['legacy_continuation']['game_state'];g['round']=10
    def take(owner,prefix):
     q=g['players'][owner]
     x=next(x for z in ('hand','deck','discard') for x in q[z] if x!=source and g['cards'][x]['card_id'].startswith(prefix))
     next(q[z] for z in ('hand','deck','discard') if x in q[z]).remove(x);return x
    for owner in ('A','B'):
     q=g['players'][owner];q['time']=10;q['board']['main']=take(owner,'M-');q['board']['world']=take(owner,'W-')
     q['board']['companions']=[take(owner,'C-') for _ in range(3)]
     for _ in range(3):
      x=take(owner,'I-');face=g['cards'][x]['card_id'] in ('I-bowtie','I-sleepboost1')
      if not face:q['discard'].append(x);continue
      q['board']['prepared'].append(x)
      e['runtime']['public_prepared'][x]=dict(controller=owner,face_up=face,paid_time=2 if face else 1,placed_event_seq=2)
      if face:e['runtime']['attachments'][x]=dict(controller=owner,target_instance_id=q['board']['main'],attached_event_seq=2)
    events=[dict(seq=1,action_type='turn_start_and_normal_draw',actor=actor),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]+history(e)
    inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
    self.assertTrue(proof['response_hand_predicates_verified'],(card,proof['errors']))
    if card not in ('G-beach-volley','G-asteroids-classic'):
     self.assertTrue(any(r.get('source_instance_id')==source for r in inv['legal_candidate_details']),card)
    if card=='E-final-time':
     events.insert(-1,dict(seq=3,action_type='activate_response',actor=actor,source_instance_id=source))
     inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
     self.assertTrue(proof['response_hand_predicates_verified'],proof['errors'])
     self.assertFalse(any(r.get('source_instance_id')==source for r in inv['legal_candidate_details']))
   return {}
  with connected.contract_scope(),recovery.scope():runtime.operation(initial(),lambda forced:scoped(run,forced))

 def test_priority_actor_and_unproved_reaction_routes(self):
  self.assertIsNotNone(api)
  def run(forced):
   for card in ('I-c_coin2','E-first-date','E-boss','E-final-time','G-air-hockey','G-baseball-batting'):
    e,actor,source=fixture(card);e=runtime.engine.payments.upgrade(e);e['event_seq']=3;e['legacy_continuation']['response_context']['origin_event_seq']=3
    e['legacy_continuation']['game_state']['turn_player']='B' if actor=='A' else 'A'
    g=e['legacy_continuation']['game_state'];g['round']=10;g['players'][actor]['time']=10
    events=[dict(seq=1,action_type='turn_start_and_normal_draw',actor=g['turn_player']),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]+history(e)
    inv=quick.actions.response_inventory(e,initial(),events);proof=api.audit(e,events,inv)
    self.assertTrue(proof['response_hand_predicates_verified'],proof['errors'])
    if card in api.SUPPORTED:
     self.assertIn(source,proof['verified_source_ids'])
     self.assertTrue(any(r.get('source_instance_id')==source for r in inv['legal_candidate_details']),card)
    else:self.assertIn(source,[r['source_instance_id'] for r in proof['unproved_sources']])
   return {}
  with connected.contract_scope(),recovery.scope():runtime.operation(initial(),lambda forced:scoped(run,forced))

 def test_actual_entry_exports_separate_predicate_evidence(self):
  self.assertIsNotNone(api)
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',4)
  proofs=[s['response_hand_predicates'] for s in r['runtime']['steps'] if s.get('response_candidate_expansions')]
  self.assertTrue(proofs)
  for p in proofs:self.assertTrue(p['response_hand_predicates_verified'],p['errors'])

if __name__=='__main__':unittest.main()
