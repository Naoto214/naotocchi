"""Rule-occurrence journal and callback binding for supplied policy material.

This is not input authentication, an experiment dispatcher, or admission proof.
The runtime must register EVERY turn start/resolution, including no-choice ones.
"""
import copy
from proxy_mandatory_policy_contract import canonical
from proxy_mandatory_choice_boundary import prepare,apply_choice
from proxy_mandatory_policy_local import build_local_record


class Session:
 def __init__(self,binding,roots):
  canonical(binding);canonical(roots)
  if type(binding) is not dict or set(binding)!={'protocol_id','group_id','mirror_side'} or binding['mirror_side'] not in ('A_first','B_first') or any(type(x) is not str or not x for x in binding.values()):raise ValueError('policy binding differs')
  if type(roots) is not dict or set(roots)!={'A','B'} or any(type(x) is not str or len(x)!=64 or any(c not in '0123456789abcdef' for c in x) for x in roots.values()):raise ValueError('supplied owner roots differ')
  self.binding=copy.deepcopy(binding);self.roots=copy.deepcopy(roots)
  self.counts={'A':0,'B':0};self.owner=None;self.ordinal=0;self.origins={};self.records={}
 def _key(self,key):
  if type(key) is not str or not key:raise ValueError('occurrence identity absent')
  return key
 def turn_start(self,actor,key):
  self._key(key)
  if actor not in self.counts:raise ValueError('turn owner differs')
  if key in self.origins:
   o=self.origins[key]
   if o['owner']!=actor or o['kind']!='turn_start':raise ValueError('turn origin rebound')
   return copy.deepcopy(o)
  if self.owner==actor:raise ValueError('consecutive own turns without opponent start')
  self.counts[actor]+=1;self.owner=actor;self.ordinal=0
  o=dict(owner=actor,own_turn=self.counts[actor],kind='turn_start',ordinal=0)
  self.origins[key]=o;return copy.deepcopy(o)
 def effect(self,key,turn_owner):
  self._key(key)
  if key in self.origins:
   o=self.origins[key]
   if o['owner']!=turn_owner or o['kind']!='effect_resolution':raise ValueError('effect origin rebound')
   return copy.deepcopy(o)
  if self.owner!=turn_owner or self.owner is None:raise ValueError('resolution outside active turn')
  self.ordinal+=1;o=dict(owner=turn_owner,own_turn=self.counts[turn_owner],kind='effect_resolution',ordinal=self.ordinal)
  self.origins[key]=o;return copy.deepcopy(o)
 def context(self,key,frame):
  if key not in self.origins:raise ValueError('unregistered rule occurrence')
  o=self.origins[key];kind=frame['choice_contract_id']
  expected='turn_start' if kind=='egg_exchange_bottom' else 'effect_resolution'
  if o['kind']!=expected or o['owner']!=frame['game_state']['turn_player']:raise ValueError('rule origin differs')
  return dict(self.binding,owner=frame['actor'],opportunity_address=[o['owner'],o['own_turn'],frame['actor'],o['kind'],o['ordinal'],kind,'selection',0])
 def choose(self,key,frame,choice_game,candidate_ids):
  b=prepare(frame);context=self.context(key,frame)
  if canonical(choice_game)!=canonical(b['choice_game_state']):raise ValueError('actual callback intermediate state differs')
  if type(candidate_ids) is not list or len(candidate_ids)!=len(set(candidate_ids)) or sorted(candidate_ids)!=b['candidate_ids']:raise ValueError('actual callback complete candidates differ')
  local=build_local_record(frame,self.roots[frame['actor']],context)
  identity=canonical([key,frame['actor'],frame['choice_contract_id']])
  payload=canonical(dict(frame=frame,local=local))
  if identity in self.records and self.records[identity]['payload']!=payload:raise ValueError('rule occurrence reused with different choice entry')
  detail=copy.deepcopy(next(d for d in b['candidate_details'] if d['candidate_id']==local['application']['selected_candidate']))
  if 'instance_id' in detail:detail['initial_instance_id']=detail['instance_id']
  record=dict(decision_kind='mandatory_choice',resolution_mode=local['selection_basis'],
   strategic_unproven=local['strategic_unproven'],legal_candidates=b['candidate_ids'],
   legal_candidate_details=b['candidate_details'],selected_candidate=local['application']['selected_candidate'],
   selected_action=detail,local_policy_evidence=local,policy_eligible=None,balance_admitted=None)
  self.records[identity]=dict(payload=payload,record=copy.deepcopy(record))
  return record
 def verify_after(self,key,frame,game):
  b=prepare(frame);self.context(key,frame)
  identity=canonical([key,frame['actor'],frame['choice_contract_id']])
  record=self.records.get(identity)
  if bool(b['candidate_ids'])!=(record is not None):raise ValueError('mandatory callback coverage differs')
  selected=record['record']['selected_candidate'] if record else None
  expected=apply_choice(frame,selected)['local_after_game_state']
  if canonical(game)!=canonical(expected):raise ValueError('actual local application differs')
  return dict(local_application_verified=True,origin_scope='registered_runtime_occurrences',policy_eligible=None,balance_admitted=None)


