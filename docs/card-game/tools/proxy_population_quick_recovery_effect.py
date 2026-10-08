"""83 quick companion recovery and supplied top/bottom choice effect delta.

Legacy116 selection remains excluded. This audit checks what the supplied
choice did, not whether that policy or input origin may be admitted.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
from proxy_mandatory_policy_contract import canonical

CARD='G-animal-shogi'

def audit(before,after,event,decisions):
 errors=[];applicable=False;valid=None;choice_count=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None;card=link.get('card_id') if link else None;claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card==CARD) or (str(event.get('action_type','')).startswith('resolve') and claimed==CARD)
  if applicable:
   if not link or card!=CARD or event['action_type']!='resolve_targeted_zone_move':raise ValueError('quick recovery dispatch differs')
   reference=starts.catalog()['cards'][CARD]['reference'];actor=link['actor'];source=link['source_instance_id'];targets=link['target_instance_ids'];seq=event['seq']
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links]:raise ValueError('quick recovery chain differs')
   if actor not in ('A','B') or link.get('source_zone','hand')!='hand' or link['action_type']!='use_play' or link['candidate_variant'] is not None or type(targets) is not list or len(targets)!=1 or canonical(link['payment'])!=canonical(dict(time=2)):raise ValueError('quick recovery link differs')
   if g['cards'][source]['card_id']!=CARD or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('quick recovery identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('quick recovery receipt identity differs')
   target=targets[0];p=g['players'][actor];table={r['card_id']:r for r in rules.table()['cards']};valid=target in p['discard'] and table[g['cards'][target]['card_id']]['card_type']=='companion';choice_count=int(valid and bool(p['deck']))
   if type(decisions) is not list or len(decisions)!=choice_count:raise ValueError('quick recovery choice cardinality differs')
   position=None
   if choice_count:
    d=decisions[0];selected=d['selected_action'];position=selected['option']['position']
    if d['decision_kind']!='mandatory_choice' or position not in ('top','bottom') or canonical(selected)!=canonical(dict(candidate_id=canonical(dict(position=position)).decode(),kind='effect_choice',action_type='choose_effect_option',option=dict(position=position))) or d['selected_candidate']!=selected['candidate_id']:raise ValueError('quick recovery selected option differs')
   receipt=dict(target_instance_id=target,effect_applied=valid,topdeck_position=position)
   if canonical(event['created_effect'])!=canonical(receipt):raise ValueError('quick recovery receipt differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ep=expected['legacy_continuation']['game_state']['players'][actor]
   if valid:ep['discard'].remove(target);ep['hand'].append(target)
   if position=='bottom':ep['deck'].append(ep['deck'].pop(0))
   ep['discard'].append(source);tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('quick recovery full state differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_quick_recovery_semantics.v1',applicable=applicable,errors=errors,supplied_quick_recovery_verified=applicable and not errors,target_legal=valid,required_choice_count=choice_count,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),old_116_excluded=bool(choice_count) if applicable and not errors else None,choice_authenticated=False,activation_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
