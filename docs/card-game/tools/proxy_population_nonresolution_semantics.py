"""Bind locally computed full-delta audits to actual non-resolution events.

This join is not an authenticated certificate, opportunity closure or admission.
Partial payment/movement evidence cannot replace a full movement state audit.
"""
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical
from proxy_population_resolution_semantics import event_digest

FAMILIES={'main_movement_delta_audits': 'supplied_main_movement_verified', 'world_placement_delta_audits': 'supplied_world_placement_verified', 'person_placement_delta_audits': 'supplied_person_placement_verified', 'prepared_placement_delta_audits': 'supplied_prepared_placement_verified', 'challenge_declaration_delta_audits': 'supplied_challenge_declaration_verified', 'normal_pass_delta_audits': 'supplied_normal_pass_verified', 'response_pass_delta_audits': 'supplied_response_pass_verified', 'trigger_closure_delta_audits': 'supplied_trigger_closure_verified', 'end_window_delta_audits': 'supplied_end_window_verified', 'start_draw_delta_audits': 'supplied_start_draw_verified', 'turn_finish_delta_audits': 'supplied_turn_finish_verified', 'early_finish_delta_audits': 'supplied_early_finish_verified', 'hand_activation_delta_audits': 'supplied_hand_activation_verified', 'paid_activation_delta_audits': 'supplied_paid_activation_verified', 'cat_activation_delta_audits': 'supplied_cat_activation_verified', 'positive_activation_delta_audits': 'supplied_positive_activation_verified', 'board_group_delta_audits': 'supplied_board_group_verified', 'typed_effect_expiry_audits': 'typed_expiry_verified', 'challenge_lifetime_audits': 'supplied_challenge_lifetime_verified', 'payment_consumption_audits': 'supplied_relationship_verified'}

def audit(record):
 errors=[];required={};matched={};rows=[]
 try:
  runtime=record['runtime'];before=runtime['source_envelope'];flattened=[]
  for step in runtime['steps']:
   if canonical(before)!=canonical(step['source_envelope']):raise ValueError('non-resolution source discontinuity')
   if len(step['events'])!=len(step['envelopes']):raise ValueError('non-resolution event coverage differs')
   for event,after in zip(step['events'],step['envelopes']):
    if not event['action_type'].startswith('resolve'):
     key=(state.canonical_sha256(before),state.canonical_sha256(after),event_digest(event))
     if key in required:raise ValueError('duplicate actual non-resolution event')
     required[key]=dict(event_seq=event['seq'],action_type=event['action_type'])
    before=after;flattened.append(event)
   if canonical(before)!=canonical(step['final_envelope']):raise ValueError('non-resolution step final differs')
  if canonical(before)!=canonical(runtime['final_envelope']) or canonical(flattened)!=canonical(runtime['events']):raise ValueError('non-resolution final trace differs')
  coverage=runtime['supported_trigger_coverage'];groups=[(name,flag,coverage[name]) for name,flag in FAMILIES.items()]
  groups.append(('egg_choice_delta_audits','supplied_egg_choice_verified',record['mandatory_opportunity_audit']['egg_choice_delta_audits']))
  for name,flag,outputs in groups:
   seen=set()
   if type(outputs) is not list:raise ValueError('non-resolution audit output list differs')
   for output in outputs:
    if output['errors']:raise ValueError('failed non-resolution audit supplied')
    applicable=output['full_delta_applicable'] if name=='payment_consumption_audits' else output['applicable']
    if applicable is False:continue
    if applicable is not True or output[flag] is not True:raise ValueError('non-resolution full-delta verification absent')
    key=tuple(output[field] for field in ('before_envelope_sha256','after_envelope_sha256','event_sha256'))
    if key not in required:raise ValueError('non-resolution audit not bound to actual event')
    if key in seen:raise ValueError('duplicate non-resolution audit in family')
    seen.add(key);matched.setdefault(key,[]).append(name)
  missing=set(required)-set(matched)
  if missing:raise ValueError('non-resolution full semantics unproved: '+str([required[key] for key in sorted(missing)]))
  rows=[dict(value,audit_families=matched[key],before_envelope_sha256=key[0],after_envelope_sha256=key[1],event_sha256=key[2]) for key,value in required.items()]
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_nonresolution_semantics_join.v1',supplied_nonresolution_semantics_joined=not errors,errors=errors,event_count=len(required),events=rows,
  scope='actual_trace_nonresolution_events_with_local_full_delta_audits',audit_origin_authenticated=False,all_handlers_reachable_proven=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
