"""Atomic own companion replacement under01/93; no choice or value policy."""
import copy,hashlib
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_actions as actions


def replace_companion(envelope,action,history):
 from proxy_population_instance_boundary import require_initial_entry
 require_initial_entry(action,history or [])
 # Reuse current complete legality and source classification, not card/copy patches.
 proof=batch.outcome(envelope,action,history)
 game,owner=batch.ready(envelope,action,history);actor=game['turn_player'];board=owner['board'];targets=action['target_instance_ids']
 if action['action_type']!='place_companion' or len(board['companions'])!=3 or owner['person_placed'] or len(targets)!=1 or targets[0] not in board['companions']:raise ValueError('full replacement preconditions differ')
 source=action['source_instance_id'];target=targets[0]
 if source not in owner['hand']:raise ValueError('incoming source absent')
 raw=(rules.ROOT/'01-core-rules.md').read_bytes()
 if hashlib.sha256(raw).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA:raise ValueError('atomic departure canonical source changed')
 # Existing current107 companion mechanisms have no departure/arrival trigger.
 # Future capabilities must supply their own obligation proof, not assume zero.
 capabilities=[]
 for person in (target,source):
  cap=batch.classification(game['cards'][person]['card_id'])
  if cap.get('arrival_trigger') is not False or cap['timing'] not in ('none','own_turn','world_conditional','own_turn_start','after_own_quick_on_opponent_turn'):raise ValueError('companion departure/arrival obligations unproved')
  capabilities.append(cap)
 attached=[]
 for item,row in envelope['runtime']['attachments'].items():
  if row['target_instance_id']!=target:continue
  card=game['cards'][item]['card_id'];cap=batch.classification(card) if card in batch.CAPABILITIES else rules.classification(card)
  if cap['timing']=='companion_departure':
   body,_=rules.source_section(cap['reference'])
   if '自分による交代・コスト支払い・山札への移動を防がない' not in body:raise ValueError('own replacement equipment boundary unproved')
  elif cap['timing'] not in ('own_turn_start','own_turn_end'):raise ValueError('equipment departure obligations unproved')
  attached.append(item)
 after=state.detach_target(envelope,target);g=after['legacy_continuation']['game_state'];p=g['players'][actor]
 p['board']['companions'].remove(target);p['discard'].append(target);p['hand'].remove(source);p['board']['companions'].append(source);p['person_placed']=True
 for key in ('stat_effects','conditional_effects'):
  if key in after['runtime']:after['runtime'][key]=[r for r in after['runtime'][key] if r['target_instance_id']!=target]
 after['event_seq']+=1;actions._placement_window(after,actor);after['legacy_continuation']['return_target']='normal_action_opportunity';state.validate(after)
 event=batch._event(envelope,after,action,proof,'person_placement')
 event.update(replaced_instance_id=target,discarded_equipment_instance_ids=sorted(attached),departure_source_reference='01-core-rules.md',departure_source_sha256=batch.RELATIONSHIP_SOURCE_SHA)
 return dict(envelope=after,events=[event],capability_evidence=capabilities,safe_free_development=False,policy_eligible=None,balance_admitted=None)

from contextlib import contextmanager
from proxy_mandatory_policy_contract import canonical
import proxy_continuation_candidates as candidates
import proxy_continuation_end as end
import proxy_normal_decision_hardening as priority
import proxy_normal_decision_fallback_contract as fallback

