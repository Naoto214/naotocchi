"""Ordinary entry/selection/event binding, not legality or effect semantics.

No arbitrary supplied hash is trusted. Recompute from every actual envelope;
source reconstruction and input authenticity remain separate obligations.
"""
import hashlib
import proxy_continuation_state as state
import proxy_continuation_actions as actions
import proxy_continuation_end as end
import proxy_response_window_contract as response_contract
import proxy_resource_value_trajectory as old
from proxy_mandatory_policy_contract import canonical


def equal(actual,expected,message):
 if canonical(actual)!=canonical(expected):raise ValueError(message)


def audit_transitions(step):
 """Shared canonical transition binding; no effect/legality inference."""
 before=step['source_envelope'];state.validate(before)
 events=step['events'];envelopes=step['envelopes'];shots=step['snapshots']
 if not events or len(events)!=len(envelopes) or len(events)!=len(shots):raise ValueError('transition coverage differs')
 prior=before
 for event,after,shot in zip(events,envelopes,shots):
  state.validate(after)
  if type(event['seq']) is not int or event['seq']!=prior['event_seq']+1 or event['seq']!=after['event_seq']:raise ValueError('transition sequence differs')
  raw={k:v for k,v in event.items() if k not in end.BIND_KEYS}
  equal(event,actions.bind_event(prior,after,raw),'full envelope hash or contract differs')
  for suffix,envelope in (('before',prior),('after',after)):
   current=state.current(envelope)
   equal(event['game_state_'+suffix+'_sha256'],old.start.opening._stop_state_sha256(current['game_state']),'game state hash differs')
   equal(event['continuation_state_'+suffix+'_sha256'],old.start._hash(current),'continuation hash differs')
  equal(shot,old._snapshot(state.current(after)),'snapshot differs');prior=after
 equal(prior,step['final_envelope'],'final envelope differs')

def audit_step(step,order_id):
 errors=[];identity=None;selected=None
 try:
  before=step['source_envelope'];state.validate(before);c=state.current(before);g=c['game_state'];ctx=c['response_context'];d=step['decision']
  if step['forced_record'] is not None:raise ValueError('ordinary decision also has forced record')
  if g['phase']=='normal_action':
   actor=g['turn_player'];dc=d['context']
   expected=dict(actor=actor,order_id=order_id,actor_turn_index=g['round'],round=g['round'],phase=g['phase'],decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
   equal({k:dc[k] for k in expected},expected,'normal entry context differs')
   inventory=d['inventory'];choice=d['choice']
   equal(choice['selected_candidate'],d['selected_candidate'],'normal wrapper choice differs')
   if 'legal_candidates' in choice:equal(choice['legal_candidates'],inventory['legal_candidate_ids'],'normal wrapper candidates differ')
   elif choice.get('resolution_mode')!='priority_unique':raise ValueError('normal wrapper candidates absent')
   if choice.get('seed_context') is not None:
    #116 safe-free subchoice has its own choice_kind; bind entry coordinates.
    kind='zero_cost_person_placement' if choice.get('pass_dominated_by')=='safe_free_development' and 'selected_placement' in choice else dc['choice_kind']
    equal(choice['seed_context']['choice_kind'],kind,'normal seed subchoice differs')
    for key in ('contract_version','order_id','actor','actor_turn_index','round','phase','decision_kind'):equal(choice['seed_context'][key],dc[key],'normal seed context differs')
  elif g['phase'] in ('response_window','post_placement_response','turn_end_response') and ctx['chain_status'] in ('empty','building') and not c['pending_triggers']:
   actor=ctx['priority_actor'];inventory=d['candidate_set_evidence']
   expected=dict(actor=actor,phase=ctx['phase'],decision_kind='response_action',choice_kind=ctx['choice_kind'],response_opportunity_index=ctx['response_opportunity_index'])
   equal({k:d[k] for k in expected},expected,'response entry context differs')
   equal(inventory['actor'],actor,'response inventory actor differs')
   equal(inventory['response_context'],ctx,'response current window differs')
   for field in ('legal_candidate_ids','legal_candidate_details'):equal(d[field],inventory[field],'response wrapper inventory differs')
   seed=d.get('seed_context')
   if seed is not None:
    wanted=dict(contract_version=response_contract.CONTRACT_VERSION,order_id=order_id,actor=actor,actor_turn_index=g['round'],round=g['round'],origin_event_seq=ctx['origin_event_seq'],response_opportunity_index=ctx['response_opportunity_index'],phase=ctx['phase'],decision_kind=ctx['decision_kind'],choice_kind=ctx['choice_kind'])
    equal(seed,wanted,'response seed identity differs')
  else:raise ValueError('not an ordinary entry')
  selected=d['selected_candidate'];details=inventory['legal_candidate_details'];ids=[a['candidate_id'] for a in details]
  if ids!=sorted(set(ids)) or ids!=inventory['legal_candidate_ids'] or ids.count(selected)!=1:raise ValueError('selection inventory identity differs')
  equal(d['selected_action'],next(a for a in details if a['candidate_id']==selected),'selected detail differs')
  equal(step['events'][0]['selected_candidate'],selected,'first event selection differs');equal(step['events'][0]['actor'],actor,'first event actor differs')
  audit_transitions(step)
  identity=dict(entry_envelope_sha256=state.state_hash(before),event_seq=before['event_seq'],actor=actor,round=g['round'],phase=g['phase'],decision_sha256=hashlib.sha256(canonical(d)).hexdigest(),selected_candidate=selected)
 except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:errors.append(str(error))
 return dict(schema='ordinary_entry_transition_binding.v1',entry_and_transition_binding_verified=not errors,errors=errors,identity=identity,
  complete_legal_set_proven=False,effect_semantics_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def audit_projection(result):
 errors=[];expected=[]
 try:
  for step in result['steps']:
   if step['decision'] is not None:expected.append(step['decision'])
   expected.extend(step['mandatory_decisions'])
  equal(result['decisions'],expected,'exported decision order/count/content differs')
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(schema='step_decision_projection.v1',decision_projection_verified=not errors,errors=errors,decision_count=len(expected),
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
