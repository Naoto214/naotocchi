"""Concealed-preparation response after a paid-draw main activation (group-032-B-first shape)."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_paid_draw as paid
import proxy_population_concealed_origin as api
import proxy_continuation_preparation as preparation
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_end as end


def raw(event):
 return {k:v for k,v in event.items() if k not in end.BIND_KEYS}


def activated():
 """A activates M-antlion-02 paying its own face-down card while B keeps a face-down preparation."""
 e,s,costs=fixture('M-antlion-02');g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
 b=g['players']['B'];hidden=next(x for x in b['hand']+b['deck'] if g['cards'][x]['card_id']=='I-poop1')
 for zone in ('hand','deck'):
  if hidden in b[zone]:b[zone].remove(hidden)
 b['board']['prepared'].append(hidden);e['runtime']['public_prepared'][hidden]=dict(controller='B',face_up=False,paid_time=1,placed_event_seq=1);state.validate(e)
 history=[dict(seq=1,actor='B',action_type='set_item',fixture_only=True),dict(seq=2,actor='A',action_type='turn_start_and_normal_draw',fixture_only=True)]
 with paid.scope():
  action=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']=='activate_main_ability');after,events=paid.activate_normal(e,action,history)
 return after,history+[raw(events[0])],hidden


def delegate(envelope,initial,events):
 return dict(seen_prepared={o:list(p['board']['prepared']) for o,p in envelope['legacy_continuation']['game_state']['players'].items()},last_event=events[-1]['seq'])


class ConcealedOriginTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  base.operation(initial(),run)

 def test_paid_draw_origin_runs_the_frozen_projection(self):
  def run():
   after,history,hidden=activated()
   self.assertEqual(history[-1]['action_type'],'activate_main_ability')
   with self.assertRaises(ValueError):preparation.response_inventory(after,initial(),history,delegate)
   with api.scope():result=preparation.response_inventory(after,initial(),history,delegate)
   self.assertNotIn(hidden,result['seen_prepared']['B']);self.assertEqual(result['concealed_origin_proof']['card_id'],'M-antlion-02')
   self.assertEqual([r['reason'] for r in result['preparation_exclusions']],['public_origin_has_no_opponent_main_removal_activation'])
   self.assertNotIn('source_instance_id',result['preparation_exclusions'][0])
  self.run_case(run)

 def test_projection_equals_the_frozen_function_for_a_listed_origin(self):
  def run():
   after,history,hidden=activated();listed=copy.deepcopy(history);listed[-1]['action_type']='use_item'
   self.assertEqual(api.projected(after,initial(),listed,delegate),preparation.response_inventory(after,initial(),listed,delegate))
  self.run_case(run)

 def test_other_origins_forged_links_and_changed_text_fail_closed(self):
  def run():
   after,history,hidden=activated()
   with api.scope():
    other=copy.deepcopy(history);other[-1]['action_type']='activate_companion_ability'
    with self.assertRaises(ValueError):preparation.response_inventory(after,initial(),other,delegate)
    forged=copy.deepcopy(after);forged['legacy_continuation']['activation_zone'][-1]['card_id']='M-antlion-03'
    with self.assertRaises(ValueError):preparation.response_inventory(forged,initial(),history,delegate)
    with patch.dict(api.ORIGINS,{'M-antlion-02':('activate_main_ability','0'*64)}):
     with self.assertRaises(ValueError):preparation.response_inventory(after,initial(),history,delegate)
   native=preparation.response_inventory
   with api.scope():pass
   self.assertIs(preparation.response_inventory,native)
  self.run_case(run)


if __name__=='__main__':unittest.main()


def with_bond(after):
 """A's companion wearing a face-up I-bond1 (group-023-B-first board at 188)."""
 e=copy.deepcopy(after);g=e['legacy_continuation']['game_state'];p=g['players']['A']
 pick=lambda card:next(x for x in p['hand']+p['deck'] if g['cards'][x]['card_id']==card)
 companion=pick('C-box');bond=pick('I-bond1')
 for x in (companion,bond):
  for zone in ('hand','deck'):
   if x in p[zone]:p[zone].remove(x)
 p['board']['companions'].append(companion);p['board']['prepared'].append(bond)
 e['runtime']['public_prepared'][bond]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=1);e['runtime']['attachments'][bond]=dict(controller='A',target_instance_id=companion,attached_event_seq=1)
 state.validate(e);return e,bond


class ReplacementOriginTests(unittest.TestCase):
 def test_bond_replacement_is_classified_for_the_paid_draw_origin(self):
  import proxy_continuation_actions as actions
  def run():
   after,history,hidden=activated();e,bond=with_bond(after)
   with preparation.scope():
    with self.assertRaises(ValueError):actions.PREPARED_REACTION_CLASSIFIER(e,'A',bond,history)
    with api.scope():
     row=actions.PREPARED_REACTION_CLASSIFIER(e,'A',bond,history)
     self.assertEqual((row['source_instance_id'],row['reason']),(bond,'certified_origin_does_not_move_an_opponent_companion'))
     listed=copy.deepcopy(history);listed[-1]['action_type']='use_item'
     self.assertNotIn('concealed_origin_proof',actions.PREPARED_REACTION_CLASSIFIER(e,'A',bond,listed))
     with patch.object(api,'REPLACEMENT',('I-bond1','0'*64)):
      with self.assertRaises(ValueError):actions.PREPARED_REACTION_CLASSIFIER(e,'A',bond,history)
    native=actions.PREPARED_REACTION_CLASSIFIER
   self.assertIsNot(native,None)
  def wrapped(forced):run();return {}
  base.operation(initial(),wrapped)


class ConnectedConcealedOriginTests(unittest.TestCase):
 def test_connected_scope_admits_the_paid_draw_origin(self):
  import proxy_population_challenge_window as connected
  def run(forced):
   after,history,hidden=activated()
   result=preparation.response_inventory(after,initial(),history,delegate)
   self.assertEqual(result['concealed_origin_proof']['action_type'],'activate_main_ability')
   return {}
  with connected.contract_scope():base.operation(initial(),run)
