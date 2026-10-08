"""Hand quick activation cost/zone delta with the existing119 transition contract.

This does not authenticate selection or prove per-card activation predicates.
"""
import copy,hashlib
import proxy_continuation_rules as rules
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
import proxy_population_hand_predicates as predicates
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

def audit(before,after,event):
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];kind=event.get('action_type');source=event.get('source_instance_id')
  applicable=kind in predicates.QUICK or (kind=='activate_response' and event.get('source_zone')!='board' and (source not in g['cards'] or g['cards'][source]['card_id'] in predicates.SUPPORTED))
  if applicable:
   for path,digest in predicates.SOURCES.items():
    if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('hand activation source changed')
   actor=event['actor'];seq=event['seq'];card=g['cards'][source];ctx=c['response_context'];normal=g['phase']=='normal_action';p=g['players'][actor]
   if card['card_id'] not in predicates.SUPPORTED or source not in p['hand'] or c['pending_triggers']:raise ValueError('hand activation source/boundary differs')
   template=next(a for r in rules.table()['cards'] if r['card_id']==card['card_id'] for a in r['actions'] if a['action_type'] in predicates.QUICK)
   cost=template['base_time_cost'];ref=template['source_text_reference'];rules.source_section(ref)
   if type(cost) is not int or cost<0 or any(type(g['players'][a]['time']) is not int or g['players'][a]['time']<0 for a in 'AB') or p['time']<cost:raise ValueError('hand activation payment differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or canonical(event['payment'])!=canonical(dict(time=cost)) or event['source_reference']!=ref:raise ValueError('hand activation receipt differs')
   if normal:
    if actor!=g['turn_player'] or kind!=template['action_type'] or c['activation_zone'] or ctx['chain_links'] or ctx['chain_status']!='empty' or g.get('challenge'):raise ValueError('hand activation normal boundary differs')
   elif kind!='activate_response' or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or actor!=ctx['priority_actor']:raise ValueError('hand activation response boundary differs')
   link_id=f'response-link-{seq}-{source}'
   if event['chain_link_id']!=link_id:raise ValueError('hand activation link ID differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation']
   if normal:
    ec['game_state']['phase']='response_window';ec['return_target']='normal_action'
    ec['response_context']=dict(source_phase='normal_action',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   else:
    links=[r['link_id'] for r in c['activation_zone']]
    if ctx['chain_links']!=links or ctx['chain_status']!=('building' if links else 'empty') or ctx['turn_player']!=g['turn_player']:raise ValueError('hand activation prior stack differs')
   owner=ec['game_state']['players'][actor];owner['time']-=cost;owner['hand'].remove(source)
   link=dict(link_id=link_id,action_type=template['action_type'],actor=actor,card_id=card['card_id'],card_copy_id=card['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(event['target_instance_ids']),candidate_variant=event['candidate_variant'],payment=dict(time=cost),source_references=[ref])
   ec['activation_zone'].append(link)
   #119 is the existing canonical transition; do not introduce a second machine.
   current=state.current(expected);transition=old.start.seeded._response_transition_context(current);transition['window_kind']='after_normal_action'
   changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(current,changed)
   ec['response_context']=current['response_context'];ec['return_target']=current['return_target']
   if normal:ec['response_context']['response_opportunity_index']=1
   if canonical(after)!=canonical(expected):raise ValueError('hand activation full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError,StopIteration) as error:errors.append(str(error))
 return dict(schema='supplied_hand_activation_delta.v1',applicable=applicable,errors=errors,supplied_hand_activation_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),activation_conditions_proven=False,selection_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
