"""06 supplied trigger decline/ineligible closure changes no game state.

Reuses the existing ledger algebra. Supplied ineligibility judgments and choice
origins are not authenticated by this delta/receipt binding.
"""
import copy,hashlib
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_population_resolution_order as order
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

KINDS=('decline_trigger_group','close_ineligible_triggers')

def audit(before,after,event,record=None):
 errors=[];applicable=event.get('action_type') in KINDS
 try:
  if applicable:
   if hashlib.sha256((ROOT/order.SOURCE).read_bytes()).hexdigest()!=order.SOURCE_SHA:raise ValueError('trigger closure source changed')
   if type(record) is not dict:raise ValueError('trigger closure execution record absent')
   if canonical(record['before_envelope'])!=canonical(before) or canonical(record['after_envelope'])!=canonical(after) or len(record['events'])!=1 or event_digest(record['events'][0])!=event_digest(event):raise ValueError('trigger closure execution record differs')
   c=before['legacy_continuation'];seq=event['seq'];ids=event['occurrence_ids'];inv=record['inventory'];chosen=record['chosen'];prior=record['before_ledger']
   if c['response_context']['chain_status']=='resolving' or type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('trigger closure boundary differs')
   if type(ids) is not list or not ids or any(type(k) is not str for k in ids) or len(ids)!=len(set(ids)):raise ValueError('trigger closure occurrence ids differ')
   sequential.audit_ledger(prior);group=ledger.offer(prior)
   if group is None or group['actor']!=event['actor'] or inv['actor']!=event['actor'] or inv['category']!=group['category'] or inv['group_rank']!=group['group_rank']:raise ValueError('trigger closure offered group differs')
   ineligible=inv['ineligible_occurrences']
   if any(r['occurrence_id'] not in group['actions'] or group['actions'][r['occurrence_id']]['action']!='activate' or r['proof']['current_envelope_sha256']!=state.canonical_sha256(before) for r in ineligible):raise ValueError('trigger closure ineligible record binding differs')
   effective=sequential._mark_ineligible(prior,ineligible)
   if canonical(effective)!=canonical(inv['effective_ledger']):raise ValueError('trigger closure effective ledger differs')
   if event['action_type']=='close_ineligible_triggers':
    expected_chosen=dict(action='close_ineligible',occurrence_ids=[r['occurrence_id'] for r in ineligible])
    if inv['legal_candidate_details'] or inv['legal_candidate_ids'] or record['decision'] is not None or set(expected_chosen['occurrence_ids'])!={key for key,row in group['actions'].items() if row['action']=='activate'}:raise ValueError('ineligible closure retains executable current group')
    final=effective
   else:
    offered=ledger.offer(effective)
    if offered is None or offered['category']!='optional' or offered['decline_candidate_id'] is None:raise ValueError('forced or absent group cannot decline')
    if any(offered[key]!=group[key] for key in ('actor','category','group_rank')) or not any(row['action']=='activate' for row in offered['actions'].values()):raise ValueError('trigger decline skips current group')
    expected_chosen=offered['actions'][offered['decline_candidate_id']]
    if canonical(expected_chosen) not in [canonical(row) for row in inv['legal_candidate_details']]:raise ValueError('decline absent from supplied inventory')
    decision=record['decision']
    if type(decision) is not dict or canonical(decision['selected_action']['option'])!=canonical(expected_chosen) or decision['selected_candidate']!=canonical(expected_chosen).decode() or decision['selected_action']['candidate_id']!=decision['selected_candidate']:raise ValueError('trigger decline decision binding differs')
    final=ledger.consume(effective,offered['decline_candidate_id'])
   if canonical(chosen)!=canonical(expected_chosen) or ids!=expected_chosen['occurrence_ids'] or canonical(final)!=canonical(record['after_ledger']):raise ValueError('trigger closure chosen receipt or final ledger differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq
   if canonical(after)!=canonical(expected):raise ValueError('trigger closure full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_trigger_closure_delta.v1',applicable=applicable,errors=errors,supplied_trigger_closure_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),occurrence_adjudication_proven=False,choice_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
