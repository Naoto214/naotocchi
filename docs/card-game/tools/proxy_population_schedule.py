"""Read-only fixed-order scheduling from source-reconstructed retained attempts.

Position is not execution permission. All eligibility/lock/approval gates stay
in the existing admission contract. No callback, process, entropy or games.
"""
import copy,hashlib
import proxy_population_admission as admission
from proxy_mandatory_policy_contract import canonical


def assess(bundle,attempts):
 report=admission.audit_population(bundle,attempts);blockers=[];position=0;blocked=None;counts={}
 rows=report['matches'];indexed={r['id']:r for r in rows};order=bundle.get('execution_order',[])
 if not report['manifest_structure_verified']:blockers.append('manifest_structure_unverified')
 if report['unplanned_attempt_indices']:blockers.append('unplanned_attempts')
 if not blockers:
  for attempt in attempts:
   mid=attempt.get('binding',{}).get('match_id')
   if position>=len(order) or mid!=order[position]:blockers.append('attempt_order_differs');blocked=order[position] if position<len(order) else None;break
   counts[mid]=counts.get(mid,0)+1
   child=indexed[mid]['children'][counts[mid]-1];gates={g['name']:g['state'] for g in child['gates']}
   if gates.get('source_reconstruction')!='verified':blockers.append('attempt_source_unverified');blocked=mid;break
   if gates.get('completed')=='verified':position+=1
  for row in rows:
   if any(not reason.startswith('authenticated_116:') for reason in row['exclusions']):
    blockers.append('attempt_integrity_or_edition_conflict');blocked=row['id']
 if not blockers and position<len(order) and indexed[order[position]]['attempt_count']:
  blockers.append('current_planned_row_incomplete');blocked=order[position]
 next_row=order[position] if not blockers and position<len(order) else None
 return dict(schema='fixed_population_schedule_position.v1',supplied_bundle_sha256=hashlib.sha256(canonical(bundle)).hexdigest(),
  planned_counts=copy.deepcopy(report['planned_counts']),planned_rows=[dict(match_id=r['id'],execution_status=r['execution_status'],disposition=r['disposition'],attempt_count=r['attempt_count'],exclusions=copy.deepcopy(r['exclusions']),gaps=copy.deepcopy(r['gaps'])) for r in rows],
  planned_groups=[dict(group_id=g['id'],disposition=g['disposition'],match_ids=[m['id'] for m in g['children']],exclusions=copy.deepcopy(g['exclusions']),gaps=copy.deepcopy(g['gaps'])) for g in report['groups']],
  unresolved_planned_slots=report['unresolved_planned_slots'],manifest_errors=copy.deepcopy(report['manifest_errors']),
  execution_order=copy.deepcopy(order),retained_attempt_count=len(attempts),completed_prefix_count=position,
  next_planned_row=next_row,blocked_match_id=blocked,blockers=list(dict.fromkeys(blockers)),
  schedule_exhausted=not blockers and position==400,automatic_retry_allowed=False,
  additional_independent_samples_from_retries=0,whole_set=copy.deepcopy(report['whole_set']),
  ready_for_execution=False,input_lock_verified=False,external_approval_verified=False,policy_promoted=False,
  scope='conditional_schedule_position_only_not_execution_or_admission_permission')
