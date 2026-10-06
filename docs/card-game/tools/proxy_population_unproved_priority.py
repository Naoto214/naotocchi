"""116 execution of complete legal choices when upper comparison is unproved.

No unknown numeric value is replaced with zero, no dominance or strategic
solution is claimed. This remains legacy116-excluded, never463 policy eligible.
Only specifically identified old upper-priority guards may enter this bridge.
"""
import copy,hashlib,itertools
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import ROOT,canonical
SOURCES={'114-normal-decision-protocol-hardening.md':'aa161063e4fa9e056818d00e3fe799448107b3b51f00c05e67c2c89c3a50e59a','116-normal-decision-fallback-contract.md':'577dccec67343ead75aa813b464b432679927c2f4b71ed960be5058aaa3ef393'}
GUARDS={'upper-priority or pending-effect proof unavailable','batch upper-priority/pending boundary unproved','relationship 100 maintenance boundary requires priority proof','uncertain reveal threshold priority requires proof','world placement upper-priority or pending effects unproved'}
DIRECT_GROWTH_GAP='direct growth comparison operand proof unavailable'
GUARDS.add(DIRECT_GROWTH_GAP)
_LOCK=Lock()


def unresolved(envelope,inventory,context,policy,reason):
 for path,digest in SOURCES.items():
  if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('114/116 source changed')
 state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state']
 if policy!='legacy_107_114_116' or reason not in GUARDS or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or any(p['reservations'] for p in g['players'].values()):raise ValueError('unproved priority is not complete legal execution')
 if context['actor']!=g['turn_player'] or context['round']!=g['round'] or canonical(candidates.audit(envelope,inventory['public_history']))!=canonical(inventory):raise ValueError('unproved priority fresh inventory/context differs')
 # A coverage error unrelated to the public threshold must never be recast.
 if not any(p['growth']==100 for p in g['players'].values()) and reason not in {DIRECT_GROWTH_GAP,'relationship 100 maintenance boundary requires priority proof','uncertain reveal threshold priority requires proof'}:raise ValueError('non-threshold upper comparison remains unproved')
 kinds={'pass','challenge','relationship','play_main','place_world','place_partner','place_companion','attach_item','set_item','use_item','use_play','use_event','activate_main_ability','activate_companion_ability'}
 for action in inventory['legal_candidate_details']:
  if action['action_type'] not in kinds:raise ValueError('continuation action handler unproved')
  if action.get('card_id') is not None:batch.rules.classification(action['card_id'])
 ids=inventory['legal_candidate_ids'];scores={};certificates={};unknown={};pairs=[];excluded=[]
 for action in inventory['legal_candidate_details']:
  subset=dict(inventory,legal_candidate_details=[action]);cid=action['candidate_id']
  try:
   rows,certs=candidates._scores(envelope,subset)
   if len(rows)!=1 or rows[0]['candidate_id']!=cid:raise ValueError('individual native comparison coverage differs')
   scores[cid]=rows[0]
   for cert in certs:
    if fallback.validate_safe_free_placement(cert):raise ValueError('native safe placement proof invalid')
    certificates[cert['candidate_id']]=cert
  except ValueError as error:
   if str(error) not in GUARDS and not str(error).startswith('certain-result proof unavailable: '):raise
   unknown[cid]=str(error)
 for left,right in itertools.combinations(sorted(ids),2):
  if left in unknown or right in unknown:comparison=dict(winner='unresolved',reason='upper_priority_unproved')
  else:
   comparison=priority.compare_candidates(scores[left],scores[right])
   # Apply116's already validated safe-free certificate only after all four
   # earlier priorities are proved equal. Unknown upper values never reach it.
   if 'pass' in (left,right):
    placement=right if left=='pass' else left
    if placement in certificates and all(scores[left][k]==scores[right][k] for k in priority.PRIORITY_ORDER[:4]):comparison=dict(winner='right' if left=='pass' else 'left',reason='existing116_safe_free_development',certificate=copy.deepcopy(certificates[placement]))
  pairs.append(dict(left_id=left,right_id=right,comparison=copy.deepcopy(comparison)))
  if comparison['winner'] in ('left','right'):excluded.append(dict(candidate_id=right if comparison['winner']=='left' else left,dominated_by=left if comparison['winner']=='left' else right,comparison=copy.deepcopy(comparison)))
 frontier=sorted(set(ids)-{row['candidate_id'] for row in excluded})
 if not frontier or len(ids)!=len(set(ids)):raise ValueError('canonical legal frontier coverage differs')
 seed=fallback.build_seed_proof(context,frontier);selected=seed['selected_candidate'];view=inventory['view_sha256']
 choice=dict(decision_kind='normal_action',resolution_mode='seeded_fallback',strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',legal_candidates=copy.deepcopy(ids),seeded_fallback_candidates=frontier,candidate_set_complete=True,candidate_set_evidence=dict(source_ref='116-normal-decision-fallback-contract.md',state_ref=view,enumeration_rule='fresh current107 complete legal inventory; upper comparison remains unproved'),seed_context=copy.deepcopy(context),seed_proof=seed,selected_candidate=selected,runner_up_candidates=[s for s in frontier if s!=selected])
 errors=fallback.validate_seeded_resolution(choice)
 if errors:raise ValueError(str(errors))
 return dict(policy_id=policy,selected_candidate=selected,choice=choice,problem=None,selected_action=copy.deepcopy(next(a for a in inventory['legal_candidate_details'] if a['candidate_id']==selected)),candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(context),execution_evidence=dict(contract='existing116_unproved_upper_comparison.v1',source_sha256=copy.deepcopy(SOURCES),native_comparison_guard=reason,priority_values=None,priority_comparison='unproved',candidate_comparison_evidence=dict(proved_scores=scores,unproved=unknown,pairs=pairs),dominance_exclusions=excluded,strategic_proof=False,policy_eligible=False,balance_admitted=None))


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('unproved priority scope concurrency/reentry forbidden')
 prior=candidates.select;prior_ready=batch.ready;prior_outcome=batch.outcome;prior_event=batch._event
 def legal_ready(envelope,action,history=None):
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state']
  if g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or any(p['reservations'] or type(p['growth']) is not int or not 0<=p['growth']<=100 for p in g['players'].values()):raise ValueError('physical normal entry boundary unproved')
  fresh=candidates.audit(envelope,history or [])
  if canonical(action) not in [canonical(a) for a in fresh['legal_candidate_details']]:raise ValueError('physical action absent from complete current inventory')
  return g,g['players'][g['turn_player']]
 def outcome(envelope,action,history=None):
  if action['action_type']!='relationship':return prior_outcome(envelope,action,history)
  g,p=legal_ready(envelope,action,history);stage=p['board']['partner_stage'];source=p['board']['partner'];requested=10 if stage==3 else 0
  if p['growth']+requested<100:return prior_outcome(envelope,action,history)
  ruling.verify_source()
  if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA:raise ValueError('relationship canonical source changed')
  if not p['board']['main'] or source is None or p['relationship_progressed'] or stage not in (0,1,2,3) or p['time']<1 or action['candidate_variant']!=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]:raise ValueError('relationship operation preconditions differ')
  cap=batch.classification(g['cards'][source]['card_id']);part=application.growth(p['growth'],requested)
  return dict(contract_id='normal_immediate_outcome_v2',actor=g['turn_player'],candidate_id=action['candidate_id'],source_instance_id=source,payment_time=1,certain_growth_difference=part['actual_delta'],source_reference='01-core-rules.md',source_raw_sha256=batch.RELATIONSHIP_SOURCE_SHA,capability=cap,view_sha256=state.canonical_sha256(state.visible(envelope,g['turn_player'])),arrival_execution_certified=False,growth_operation=part)
 def event(before,after,action,proof,kind):
  result=prior_event(before,after,action,proof,kind)
  if 'growth_operation' in proof:result['growth_evidence']=dict(contract='bounded_growth_474.v1',source_sha256=ruling.RULING_SHA,operation=copy.deepcopy(proof['growth_operation']))
  return result
 def comparison_outcome(envelope,action,history=None):
  proof=prior_outcome(envelope,action,history)
  cap=proof.get('capability',{})
  # The native generic branch initializes growth to zero. Direct-growth
  # mechanisms need their own114 comparison proof; effect execution support
  # and a source-classification hash are not that proof. No replacement score.
  if cap.get('kind') in ('symmetric_draw_growth','board_count_growth') or cap.get('timing')=='targeted_relationship_growth':raise ValueError(DIRECT_GROWTH_GAP)
  return proof
 def select(envelope,inventory,context,policy,inputs=None):
  # Physical permission must not be used as proof of a zero upper score.
  active_ready=batch.ready;active_outcome=batch.outcome
  try:
   batch.ready=prior_ready;batch.outcome=comparison_outcome
   return prior(envelope,inventory,context,policy,inputs)
  except ValueError as error:
   if policy!='legacy_107_114_116' or str(error) not in GUARDS:raise
   return unresolved(envelope,inventory,context,policy,str(error))
  finally:batch.ready=active_ready;batch.outcome=active_outcome
 try:candidates.select=select;batch.ready=legal_ready;batch.outcome=outcome;batch._event=event;yield
 finally:candidates.select=prior;batch.ready=prior_ready;batch.outcome=prior_outcome;batch._event=prior_event;_LOCK.release()
