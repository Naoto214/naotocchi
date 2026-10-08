"""No-cost start/arrival/end/challenge board groups, supplied record full delta."""
import copy
import proxy_population_group_activation_binding as binding
import proxy_population_activation_reference as references
import proxy_population_start_obligations as sources
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical

START={'C-chicken','I-bowtie'}
CARDS=START|{'M-antlion-04','M-antlion-05','M-antlion-07','M-beetle-01','M-beetle-02','W-city','W-countryside','P-desert_scorpion','P-anglerfish','I-sleepboost1','P-cat_ceo'}
def audit(before,after,event,record=None):
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];source=event.get('source_instance_id');card=g['cards'].get(source,{});applicable=event.get('action_type')=='activate_response' and card.get('card_id') in CARDS
  if applicable:
   action,occurrence=binding.bind(before,after,event,record);actor=event['actor'];seq=event['seq'];ctx=c['response_context'];cap=sources.catalog()['cards'][card['card_id']];start=card['card_id'] in START;forced=card['card_id']=='P-cat_ceo'
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['turn_player']!=g['turn_player']:raise ValueError('board group boundary differs')
   if occurrence['category']!=('forced' if forced else 'optional') or event['mandatory'] is not forced or event['source_zone']!='board' or event['source_reference']!=cap['reference'] or canonical(event['payment'])!=canonical(dict(time=0)):raise ValueError('board group category/payment differs')
   variant=g['challenge']['parameter'] if card['card_id']=='M-antlion-07' else None
   if card['card_id']=='M-antlion-07' and variant not in ('power','wisdom'):raise ValueError('board challenge parameter differs')
   identity=dict(action_type='activate_board_ability',card_id=card['card_id'],card_copy_id=card['card_copy_id'],candidate_variant=variant,base_time_cost=0,source_references=[cap['reference']])
   if canonical({k:action[k] for k in identity})!=canonical(identity):raise ValueError('board group action identity differs')
   links=[r['link_id'] for r in c['activation_zone']]
   if ctx['chain_links']!=links or ctx['chain_status']!=('building' if links else 'empty'):raise ValueError('board group prior chain differs')
   if start and (ctx['window_kind']!='turn_start' or ctx['origin_event_seq']!=occurrence['origin_event_seq'] or c['pending_triggers']):raise ValueError('board start group boundary differs')
   if not start and c['pending_triggers'] not in ([],[f"mandatory:{occurrence['origin_event_seq']}:{source}"] if forced else []):raise ValueError('board group pending differs')
   link_id=f'response-link-{seq}-{source}'
   if event['chain_link_id']!=link_id:raise ValueError('board group link differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation']
   link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=card['card_id'],card_copy_id=card['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(action['target_instance_ids']),candidate_variant=variant,payment=dict(time=0),source_references=[cap['reference']])
   link['activation_receipt']=references.receipt(before,expected,link);ec['activation_zone'].append(link)
   if not start:ec['pending_triggers']=[];ec['response_context']['origin_event_seq']=occurrence['origin_event_seq']
   current=state.current(expected);transition=old.start.seeded._response_transition_context(current);transition.update(window_kind='after_normal_action',priority_actor=actor)
   changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(current,changed);ec['response_context']=current['response_context'];ec['return_target']=current['return_target'];ec['game_state']['phase']='turn_end_response' if not start and ctx['source_phase']=='turn_end' else 'response_window'
   if forced:ec['response_context']['response_opportunity_index']=1
   if canonical(after)!=canonical(expected):raise ValueError('board group full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_board_group_delta.v1',applicable=applicable,errors=errors,supplied_board_group_verified=applicable and not errors,event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),activation_conditions_proven=False,occurrence_origin_authenticated=False,selection_origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
