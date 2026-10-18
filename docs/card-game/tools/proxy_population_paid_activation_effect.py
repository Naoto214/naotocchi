"""M02/M08 paid activation: current source cost, once-use and complete delta."""
import copy,hashlib
import proxy_continuation_rules as rules
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
import proxy_population_activation_reference as references
import proxy_population_hand_predicates as pins
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

CARDS={'M-antlion-02','M-antlion-08'}
def audit(before,after,event):
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];source=event.get('source_instance_id');card=g['cards'].get(source,{});kind=event.get('action_type')
  applicable=card.get('card_id') in CARDS and kind in ('activate_response','activate_main_ability')
  if applicable:
   for path,digest in pins.SOURCES.items():
    if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('paid activation source changed')
   cap=batch.classification(card['card_id']);actor=event['actor'];seq=event['seq'];p=g['players'][actor];ctx=c['response_context'];normal=g['phase']=='normal_action';cost_key='prepared_to_deck_bottom' if card['card_id']=='M-antlion-02' else 'discard_to_deck_bottom';costs=event['payment'][cost_key]
   if actor!=g['turn_player'] or p['board']['main']!=source or c['pending_triggers'] or rules.used(before,source,'activated_normal_action'):raise ValueError('paid activation current source/turn/usage differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['source_zone']!='board' or event['mandatory'] is not False or event['target_instance_ids']!=[] or event['source_reference']!=cap['reference']:raise ValueError('paid activation receipt differs')
   if type(costs) is not list or len(costs)!=len(set(costs)) or len(costs)!=(1 if card['card_id']=='M-antlion-02' else 2) or canonical(event['payment'])!=canonical(dict(time=0,**{cost_key:costs})):raise ValueError('paid activation costs differ')
   if card['card_id']=='M-antlion-02':
    cost=costs[0]
    if cost not in p['board']['prepared'] or before['runtime']['public_prepared'][cost]['face_up'] is not False or cost in before['runtime']['attachments']:raise ValueError('paid activation needs own facedown prepared card')
   else:
    methods={r['card_id']:{a['action_type'] for a in r['actions']} for r in rules.table()['cards']}
    if any(s not in p['discard'] for s in costs) or not any('set_item' in methods[g['cards'][costs[i]]['card_id']] and methods[g['cards'][costs[1-i]]['card_id']]&pins.QUICK for i in (0,1)):raise ValueError('paid activation needs distinct set and quick discard cards')
   if normal:
    if kind!='activate_main_ability' or c['activation_zone'] or ctx['chain_links'] or g.get('challenge'):raise ValueError('paid activation normal boundary differs')
   elif kind!='activate_response' or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or actor!=ctx['priority_actor']:raise ValueError('paid activation response boundary differs')
   link_id=f'response-link-{seq}-{source}'
   if event['chain_link_id']!=link_id:raise ValueError('paid activation link differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation']
   if normal:
    ec['response_context']=dict(source_phase='normal_action',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   prior=ec['response_context'];links=[r['link_id'] for r in ec['activation_zone']]
   if prior['chain_links']!=links or prior['chain_status']!=('building' if links else 'empty') or prior['turn_player']!=g['turn_player'] or event['trigger_origin_event_seq']!=prior['origin_event_seq']:raise ValueError('paid activation prior chain/origin differs')
   link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=card['card_id'],card_copy_id=card['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant=None,payment=copy.deepcopy(event['payment']),source_references=[cap['reference']])
   link['activation_receipt']=references.receipt(before,expected,link);ec['activation_zone'].append(link)
   current=state.current(expected);transition=old.start.seeded._response_transition_context(current);transition['window_kind']='after_normal_action'
   changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(current,changed);ec['response_context']=current['response_context'];ec['return_target']=current['return_target'];ec['game_state']['phase']='turn_end_response' if prior['source_phase']=='turn_end' else 'response_window'
   if normal:ec['response_context']['response_opportunity_index']=1
   owner=ec['game_state']['players'][actor]
   for cost in costs:
    if card['card_id']=='M-antlion-02':owner['board']['prepared'].remove(cost);del expected['runtime']['public_prepared'][cost]
    else:owner['discard'].remove(cost)
   owner['deck'].extend(costs);expected['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1))
   if canonical(after)!=canonical(expected):raise ValueError('paid activation full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_paid_activation_delta.v1',applicable=applicable,errors=errors,supplied_paid_activation_verified=applicable and not errors,event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),selection_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
