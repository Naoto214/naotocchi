"""Reuse465 local operations and468 policy addresses with retained old metadata.

A full-frame binding wraps the unchanged465 active-copy local record. Registry
provenance and actual execution remain separate gates. No policy scope expands.
"""
import copy
from contextlib import contextmanager
import proxy_population_incarnation as life
import proxy_population_policy_bridge as bridge
from proxy_mandatory_choice_boundary import prepare as local_prepare
_ORIGINAL_HANDLER_SCOPE=bridge.handler_scope

class Session(bridge.Session):
 def __init__(self,binding,roots,registry):
  super().__init__(binding,roots);self.registry=registry
 def project(self,frame):
  full=frame['game_state'];record=self.registry(full);projected=life.project_game(record,full)
  located=life.field(full)
  for p in full['players'].values():
   for z in ('hand','deck','discard'):located.extend(p[z])
  if len(located)!=len(set(located)) or any(i not in record['active'].values() for i in located):raise ValueError('inactive or duplicate local physical location')
  # Retired link source/target semantics are not inferred by remapping to the
  # current copy. Current107 field entries occur only with the chain closed.
  for k in ('source_instance_id','target_instance_id'):
   if frame[k] is not None and frame[k] not in projected['cards']:raise ValueError('retired local reference remains outside connected scope')
  result=copy.deepcopy(frame);result['game_state']=projected
  return result,record
 def choose(self,key,frame,choice_game,candidate_ids):
  projected,record=self.project(frame)
  result=super().choose(key,projected,life.project_game(record,choice_game),candidate_ids)
  result['lifecycle_entry_evidence']=dict(contract='retained_metadata_local_projection.v1',full_entry_sha256=life.digest(frame),projected_entry_sha256=life.digest(projected),metadata_sha256=life.digest(record['metadata']),active_mapping_sha256=life.digest(record['active']),origin_authenticated=False,global_transition_verified=False)
  return result
 def verify_after(self,key,frame,after_game):
  projected,record=self.project(frame)
  result=super().verify_after(key,projected,life.project_game(record,after_game))
  # Projection changes only the card-map domain. All other fields, including
  # unchanged old reservation references, still participate in exact equality.
  return dict(result,full_local_after_sha256=life.digest(after_game),retired_metadata_preserved=True)

@contextmanager
def handler_scope(session):
 """The existing handler wrapper also prepares the original full frame once."""
 original=bridge.prepare
 def prepare(frame):
  record=session.registry(frame['game_state'])
  if life.digest(frame['game_state']['cards'])==life.digest(record['metadata']):return local_prepare(session.project(frame)[0])
  if life.digest(frame['game_state']['cards'])==life.digest({s:record['metadata'][s] for s in record['active'].values()}):return local_prepare(frame)
  raise ValueError('local frame metadata outside lifecycle registry')
 try:
  bridge.prepare=prepare
  with _ORIGINAL_HANDLER_SCOPE(session):yield
 finally:bridge.prepare=original
