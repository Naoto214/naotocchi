"""Join existing465 egg choice to actual supplied continuation and metadata."""
import copy
import proxy_population_incarnation as life
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_choice_boundary import prepare,apply_choice
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event,entry,decisions,registry):
 errors=[];applicable=event.get('action_type')=='egg_exchange_bottom';count=None
 try:
  if applicable:
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];seq=event['seq']
   if g['phase']!='egg_exchange_choice' or g['players'][actor]['board']['main'] is not None or c['activation_zone'] or c['pending_triggers'] or c['return_target'] is not None or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None or any(p['reservations'] for p in g['players'].values()):raise ValueError('egg choice boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor:raise ValueError('egg choice event differs')
   life.check(registry,before)
   if registry['current_envelope_sha256']!=life.digest(before):raise ValueError('egg choice lifecycle binding differs')
   if type(entry) is not dict or entry['choice_contract_id']!='egg_exchange_bottom' or entry['actor']!=actor:raise ValueError('egg choice entry absent or differs')
   boundary=prepare(entry)
   if canonical(boundary['choice_game_state'])!=canonical(life.project_game(registry,g)):raise ValueError('egg choice actual intermediate differs')
   count=int(bool(boundary['candidate_ids']))
   if type(decisions) is not list or len(decisions)!=count:raise ValueError('egg choice callback cardinality differs')
   selected=None
   if count:
    d=decisions[0];selected=d['selected_candidate'];local=d['local_policy_evidence']
    if d['decision_kind']!='mandatory_choice' or local['entry_sha256']!=life.digest(entry) or local['context']['owner']!=actor or local['application']['selected_candidate']!=selected:raise ValueError('egg choice decision binding differs')
    detail=next((row for row in boundary['candidate_details'] if row['candidate_id']==selected),None)
    if detail is None or canonical(d['selected_action'])!=canonical(dict(detail,initial_instance_id=detail['instance_id'])):raise ValueError('egg choice selected physical detail differs')
   if event['selected_candidate']!=selected:raise ValueError('egg choice selected receipt differs')
   applied=apply_choice(entry,selected)
   if count and canonical(local['application'])!=canonical(applied):raise ValueError('egg choice supplied application differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['game_state']=life.restore_game(registry,g,applied['local_after_game_state']);ec['game_state']['phase']='response_window';ec['return_target']='normal_action_opportunity'
   ec['response_context']=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('egg choice full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_egg_choice_delta.v1',applicable=applicable,errors=errors,supplied_egg_choice_verified=applicable and not errors,required_choice_count=count,
  event_sha256=event_digest(event),before_envelope_sha256=life.digest(before),after_envelope_sha256=life.digest(after),choice_origin_authenticated=False,incarnation_origin_proven=False,start_obligation_closure_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
