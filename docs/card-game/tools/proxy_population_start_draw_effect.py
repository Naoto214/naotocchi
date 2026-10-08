"""01/02/64 start time/reset and ordered normal/egg draws.

Conditional on a supplied turn_start; does not authenticate preceding end,
reserved starts, egg choice or occurrence production.
"""
import copy,hashlib
import proxy_continuation_state as state
from proxy_population_victory_history import SOURCES
from proxy_population_challenge_operands import SOURCES as MAIN_SOURCES
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical
KINDS=('turn_start_and_normal_draw','turn_start_and_egg_draw')

def audit(before,after,event):
 errors=[];applicable=event.get('action_type') in KINDS
 try:
  if applicable:
   for name in ('01-core-rules.md','02-main-system.md','64-turn-boundaries-and-victory-timing.md'):
    digest=MAIN_SOURCES[name] if name=='02-main-system.md' else SOURCES[name]
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('start draw source changed')
   state.validate(before);c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];seq=event['seq'];p=g['players'][actor];egg=p['board']['main'] is None
   if g['phase']!='turn_start' or c['return_target'] is not None or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None or any(p['reservations'] for p in g['players'].values()):raise ValueError('start draw boundary or reservations unproved')
   if type(g['round']) is not int or not 1<=g['round']<=10 or event['actor']!=actor or type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['action_type']!=KINDS[int(egg)] or event['selected_candidate'] is not None:raise ValueError('start draw actor sequence or main differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   ep.update(time=g['round'],challenge_used=False,person_placed=False,relationship_progressed=False)
   for _ in range(min(2 if egg else 1,len(ep['deck']))):ep['hand'].append(ep['deck'].pop(0))
   if egg:ec['game_state']['phase']='egg_exchange_choice'
   else:
    ec['game_state']['phase']='response_window';ec['return_target']='normal_action_opportunity'
    ec['response_context']=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('start draw full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_start_draw_delta.v1',applicable=applicable,errors=errors,supplied_start_draw_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),start_obligation_closure_proven=False,egg_choice_proven=False,history_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
