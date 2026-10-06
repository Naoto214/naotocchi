"""Opt-in116 continuation when existing114 proves a pure upper frontier.

No resource value, threshold proof, paid exclusion, safe-placement ordering or
new comparison relation is supplied here. Historical selectors stay unchanged.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_candidates as candidates
import proxy_normal_decision_hardening as priority
import proxy_normal_decision_fallback_contract as fallback
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('normal frontier scope reentry/concurrency forbidden')
 prior=candidates.select
 def select(envelope,inventory,context,policy,inputs=None):
  try:return prior(envelope,inventory,context,policy,inputs)
  except ValueError as error:
   if policy!='legacy_107_114_116' or str(error)!='legacy fallback contract not applicable':raise
  problem=candidates.problem(envelope,inventory,context,inputs)
  scores,certificates=candidates._scores(envelope,inventory)
  if certificates:raise ValueError('safe placement mixed frontier remains outside pure116 connection')
  keys=priority.PRIORITY_ORDER[:4];vector=lambda row:tuple(row[k] for k in keys)
  best=max(vector(row) for row in scores);top=[row for row in scores if vector(row)==best];lower=[row for row in scores if vector(row)<best]
  if len(top)<2:raise ValueError('pure116 frontier must have multiple incomparable candidates')
  if any(priority.compare_candidates(a,b)['winner']!='unresolved' for a in top for b in top if a is not b):raise ValueError('upper frontier comparison not wholly unresolved')
  if any(priority.compare_candidates(a,b)['winner']!='left' for a in top for b in lower):raise ValueError('upper exclusion lacks existing114 proof')
  frontier=sorted(row['candidate_id'] for row in top);seed=fallback.build_seed_proof(context,frontier);selected=seed['selected_candidate']
  choice=dict(decision_kind='normal_action',resolution_mode='seeded_fallback',strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',legal_candidates=copy.deepcopy(inventory['legal_candidate_ids']),seeded_fallback_candidates=frontier,candidate_set_complete=True,candidate_set_evidence={k:copy.deepcopy(problem['candidate_set_evidence'][k]) for k in ('source_ref','state_ref','enumeration_rule')},seed_context=copy.deepcopy(context),seed_proof=seed,selected_candidate=selected,runner_up_candidates=[s for s in frontier if s!=selected])
  errors=fallback.validate_seeded_resolution(choice)
  if errors:raise ValueError(str(errors))
  return dict(policy_id=policy,selected_candidate=selected,choice=choice,problem=problem,selected_action=copy.deepcopy(next(a for a in inventory['legal_candidate_details'] if a['candidate_id']==selected)),candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(context),execution_evidence=dict(contract='existing_116_pure_upper_frontier.v1',source_references=['114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md'],upper_priority_exclusions=[dict(candidate_id=b['candidate_id'],comparison=priority.compare_candidates(top[0],b)) for b in lower],strategic_resource_comparison='unproved',policy_eligible=False,balance_admitted=None))
 try:candidates.select=select;yield
 finally:candidates.select=prior;_LOCK.release()
