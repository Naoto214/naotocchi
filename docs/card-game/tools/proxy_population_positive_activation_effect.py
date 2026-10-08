"""Current positive4 group activation costs/usage and complete state delta."""
import copy
import proxy_population_trigger_latching as latching
import proxy_population_group_activation_binding as binding
import proxy_population_activation_reference as references
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event,record=None):
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];source=event.get('source_instance_id');card=g['cards'].get(source,{});applicable=event.get('action_type')=='activate_response' and card.get('card_id') in latching.CARDS
  if applicable:
   action,occurrence=binding.bind(before,after,event,record);actor=event['actor'];seq=event['seq'];cap=batch.classification(card['card_id']);ctx=c['response_context']
   if canonical(action) not in [canonical(a) for a in latching.current_actions(before,occurrence)[0]]:raise ValueError('positive activation current action differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or g['phase'] not in ('normal_action','response_window','post_placement_response','turn_end_response') or c['pending_triggers'] or ctx['turn_player']!=g['turn_player']:raise ValueError('positive activation boundary differs')
   if event['source_zone']!='board' or event['mandatory'] is not False or event['source_reference']!=cap['reference']:raise ValueError('positive activation receipt differs')
   if g['phase']=='normal_action' and (card['card_id']!='M-antlion-06' or c['activation_zone']):raise ValueError('positive normal return group differs')
   links=[r['link_id'] for r in c['activation_zone']]
   if ctx['chain_links']!=links or ctx['chain_status']!=('building' if links else 'empty'):raise ValueError('positive activation prior chain differs')
   payment=dict(time=0)
   if card['card_id']=='M-antlion-06':payment['revealed_hand_world_to_bottom']=copy.deepcopy(action['cost_instance_ids'])
   link_id=f'response-link-{seq}-{source}'
   if event['chain_link_id']!=link_id or canonical(event['payment'])!=canonical(payment):raise ValueError('positive activation payment/link differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];p=ec['game_state']['players'][actor]
   if card['card_id']=='M-antlion-06':
    for cost in action['cost_instance_ids']:p['hand'].remove(cost);p['deck'].append(cost)
   expected['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key=cap.get('ability_key',cap['timing']),turn_player=g['turn_player'],round=g['round'],count=1))
   link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=card['card_id'],card_copy_id=card['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(action['target_instance_ids']),candidate_variant=None,payment=payment,source_references=[cap['reference']])
   link['activation_receipt']=references.receipt(before,expected,link);ec['activation_zone'].append(link)
   current=state.current(expected);transition=old.start.seeded._response_transition_context(current);transition.update(window_kind='after_normal_action',priority_actor=actor)
   changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(current,changed);ec['response_context']=current['response_context'];ec['response_context']['origin_event_seq']=occurrence['origin_event_seq'];ec['return_target']=current['return_target'];ec['game_state']['phase']='turn_end_response' if ctx['source_phase']=='turn_end' else 'response_window'
   if canonical(after)!=canonical(expected):raise ValueError('positive activation full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_positive_activation_delta.v1',applicable=applicable,errors=errors,supplied_positive_activation_verified=applicable and not errors,event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),occurrence_origin_authenticated=False,selection_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
