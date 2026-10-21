"""Bind a supplied group activation record to its real transition and ledger.

This is not occurrence authentication or a new policy/ledger implementation.
"""
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical

def bind(before,after,event,record):
 if type(record) is not dict or canonical(record['before_envelope'])!=canonical(before) or canonical(record['after_envelope'])!=canonical(after) or len(record['events'])!=1 or event_digest(record['events'][0])!=event_digest(event):raise ValueError('group activation execution record differs')
 prior=record['before_ledger'];inv=record['inventory'];chosen=record['chosen'];sequential.audit_ledger(prior);group=ledger.offer(prior)
 if group is None or chosen['action']!='activate' or any(inv[k]!=group[k] for k in ('actor','category','group_rank')) or inv['actor']!=event['actor']:raise ValueError('group activation offered group differs')
 for row in inv['ineligible_occurrences']:
  if row['occurrence_id'] not in group['actions'] or group['actions'][row['occurrence_id']]['action']!='activate' or row['proof']['current_envelope_sha256']!=state.canonical_sha256(before):raise ValueError('group activation ineligible binding differs')
 effective=sequential._mark_ineligible(prior,inv['ineligible_occurrences']);offered=ledger.offer(effective)
 if canonical(effective)!=canonical(inv['effective_ledger']) or offered is None or any(offered[k]!=group[k] for k in ('actor','category','group_rank')) or chosen['occurrence_id'] not in offered['actions'] or offered['actions'][chosen['occurrence_id']]['action']!='activate':raise ValueError('group activation effective occurrence differs')
 if canonical(chosen) not in [canonical(r) for r in inv['legal_candidate_details']] or canonical(chosen).decode() not in inv['legal_candidate_ids']:raise ValueError('group activation chosen absent from inventory')
 decision=record['decision'];automatic=inv['category']=='forced' and len(inv['legal_candidate_details'])==1
 if automatic:
  if decision is not None:raise ValueError('forced singleton group has a decision')
 elif type(decision) is not dict or canonical(decision['selected_action']['option'])!=canonical(chosen) or decision['selected_candidate']!=canonical(chosen).decode() or decision['selected_action']['candidate_id']!=decision['selected_candidate']:raise ValueError('group activation decision differs')
 if canonical(ledger.consume(effective,chosen['occurrence_id']))!=canonical(record['after_ledger']):raise ValueError('group activation consumption differs')
 occurrence=prior['occurrences'][chosen['occurrence_id']]['occurrence'];action=chosen['activation']
 if occurrence['actor']!=event['actor'] or occurrence['source_instance_id']!=event['source_instance_id'] or occurrence['origin_event_seq']!=event['trigger_origin_event_seq'] or occurrence['source_reference']!=event['source_reference'] or action['source_instance_id']!=event['source_instance_id'] or action['candidate_id']!=event['selected_candidate'] or canonical(action['target_instance_ids'])!=canonical(event['target_instance_ids']):raise ValueError('group activation action/occurrence receipt differs')
 return action,occurrence
