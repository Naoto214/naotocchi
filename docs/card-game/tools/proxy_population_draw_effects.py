"""Independent one-draw delta for five current107 board abilities.

Conditional on the supplied activated link and state, not activation/history
or full dispatch authentication. Reuses the pinned catalog, never the resolver.
"""
import copy
import proxy_continuation_state as state
import proxy_population_start_obligations as starts
from proxy_mandatory_policy_contract import canonical

CARDS=frozenset(('M-antlion-02','M-antlion-05','M-antlion-08','P-desert_scorpion','I-bowtie'))


def audit(before,after,event):
 errors=[];applicable=False;reference=None;drawn=[]
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone']
  link=links[-1] if links else None;card=link.get('card_id') if link else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in CARDS) or (event.get('action_type')=='resolve_board_ability' and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS or event.get('action_type')!='resolve_board_ability':raise ValueError('draw effect dispatch differs')
   reference=starts.catalog()['cards'][card]['reference']
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[row['link_id'] for row in links]:raise ValueError('draw effect chain differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq']
   if actor not in ('A','B') or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['candidate_variant'] is not None or link['target_instance_ids']!=[]:raise ValueError('draw effect link differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('draw effect physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('draw effect sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['source_zone']!='board' or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('draw effect receipt identity differs')
   p=g['players'][actor]
   #06/93: a partner cannot apply an unresolved ability while its owner is
   #an egg. Fail closed until that distinct resolver path is connected.
   if card=='P-desert_scorpion' and p['board']['main'] is None:raise ValueError('partner egg suppression semantics not connected')
   drawn=p['deck'][:1]
   receipt=dict(drawn_instance_ids=drawn,hand_bottom_instance_id=None,target_instance_id=None,growth_added=0)
   if canonical(event['result'])!=canonical(receipt):raise ValueError('draw effect result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   ep['deck']=ep['deck'][len(drawn):];ep['hand'].extend(drawn)
   ec['activation_zone'].pop();ec['response_context']['chain_links'].pop()
   if not ec['activation_zone']:
    ending=ctx['source_phase']=='turn_end' or g['phase']=='turn_end_response'
    ec['response_context'].update(chain_status='empty',consecutive_passes=2 if ending else 0)
    ec['game_state']['phase']='turn_end' if ending else 'normal_action';ec['return_target']='turn_end' if ending else 'normal_action_opportunity'
    battle=g.get('challenge')
    if battle is not None and not ending:
     ec['game_state']['phase']='response_window';ec['return_target']='challenge_comparison' if battle['status']=='comparing' else 'challenge_end'
     ec['response_context']=dict(source_phase='challenge_declaration' if battle['status']=='comparing' else 'challenge_result',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=g['turn_player'],priority_actor=g['turn_player'],chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if 'processing_boundary' in event:
    boundary=event['processing_boundary']
    if type(boundary) is not dict or set(boundary)!={'kind','turn_player','origin_event_seq'} or boundary['kind'] not in ('start','end') or boundary['turn_player']!=g['turn_player'] or type(boundary['origin_event_seq']) is not int or not 0<boundary['origin_event_seq']<=before['event_seq'] or ec['activation_zone']:raise ValueError('draw processing boundary differs')
    ending=boundary['kind']=='end';ec['game_state']['phase']='turn_end_response' if ending else 'response_window';ec['return_target']='turn_end' if ending else 'normal_action_opportunity'
    ec['response_context']=dict(source_phase='turn_end' if ending else 'response_window',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=g['turn_player'],priority_actor=g['turn_player'],chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('draw effect changed unrelated state or chain')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_one_draw_semantics.v1',applicable=applicable,errors=errors,
  supplied_draw_resolution_verified=applicable and not errors,drawn_instance_ids=drawn,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,choice_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,
  legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
