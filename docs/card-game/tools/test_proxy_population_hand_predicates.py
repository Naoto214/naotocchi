"""Source conditions and current dispositions, independent of inventory flags."""
import copy,unittest
from unittest.mock import patch
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
from test_proxy_population_candidate_expansions import repair
try:import proxy_population_hand_predicates as api
except ImportError:api=None

class HandPredicateTests(unittest.TestCase):
 def test_current_quick_sources_and_forged_dispositions(self):
  self.assertIsNotNone(api)
  def run(forced):
   table=candidates.rules.table();cards=[r['card_id'] for r in table['cards'] if any(a['action_type'] in ('use_play','use_item','use_event') for a in r['actions'])]
   self.assertEqual(len(cards),15)
   for card in cards:
    for time in (0,4):
     g,actor,source=game_with(card);g['phase']='normal_action';g['players'][actor]['time']=time
     e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3))
     events=[dict(seq=1,action_type='turn_start_and_egg_draw',actor=actor),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]
     inv=candidates.audit(e,events);proof=api.audit_normal(e,events,inv)
     self.assertTrue(proof['hand_predicates_verified'],(card,time,proof['errors']))
     self.assertFalse(proof['complete_legal_set_proven']);self.assertIsNone(proof['balance_admitted'])
     own=[r for r in proof['verified_units'] if r['source_instance_id']==source];self.assertTrue(own,card)
     for verified in own:
      bad=copy.deepcopy(inv);row=next(r for r in bad['enumeration_units'] if r['enumeration_unit_id']==verified['enumeration_unit_id'])
      if row['disposition']=='admitted':row.update(disposition='excluded',candidate_id=None,reason_codes=['insufficient_time'])
      else:row.update(disposition='admitted',candidate_id='forged',reason_codes=[])
      repair(bad);self.assertFalse(api.audit_normal(e,events,bad)['hand_predicates_verified'],card)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_populated_targets_thresholds_and_public_conditions(self):
  def run(forced):
   for card in sorted(api.SUPPORTED):
    g,actor,source=game_with(card);g.update(phase='normal_action',round=10)
    e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3))
    g=e['legacy_continuation']['game_state'];p=g['players'][actor]
    def take(owner,prefix,excluded=()):
     q=g['players'][owner]
     item=next(x for z in ('hand','deck','discard') for x in q[z] if x not in excluded and g['cards'][x]['card_id'].startswith(prefix))
     next(q[z] for z in ('hand','deck','discard') if item in q[z]).remove(item)
     return item
    for owner in ('A','B'):
     q=g['players'][owner];q['time']=10;q['board']['main']=take(owner,'M-',(source,))
     q['board']['world']=take(owner,'W-',(source,))
     q['board']['partner']=take(owner,'P-',(source,));q['board']['partner_stage']=2
     q['board']['companions']=[take(owner,'C-',(source,)) for _ in range(3)]
     for _ in range(3):
      item=take(owner,'I-',(source,));q['board']['prepared'].append(item)
      face=g['cards'][item]['card_id'] in ('I-bowtie','I-sleepboost1')
      e['runtime']['public_prepared'][item]=dict(controller=owner,face_up=face,paid_time=2 if face else 1,placed_event_seq=2)
      if face:e['runtime']['attachments'][item]=dict(controller=owner,target_instance_id=q['board']['main'],attached_event_seq=2)
    p['discard'].append(take(actor,'C-',(source,)))
    events=[dict(seq=1,action_type='turn_start_and_normal_draw',actor=actor),dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))]
    inv=candidates.audit(e,events);proof=api.audit_normal(e,events,inv)
    self.assertTrue(proof['hand_predicates_verified'],(card,proof['errors']))
    own=[r for r in proof['verified_units'] if r['source_instance_id']==source]
    if card not in ('G-air-hockey','G-baseball-batting','G-asteroids-classic','G-beach-volley'):
     self.assertTrue(any(r['activation_allowed'] for r in own),card)
    # Changing a real target while preserving flags must fail independently.
    rows=[r for r in inv['enumeration_units'] if r['source_instance_id']==source and r['target_instance_ids']]
    if rows and card not in ('G-air-hockey','G-baseball-batting'):
     bad=copy.deepcopy(inv);row=next(r for r in bad['enumeration_units'] if r['enumeration_unit_id']==rows[0]['enumeration_unit_id']);row['target_instance_ids']=['missing'];repair(bad)
     self.assertFalse(api.audit_normal(e,events,bad)['hand_predicates_verified'],card)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_source_drift_and_entry_binding(self):
  self.assertIsNotNone(api)
  from test_proxy_population_loss_reward import fixture
  def run(forced):
   e,actor,source,events=fixture();inv=candidates.audit(e,events)
   with patch.dict(api.SOURCES,{'91-event-21-card-text-draft.md':'0'*64}):self.assertFalse(api.audit_normal(e,events,inv)['hand_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',3)
  normal=[s for s in r['runtime']['steps'] if s.get('normal_core_predicates')]
  self.assertTrue(normal)
  for step in normal:self.assertTrue(step['normal_hand_predicates']['hand_predicates_verified'])

if __name__=='__main__':unittest.main()
