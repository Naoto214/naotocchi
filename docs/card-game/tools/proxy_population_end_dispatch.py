"""64 end-source opportunity precedes expiry and finishing a supplied turn.

Reuse independent end predicates and actual end-window deltas. A prefix whose
opening lies outside the supplied trace remains unproved, not an empty group.
This neither authenticates history nor closes unknown rule opportunities.
"""
import hashlib
import proxy_continuation_state as state
import proxy_population_end_window_effect as end_window
import proxy_population_trigger_predicates as predicates
import proxy_population_public_turn as public_turn
import proxy_population_start_obligations as starts
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

KINDS=frozenset(('expire_payment_modifiers','turn_end_completed','r10_final_comparison','maintained100_final_comparison'))

def audit(before,history,event,trace):
 errors=[];applicable=event.get('action_type') in KINDS;verified=False;route=None;classified=[];opening=None;unproved=[]
 try:
  if applicable:
   for name,digest in dict(predicates.BOARD_SOURCES,**{end_window.REFERENCE:end_window.SOURCES[end_window.REFERENCE]}).items():
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('end dispatch source changed')
   state.validate(before);c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];ctx=c['response_context']
   if g['phase']!='turn_end' or c['return_target']!='turn_end' or c['activation_zone'] or c['pending_triggers'] or ctx['chain_status']!='empty' or ctx['chain_links'] or ctx['consecutive_passes']!=2:raise ValueError('end dispatch requires a closed turn boundary')
   if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or event['actor']!=actor:raise ValueError('end dispatch event boundary differs')
   seqs=[e['seq'] for e in history]
   if any(type(s) is not int or not 1<=s<=before['event_seq'] for s in seqs) or seqs!=sorted(set(seqs)):raise ValueError('end dispatch history unordered duplicate or future')
   since=public_turn.boundary(g,history)
   opened=[e for e in history if e['seq']>since and e['actor']==actor and e['action_type']=='open_turn_end_triggers']
   if len(opened)>1:raise ValueError('end dispatch has duplicate opening in turn')
   if opened:
    e=opened[0];seq=e['seq'];route='prior_actual_end_window'
    if seq-1 not in trace or seq not in trace:unproved.append('prior_end_window_outside_supplied_trace')
    else:
     if before['event_seq'] not in trace or canonical(trace[before['event_seq']])!=canonical(before):raise ValueError('end dispatch current trace binding differs')
     opening=end_window.audit(trace[seq-1],trace[seq],e,[row for row in history if row['seq']<seq])
     if opening['errors'] or opening['supplied_end_window_verified'] is not True:raise ValueError('end dispatch prior actual opening differs: '+str(opening['errors']))
     verified=True
   else:
    route='no_current_supported_end_source_eligible';b=g['players'][actor]['board'];catalog=starts.catalog()['cards']
    for source in [b['main'],b['world'],b['partner'],*b['prepared']]:
     if source is None:continue
     card=g['cards'][source]['card_id']
     if card not in predicates.END_CARDS:continue
     met=predicates.end_condition(before,history,source,actor)
     classified.append(dict(source_instance_id=source,card_id=card,condition_met=met,source_reference=catalog[card]['reference']))
    if any(row['condition_met'] for row in classified):raise ValueError('unopened eligible end source precedes expiry or finish')
    verified=True
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error));verified=False
 return dict(schema='supplied_end_dispatch_order.v1',applicable=applicable,supplied_end_dispatch_verified=applicable and verified and not errors,errors=errors,route=route,
  classifications=classified,prior_opening_delta=opening,unproved=unproved,before_envelope_sha256=state.canonical_sha256(before),event_sha256=event_digest(event),
  scope='supported_end_sources_before_typed_expiry_and_finish',history_origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
