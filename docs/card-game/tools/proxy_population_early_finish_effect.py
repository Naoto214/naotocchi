"""Reuse the existing full public100 history for terminal/continue dispatch."""
import copy
import proxy_population_end_victory as history_rules
import proxy_population_turn_finish_effect as finish
import proxy_population_victory_history as victory
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event,history,shots,first_player=None):
 errors=[];winners=None;g=before['legacy_continuation']['game_state'];kind=event.get('action_type');early=kind=='maintained100_final_comparison'
 applicable=early or (kind=='turn_end_completed' and g['round']<10 and any(p['growth']==100 for p in g['players'].values()))
 try:
  if applicable:
   c,g,actor=finish.closed_end(before,first_player);seq=event['seq']
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['selected_candidate'] is not None:raise ValueError('early finish receipt differs')
   if type(shots) is not list or not shots or shots[-1]['event_seq']!=before['event_seq'] or canonical(shots[-1]['continuation_state'])!=canonical(c) or canonical(shots[-1]['game_state'])!=canonical(g):raise ValueError('early finish full history endpoint differs')
   reconstructed=history_rules.reconstruct_history(history,shots,first_player);winners=reconstructed['assessment']['early_winner_candidates']
   if early:
    if len(winners)!=1:raise ValueError('early finish requires maintained100 after a future opponent turn')
    result=dict(winner=winners[0],final_growth={a:g['players'][a]['growth'] for a in 'AB'},completion_reason='maintained100_after_future_opponent_turn',source_references=list(victory.SOURCES),victory_history=reconstructed)
    if canonical(event['result'])!=canonical(result):raise ValueError('early finish public history result differs')
    expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['game_state']['phase']='completed';ec['return_target']=None
    if canonical(after)!=canonical(expected):raise ValueError('early finish full delta differs')
   else:
    if winners:raise ValueError('early finish required instead of another turn')
    continuation=finish.audit(before,after,event,first_player)
    if continuation['errors']:raise ValueError('early finish continuation differs: '+str(continuation['errors']))
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_early_finish_delta.v1',applicable=applicable,errors=errors,supplied_early_finish_verified=applicable and not errors,early_winner_candidates=winners,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),history_origin_authenticated=False,first_seat_origin_authenticated=False,end_obligation_closure_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
