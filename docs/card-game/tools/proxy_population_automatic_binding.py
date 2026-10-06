"""Bind native forced output to exported transitions and subchoices.

This is a structural cross-audit, not a proof of dispatch predicates, effect
semantics, complete judgment opportunities, or initial-input authenticity.
"""
import hashlib
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
from proxy_population_decision_binding import equal,audit_transitions
from proxy_population_runtime import BIND_KEYS
from proxy_mandatory_policy_contract import canonical


def audit_step(step):
 errors=[];identity=None
 try:
  before=step['source_envelope'];state.validate(before);c=state.current(before);g=c['game_state'];ctx=c['response_context']
  if step['decision'] is not None:raise ValueError('automatic step has ordinary decision')
  if g['phase'] in ('normal_action','completed') or (g['phase'] in ('response_window','post_placement_response','turn_end_response') and ctx['chain_status']!='resolving' and not c['pending_triggers']):raise ValueError('not an automatic entry')
  f=step['forced_record']
  if type(f) is not dict:raise ValueError('native automatic output absent')
  audit_transitions(step)
  raw=lambda events:[{k:v for k,v in e.items() if k not in BIND_KEYS} for e in events]
  equal(raw(f['new_events']),raw(step['events']),'native automatic event projection differs')
  equal(f['new_snapshots'],step['snapshots'],'native automatic snapshots differ')
  equal(f.get('new_decisions',[]),step['mandatory_decisions'],'native automatic choice projection differs')
  expected=f.get('new_envelopes',[])
  if not expected:
   expected=[];prior=before
   for shot in f['new_snapshots']:
    prior=state.advance(prior,shot['continuation_state'],shot['event_seq']);expected.append(prior)
  equal(expected,step['envelopes'],'native automatic envelopes differ')
  final=state.current(step['final_envelope'])
  equal(f['final_continuation_state'],old.start._payload(final),'native automatic final state differs')
  if type(f['last_valid_event_seq']) is not int:raise ValueError('native final sequence type differs')
  equal(f['last_valid_event_seq'],step['final_envelope']['event_seq'],'native final sequence differs')
  for field,expected in (('final_game_state_sha256',old.start.opening._stop_state_sha256(final['game_state'])),('final_continuation_state_sha256',old.start._hash(final))):
   if field in f:equal(f[field],expected,'native final hash differs')
  if 'completed' in f and type(f['completed']) is not bool:raise ValueError('native completion type differs')
  completed=f.get('completed',False)
  if completed:
   if final['game_state']['phase']!='completed':raise ValueError('completion outside terminal phase')
   equal(f['result'],step['result'],'native completion result differs')
   equal(step['events'][-1]['result'],step['result'],'terminal event result differs')
  elif step['result'] is not None or final['game_state']['phase']=='completed':raise ValueError('unbound completion result')
  identity=dict(entry_envelope_sha256=state.state_hash(before),native_output_sha256=hashlib.sha256(canonical(f)).hexdigest(),event_count=len(step['events']),mandatory_decision_count=len(step['mandatory_decisions']),completed=completed)
 except (ValueError,KeyError,TypeError,IndexError) as error:errors.append(str(error))
 return dict(schema='automatic_output_transition_binding.v1',automatic_output_binding_verified=not errors,errors=errors,identity=identity,
  effect_semantics_proven=False,dispatch_predicates_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
