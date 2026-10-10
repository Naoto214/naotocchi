"""C-cat_friend source cost and attached/typed departure, conditional on history."""
import copy,hashlib
from collections import Counter
import proxy_population_departure_order as departure_order
import proxy_continuation_rules as rules
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_population_hand_predicates as pins
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

def audit(before,after,event,history):
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];source=event.get('source_instance_id');card=g['cards'].get(source,{});kind=event.get('action_type')
  applicable=card.get('card_id')=='C-cat_friend' and kind in ('activate_response','activate_companion_ability')
  if applicable:
   for path,digest in pins.SOURCES.items():
    if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('cat activation source changed')
   cap=recovery.descriptor('C-cat_friend');actor=event['actor'];seq=event['seq'];p=g['players'][actor];ctx=c['response_context'];normal=g['phase']=='normal_action';targets=event['target_instance_ids']
   if actor!=g['turn_player'] or source not in p['board']['companions'] or c['pending_triggers'] or rules.used(before,source,'activated_normal_action'):raise ValueError('cat activation source/turn/usage differs')
   starts=[e['seq'] for e in history if e['actor']==actor and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')]
   if not starts or any(e['seq']>max(starts) and e.get('source_zone')=='board' and e.get('source_instance_id')==source and e['action_type'] in ('activate_response','activate_companion_ability') for e in history):raise ValueError('cat activation current turn history differs')
   if type(targets) is not list or len(targets)!=1 or targets[0] not in recovery.targets(g,actor,'C-cat_friend'):raise ValueError('cat activation target differs')
   payment=dict(time=0,source_to_deck_bottom=source)
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['source_zone']!='board' or event['mandatory'] is not False or event['source_reference']!=cap['reference'] or canonical(event['payment'])!=canonical(payment):raise ValueError('cat activation receipt differs')
   if normal:
    if kind!='activate_companion_ability' or c['activation_zone'] or ctx['chain_links'] or g.get('challenge'):raise ValueError('cat activation normal boundary differs')
   elif kind!='activate_response' or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or actor!=ctx['priority_actor']:raise ValueError('cat activation response boundary differs')
   link_id=f'response-link-{seq}-{source}'
   if event['chain_link_id']!=link_id:raise ValueError('cat activation link differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation']
   if normal:ec['response_context']=dict(source_phase='normal_action',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   prior=ec['response_context'];links=[r['link_id'] for r in ec['activation_zone']]
   if prior['chain_links']!=links or prior['chain_status']!=('building' if links else 'empty') or prior['turn_player']!=g['turn_player'] or event['trigger_origin_event_seq']!=prior['origin_event_seq']:raise ValueError('cat activation prior chain/origin differs')
   cost_receipt=dict(contract='discard_recovery_source_cost_470',paid_event_seq=seq,actor=actor,source_instance_id=source,card_copy_id=card['card_copy_id'])
   link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=card['card_id'],card_copy_id=card['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(targets),candidate_variant=None,payment=payment,source_references=[cap['reference']],source_cost_receipt=cost_receipt)
   link['activation_receipt']=references.receipt(before,expected,link);ec['activation_zone'].append(link)
   current=state.current(expected);transition=old.start.seeded._response_transition_context(current);transition['window_kind']='after_normal_action'
   changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(current,changed);ec['response_context']=current['response_context'];ec['return_target']=current['return_target'];ec['game_state']['phase']='turn_end_response' if prior['source_phase']=='turn_end' else 'response_window'
   if normal:ec['response_context']['response_opportunity_index']=1
   removed={a:[] for a in 'AB'}
   for item,row in list(expected['runtime']['attachments'].items()):
    if row['target_instance_id']!=source:continue
    owner=row['controller'];ep=ec['game_state']['players'][owner];ep['board']['prepared'].remove(item);removed[owner].append(item);del expected['runtime']['attachments'][item];del expected['runtime']['public_prepared'][item]
   # Conservation first; the475 ordered receipt is checked separately below.
   for owner,items in removed.items():
    original=g['players'][owner]['discard'];actual=after['legacy_continuation']['game_state']['players'][owner]['discard']
    if actual[:len(original)]!=original or Counter(actual[len(original):])!=Counter(items):raise ValueError('cat equipment discard membership differs')
    ec['game_state']['players'][owner]['discard']=copy.deepcopy(actual)
   ep=ec['game_state']['players'][actor];ep['board']['companions'].remove(source);ep['deck'].append(source)
   for key in ('stat_effects','conditional_effects'):expected['runtime'][key]=[r for r in expected['runtime'][key] if r['target_instance_id']!=source]
   expected['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1))
   order_errors=departure_order.audit(before,after,event)
   if order_errors:raise ValueError(str(order_errors))
   if canonical(after)!=canonical(expected):raise ValueError('cat activation full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_cat_activation_delta.v1',applicable=applicable,errors=errors,supplied_cat_activation_verified=applicable and not errors,event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),equipment_discard_order_proven=applicable and not errors and 'departure_order' in event,history_origin_authenticated=False,selection_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
