"""Independent supplied C-cat_friend/M04 fixed-target movement semantics."""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
from proxy_mandatory_policy_contract import canonical

CARDS=frozenset(('C-cat_friend','M-antlion-04'))


def audit(before,after,event):
 errors=[];applicable=False;reference=None;moved=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone']
  link=links[-1] if links else None;card=link.get('card_id') if link else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in CARDS) or (event.get('action_type')=='resolve_board_ability' and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS or event.get('action_type')!='resolve_board_ability':raise ValueError('zone effect dispatch differs')
   reference=starts.catalog()['cards'][card]['reference']
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[row['link_id'] for row in links]:raise ValueError('zone effect chain differs')
   actor=link['actor'];source=link['source_instance_id'];targets=link['target_instance_ids'];seq=event['seq']
   if actor not in ('A','B') or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['candidate_variant'] is not None or type(targets) is not list or len(targets)!=1:raise ValueError('zone effect link differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('zone effect physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('zone effect sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['source_zone']!='board' or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('zone effect receipt identity differs')
   target=targets[0];p=g['players'][actor];table={r['card_id']:r for r in rules.table()['cards']};met=target in p['discard']
   if met:
    target_card=g['cards'][target]['card_id'];entry=table[target_card]
    if card=='C-cat_friend':met=entry['card_type']=='companion' and target_card!=card
    elif not any(a['action_type'] in ('use_item','use_play','use_event') for a in entry['actions']):raise ValueError('zone effect target lacks printed quick method')
   moved=target if met else None
   receipt=(dict(target_instance_id=target,returned_to_hand=met,growth_added=0) if card=='C-cat_friend' else dict(drawn_instance_ids=[],hand_bottom_instance_id=None,target_instance_id=target,growth_added=0))
   if canonical(event['result'])!=canonical(receipt):raise ValueError('zone effect result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ep=expected['legacy_continuation']['game_state']['players'][actor]
   if met:
    ep['discard'].remove(target)
    if card=='C-cat_friend':ep['hand'].append(target)
    else:ep['deck'].insert(0,target)
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('zone effect changed unrelated state or wrong destination')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_fixed_zone_semantics.v1',applicable=applicable,errors=errors,
  supplied_zone_resolution_verified=applicable and not errors,moved_instance_id=moved,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,choice_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,
  legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
