"""Conditional public histories; not independently generated population games."""
import copy,unittest
from unittest.mock import patch
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_batch as batch
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
try:import proxy_population_public_turn as api
except ImportError:api=None

def fixture():
 e=case();c=e['legacy_continuation'];g=c['game_state'];g['turn_player']='B'
 c['activation_zone']=[];c['pending_triggers']=[];c['response_context'].update(turn_player='B',priority_actor='A',chain_links=[],chain_status='empty',consecutive_passes=0,origin_event_seq=7)
 e['event_seq']=7;source=g['players']['A']['board']['world']
 assert g['cards'][source]['card_id']=='W-city'
 # A's preceding turn and its prior activation must not count in B's turn.
 events=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item'),dict(seq=3,actor='A',action_type='use_event'),dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=source),dict(seq=5,actor='B',action_type='turn_start_and_normal_draw'),dict(seq=6,actor='A',action_type='use_item'),dict(seq=7,actor='A',action_type='use_event')]
 return e,source,events

class PublicTurnTests(unittest.TestCase):
 def test_opponent_turn_second_card_and_usage_reset(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,events=fixture();c=state.current(e)
   with api.scope():
    self.assertEqual(batch.turn_card_count(c['game_state'],events,'A'),2)
    rows,proof=triggers.board_candidates(c,events,source,'world',e['runtime'])
    self.assertEqual(len(rows),1);self.assertFalse(triggers._used(c,events,source,'W-city'))
    import proxy_population_trigger_existing as existing
    actual=existing.ExistingAdapter(events).proof(e,7)
    self.assertEqual([r['origin_event_seq'] for r in actual['occurrences'] if r['source_instance_id']==source],[7])
    after,generated=existing.ExistingAdapter(events).activate(e,rows[0],next(r for r in actual['occurrences'] if r['source_instance_id']==source))
    history=events+[{k:v for k,v in generated[0].items() if k not in runtime.BIND_KEYS}]
    now=state.current(after);now['response_context']['priority_actor']='A'
    self.assertTrue(triggers._used(now,history,source,'W-city'))
    self.assertEqual(triggers.board_candidates(now,history,source,'world',after['runtime'])[0],[])
    # Reuse the designated look callback on the non-turn owner's effect.
    from proxy_population_policy_bridge import Session,handler_scope
    session=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32})
    session.turn_start('A','prior');session.turn_start('B','current')
    resolving=copy.deepcopy(after);resolving['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
    with handler_scope(session):step=runtime._step(resolving,initial(),history,[],[resolving],forced,session)
    choice=step['mandatory_decisions'][0]
    self.assertTrue(choice['strategic_unproven']);self.assertIn('local_policy_evidence',choice)
    self.assertEqual(step['events'][0]['actor'],'A')
    self.assertEqual(step['final_envelope']['legacy_continuation']['game_state']['turn_player'],'B')

   return {}
  runtime.operation(initial(),run)
 def test_occurrence_anchor_and_non_card_activations(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,events=fixture();c=state.current(e)
   with api.scope():
    for end in (6,):
     c['response_context']['origin_event_seq']=end
     self.assertEqual(triggers.board_candidates(c,events[:end],source,'world',e['runtime'])[0],[])
    c['response_context']['origin_event_seq']=8
    self.assertEqual(triggers.board_candidates(c,events+[dict(seq=8,actor='A',action_type='use_play')],source,'world',e['runtime'])[0],[])
    c['response_context']['origin_event_seq']=6
    later=events+[dict(seq=8,actor='B',action_type='response_pass')]
    rows,_=triggers.board_candidates(c,later,source,'world',e['runtime'])
    self.assertEqual(rows[0]['trigger_origin_event_seq'],7)
    self.assertEqual(batch.turn_card_count(c['game_state'],events+[dict(seq=8,actor='A',action_type='activate_response',source_zone='board')],'A'),2)
   return {}
  runtime.operation(initial(),run)
 def test_missing_current_turn_boundary_is_not_zero(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,events=fixture();c=state.current(e);original=(batch.turn_card_count,triggers.board_candidates,triggers._used)
   with self.assertRaises(ValueError):
    with api.scope():batch.turn_card_count(c['game_state'],events[5:],'A')
   self.assertEqual(original,(batch.turn_card_count,triggers.board_candidates,triggers._used))
   with self.assertRaises(ValueError):
    with api.scope():batch.turn_card_count(c['game_state'],events[:4],'A')
   return {}
  runtime.operation(initial(),run)
class ConnectedPublicTurnTests(unittest.TestCase):
 def test_connected_scope_uses_current_turn_for_both_owners(self):
  import proxy_population_challenge_window as connected
  def run(forced):
   e,source,events=fixture();current=state.current(e)
   self.assertEqual(batch.turn_card_count(current['game_state'],events,'A'),2)
   self.assertEqual(len(triggers.board_candidates(current,events,source,'world',e['runtime'])[0]),1)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
 def test_turn_switch_prefix_and_source_drift_are_explicit(self):
  def run(forced):
   e,source,events=fixture();g=e['legacy_continuation']['game_state'];g['phase']='turn_start'
   prefix=events[:4]+[dict(seq=5,actor='A',action_type='turn_end_completed')]
   with api.scope():
    self.assertEqual(batch.turn_card_count(g,prefix,'A'),0)
    with self.assertRaises(ValueError):batch.turn_card_count(g,prefix,'A',True)
   with patch.object(api,'SOURCES',dict(api.SOURCES,**{'89-world-13-card-text-draft.md':'0'*64})):
    with self.assertRaises(ValueError):
     with api.scope():pass
   self.assertFalse(api._LOCK.locked());return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