@contextmanager
def scope():
 """Opt-in shared movement + bounded existing116pure fallback connection.

 Broader normal inventories keep all older contracts/guards. This is not safe
 free development, strategic proof, or admission. No414/A policy is installed.
 """
 prior_select=candidates.select;prior_apply=actions.apply;prior_transition=batch.transition;prior_runtime=end.RUNTIME_TRANSITION_VERIFIER
 def is_replacement(envelope,action):
  return action.get('action_type')=='place_companion' and len(envelope['legacy_continuation']['game_state']['players'][envelope['legacy_continuation']['game_state']['turn_player']]['board']['companions'])==3
 def transition(envelope,action,history=None):
  if not is_replacement(envelope,action):return prior_transition(envelope,action,history)
  r=replace_companion(envelope,action,history);return r['envelope'],r['events']
 def select(envelope,inventory,context,policy,inputs=None):
  details=inventory['legal_candidate_details']
  replacements=[a for a in details if is_replacement(envelope,a)]
  if policy!='legacy_107_114_116' or not replacements:return prior_select(envelope,inventory,context,policy,inputs)
  if canonical(candidates.audit(envelope,inventory['public_history']))!=canonical(inventory):raise ValueError('replacement complete inventory differs')
  for a in replacements:replace_companion(envelope,a,inventory['public_history'])
  return select_verified_zero_immediate(envelope,inventory,context,policy,replacements,'own_companion_replacement_470',batch.RELATIONSHIP_SOURCE_SHA)
 def apply(envelope,record,inputs):
  action=record.get('selected_action',{})
  if not is_replacement(envelope,action):return prior_apply(envelope,record,inputs)
  rebuilt=candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
  if canonical(rebuilt)!=canonical(record):raise ValueError('replacement decision changed')
  return transition(envelope,action,inputs.get('public_events'))
 def verify(before,after,event,history=None):
  if event.get('action_type')=='person_placement' and 'replaced_instance_id' in event:
   try:
    inv=candidates.audit(before,history or []);action=next(a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate'])
    expected,events=transition(before,action,history);raw={k:v for k,v in events[0].items() if k not in end.BIND_KEYS}
    return canonical(expected)==canonical(after) and canonical(raw)==canonical(event)
   except (ValueError,KeyError,StopIteration,TypeError):return False
  return prior_runtime(before,after,event,history) if prior_runtime else False
 try:
  candidates.select=select;actions.apply=apply;batch.transition=transition;end.RUNTIME_TRANSITION_VERIFIER=verify
  yield
 finally:candidates.select=prior_select;actions.apply=prior_apply;batch.transition=prior_transition;end.RUNTIME_TRANSITION_VERIFIER=prior_runtime

def select_verified_zero_immediate(envelope,inventory,context,policy,proved_actions,contract,source_sha256):
 """Shared literal114 upper proof then116; callers prove each atomic action."""
 details=inventory['legal_candidate_details']
 game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];ids=inventory['legal_candidate_ids']
 if context['actor']!=actor or context['round']!=game['round'] or context['phase']!='normal_action':raise ValueError('replacement choice context')

 # Current107 source-bound atomic changes have no immediate growth/time change;
 # batch.ready already holds >=100/reservations/pending effects. Resource value
 # remains absent/unproved, never equal. No consumption/tie-break is consulted.
 delegated=copy.deepcopy(inventory);delegated['legal_candidate_details']=[a for a in details if a not in proved_actions]
 existing,certificates=candidates._scores(envelope,delegated)
 rows=existing+[dict(candidate_id=a['candidate_id'],avoid_loss_or_abort=0,maintain_or_prevent_100=0,certain_growth_difference=0,time_after_certain_resolution=game['players'][actor]['time']) for a in proved_actions]
 upper=lambda row:tuple(row[k] for k in priority.PRIORITY_ORDER[:4])
 best=max(upper(row) for row in rows);top=[row for row in rows if upper(row)==best]
 frontier=sorted(row['candidate_id'] for row in top)
 permitted={a['candidate_id'] for a in proved_actions}|{'pass'}
 if len(frontier)==1:
  chosen=frontier[0];choice=dict(selected_candidate=chosen,resolution_mode='priority_unique',strategic_unresolved=False,reason_code='existing_114_upper_priority_unique')
 else:
  if not set(frontier)<=permitted:raise ValueError('mixed resource comparison remains unproved')
  if any(priority.compare_candidates(a,b)['winner']!='unresolved' for a in top for b in top if a is not b):raise ValueError('pure incomparable premise differs')
  seed=fallback.build_seed_proof(context,frontier);chosen=seed['selected_candidate']
  choice=dict(decision_kind='normal_action',resolution_mode='seeded_fallback',strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',legal_candidates=copy.deepcopy(ids),seeded_fallback_candidates=copy.deepcopy(frontier),candidate_set_complete=True,candidate_set_evidence=dict(source_ref='01-core-rules.md',state_ref=inventory['view_sha256'],enumeration_rule='complete current canonical inventory; verified zero-immediate transition or pass'),seed_context=copy.deepcopy(context),seed_proof=seed,selected_candidate=chosen,runner_up_candidates=[i for i in frontier if i!=chosen])
  errors=fallback.validate_seeded_resolution(choice)
  if errors:raise ValueError(str(errors))
 return dict(policy_id=policy,selected_candidate=chosen,choice=choice,selected_action=copy.deepcopy(next(a for a in details if a['candidate_id']==chosen)),candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(context),execution_evidence=dict(contract=contract,source_sha256=source_sha256,verified_immediate_candidates=[a['candidate_id'] for a in proved_actions],upper_priority_exclusions=[dict(candidate_id=row['candidate_id'],comparison=priority.compare_candidates(top[0],row)) for row in rows if upper(row)<best],strategic_resource_comparison='unproved'))