def occurrence_key(current):
 import hashlib
 import proxy_continuation_triggers as triggers
 return hashlib.sha256(canonical(dict(seq=current['last_event_seq'],continuation=triggers.old.start._payload(current)))).hexdigest()


from contextlib import contextmanager
@contextmanager
def handler_scope(session):
 """Use existing effect handlers; override only the designated choice callbacks.

 Must run inside the serialized population runtime operation. Callback replay
 requires an already registered origin and cannot advance the occurrence ledger.
 """
 import proxy_continuation_triggers as triggers
 import proxy_continuation_quick as quick
 from unittest.mock import patch
 original_board=triggers.resolve;original_final=quick.resolve
 def resolve(current,initial,original,final=False):
  link=current['activation_zone'][-1];card=link['card_id']
  kinds={'M-beetle-01':'ability_hand_bottom','P-cat_ceo':'ability_hand_bottom',
         'I-sleepboost1':'ability_draw_then_hand_bottom','W-city':'ability_topdeck_order',
         'M-beetle-02':'ability_topdeck_order','E-final-time':'final_time_hand_bottom'}
  if card not in kinds:return original(current,initial)
  kind=kinds[card];actor=link['actor'];key=occurrence_key(current)
  f=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id=kind,actor=actor,
         entry='effect_resolution_start',source_instance_id=link['source_instance_id'],
         target_instance_id=link['target_instance_ids'][0] if final else None,
         game_state=copy.deepcopy(current['game_state']))
  session.context(key,f);calls=[]
  def choose(game,who,ids):
   if who!=actor:raise ValueError('mandatory callback actor differs')
   #406's existing adapter changes only the entry phase for its validation.
   game=copy.deepcopy(game)
   if final:game['phase']=f['game_state']['phase']
   r=session.choose(key,f,game,ids);calls.append(r);return r
  def hand(supplied,c,who,sources,choice_kind):
   if choice_kind!=kind or supplied is not initial:raise ValueError('mandatory callback kind/input differs')
   return choose(c['game_state'],who,[c['game_state']['cards'][x]['card_copy_id'] for x in sources])
  def options(supplied,c,who,values,choice_kind,occurrence):
   if choice_kind!=kind or supplied is not initial or occurrence!=link['link_id']:raise ValueError('effect option callback differs')
   return choose(c['game_state'],who,[canonical(x).decode() for x in values])
  def final_hand(row,who,hand,game):
   return choose(game,who,[game['cards'][x]['card_copy_id'] for x in hand])
  with patch.object(triggers,'mandatory_choice',hand),patch.object(triggers.choices,'resolve',options),patch.object(quick.final_time,'hand_bottom_decision',final_hand):
   result=original(current,initial)
  boundary=prepare(f)
  if len(calls)!=(1 if boundary['candidate_ids'] else 0):raise ValueError('effect callback cardinality differs')
  after=copy.deepcopy(result['final_continuation_state']['game_state'])
  # Compare whole local game, accounting only for established chain cleanup.
  after['phase']=f['game_state']['phase']
  if final:
   discard=after['players'][actor]['discard']
   if not discard or discard[-1]!=link['source_instance_id']:raise ValueError('final-time source cleanup differs')
   discard.pop()
  session.verify_after(key,f,after)
  return result
 with patch.object(triggers,'resolve',lambda c,i:resolve(c,i,original_board)),patch.object(quick,'resolve',lambda c,i:resolve(c,i,original_final,True)):
  yield
