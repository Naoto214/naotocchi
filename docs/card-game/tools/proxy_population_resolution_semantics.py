"""Join source-specific full-delta audits to every supplied actual resolution.

These are locally produced audit outputs, not authenticated certificates. The
connected entry computes them; callers cannot promote a standalone forged flag
into independent source/activation/whole-rule or experiment admission evidence.
"""
import hashlib
import proxy_continuation_state as state
import proxy_population_resolution_order as order
from proxy_mandatory_policy_contract import canonical

FAMILIES={
 'return_effect_audits':'supplied_return_resolution_verified',
 'draw_effect_audits':'supplied_draw_resolution_verified',
 'zone_effect_audits':'supplied_zone_resolution_verified',
 'typed_resolution_audits':'supplied_typed_resolution_verified',
 'reveal_effect_audits':'supplied_reveal_resolution_verified',
 'immediate_growth_audits':'supplied_growth_resolution_verified',
 'partner_suppression_audits':'supplied_suppression_verified',
 'quick_reveal_audits':'supplied_quick_reveal_verified',
 'first_date_audits':'supplied_first_date_verified',
 'equipment_effect_audits':'supplied_archery_verified',
 'quick_recovery_effect_audits':'supplied_quick_recovery_verified'}

def event_digest(event):
 return hashlib.sha256(canonical({k:v for k,v in event.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')})).hexdigest()

def audit(record):
 errors=[];required={};matched={};rows=[]
 try:
  runtime=record['runtime'];before=runtime['source_envelope'];flattened=[]
  for step in runtime['steps']:
   if canonical(before)!=canonical(step['source_envelope']):raise ValueError('semantic join source discontinuity')
   proof=order.audit(step)
   if proof['errors']:raise ValueError('semantic join order differs: '+str(proof['errors']))
   if len(step['events'])!=len(step['envelopes']):raise ValueError('semantic join event coverage differs')
   for event,after in zip(step['events'],step['envelopes']):
    resolves=event['action_type'].startswith('resolve')
    if resolves!=proof['applicable']:raise ValueError('semantic join unproved resolution boundary')
    if resolves:
     key=(state.canonical_sha256(before),state.canonical_sha256(after),event_digest(event))
     if key in required:raise ValueError('duplicate actual resolution')
     top=before['legacy_continuation']['activation_zone'][-1]
     required[key]=dict(event_seq=event['seq'],card_id=top['card_id'],source_instance_id=top['source_instance_id'],chain_link_id=top['link_id'])
    before=after;flattened.append(event)
   if canonical(before)!=canonical(step['final_envelope']):raise ValueError('semantic join step final differs')
  if canonical(before)!=canonical(runtime['final_envelope']) or canonical(flattened)!=canonical(runtime['events']):raise ValueError('semantic join final trace differs')
  coverage=runtime['supported_trigger_coverage'];groups=[(name,flag,coverage[name]) for name,flag in FAMILIES.items()]
  groups.append(('designated_effect_audits','supplied_designated_effect_verified',record['mandatory_opportunity_audit']['designated_effect_audits']))
  for name,flag,outputs in groups:
   seen=set()
   if type(outputs) is not list:raise ValueError('semantic audit output list differs')
   for output in outputs:
    if output['errors']:raise ValueError('failed semantic audit supplied')
    if output['applicable'] is False:continue
    if output['applicable'] is not True or output[flag] is not True:raise ValueError('semantic audit verification absent')
    key=tuple(output[field] for field in ('before_envelope_sha256','after_envelope_sha256','event_sha256'))
    if key not in required:raise ValueError('semantic audit not bound to actual resolution')
    if key in seen:raise ValueError('duplicate semantic audit in family')
    seen.add(key);matched.setdefault(key,[]).append(name)
  missing=set(required)-set(matched)
  if missing:raise ValueError('resolution full semantics unproved: '+str([required[key] for key in sorted(missing)]))
  rows=[dict(value,audit_families=matched[key],before_envelope_sha256=key[0],after_envelope_sha256=key[1],event_sha256=key[2]) for key,value in required.items()]
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_resolution_semantics_join.v1',supplied_resolution_semantics_joined=not errors,errors=errors,resolution_count=len(required),resolutions=rows,
  scope='actual_trace_top_link_resolutions_with_local_full_delta_audits',audit_origin_authenticated=False,activation_proven=False,all_handlers_reachable_proven=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
