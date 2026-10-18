"""64 end window: existing independent predicates plus supplied full delta.

Does not authenticate history or prove legacy reservation/opportunity closure.
"""
import copy,hashlib
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_population_trigger_predicates as predicates
import proxy_population_start_obligations as starts
from proxy_population_victory_history import SOURCES
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical
REFERENCE='64-turn-boundaries-and-victory-timing.md'

def audit(before,after,event,history):
 errors=[];applicable=event.get('action_type')=='open_turn_end_triggers'
 try:
  if applicable:
   for name,digest in dict(predicates.BOARD_SOURCES,**{REFERENCE:SOURCES[REFERENCE]}).items():
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('end window source changed')
   state.validate(before);c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];seq=event['seq'];ctx=c['response_context']
   if g['phase']!='turn_end' or c['return_target']!='turn_end' or c['activation_zone'] or c['pending_triggers'] or ctx['chain_status']!='empty' or ctx['chain_links'] or ctx['consecutive_passes']!=2 or g.get('challenge') is not None or any(p['reservations'] for p in g['players'].values()):raise ValueError('end window requires closed supplied turn end without reservations')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_reference']!=REFERENCE:raise ValueError('end window receipt differs')
   if any(type(e['seq']) is not int or e['seq']>before['event_seq'] for e in history):raise ValueError('end window history boundary differs')
   since=triggers._since(history,actor)
   if any(e['seq']>since and e['actor']==actor and e['action_type']=='open_turn_end_triggers' for e in history):raise ValueError('end window already opened this turn')
   b=g['players'][actor]['board'];eligible=[];classified=[];catalog=starts.catalog()['cards']
   for source in [b['main'],b['world'],b['partner'],*b['prepared']]:
    if source is None:continue
    card=g['cards'][source]['card_id']
    if card not in predicates.END_CARDS:continue
    met=predicates.end_condition(before,history,source,actor)
    if met:eligible.append(source)
    classified.append(dict(source_instance_id=source,card_id=card,condition_met=met,source_reference=catalog[card]['reference']))
   if not eligible or canonical(event['eligible_source_instance_ids'])!=canonical(eligible) or canonical(event['end_source_classifications'])!=canonical(classified):raise ValueError('end window complete source conditions differ')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['game_state']['phase']='turn_end_response';ec['return_target']='turn_end'
   ec['response_context']=dict(source_phase='turn_end',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('end window full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_end_window_delta.v1',applicable=applicable,errors=errors,supplied_end_window_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),history_origin_authenticated=False,legacy_reservation_closure_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
