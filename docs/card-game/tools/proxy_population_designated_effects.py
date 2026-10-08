"""Join existing465 local operations to a supplied full resolution envelope.

The lifecycle registry and selection are supplied. Their authentication and
policy roots are separately checked by the connected entry; no new policy.
"""
import copy
import proxy_population_incarnation as life
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
from proxy_mandatory_choice_boundary import REGISTRY,prepare,apply_choice
from proxy_mandatory_policy_contract import canonical

CARDS={card:kind for kind,cards in REGISTRY.items() for card in cards}

def audit(before,after,event,decisions,registry):
 errors=[];applicable=False;kind=None;choice_count=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None;card=link.get('card_id') if link else None;claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in CARDS) or (str(event.get('action_type','')).startswith('resolve') and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS:raise ValueError('designated effect dispatch differs')
   reference=starts.catalog()['cards'][card]['reference'];kind=CARDS[card];final=card=='E-final-time';actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];targets=link['target_instance_ids']
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links] or event['action_type']!=('resolve_event' if final else 'resolve_board_ability'):raise ValueError('designated effect chain differs')
   if actor not in ('A','B') or link.get('source_zone','hand')!=('hand' if final else 'board') or link['action_type']!=('use_event' if final else 'activate_board_ability') or link['candidate_variant'] is not None or type(targets) is not list or len(targets)!=(1 if final else 0) or canonical(link['payment'])!=canonical(dict(time=2 if final else 0)):raise ValueError('designated effect link differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('designated effect physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id']:raise ValueError('designated effect receipt identity differs')
   if final:
    if canonical(event['payment'])!=canonical(dict(time=2)):raise ValueError('designated effect receipt payment differs')
   elif event['source_zone']!='board' or event['source_reference']!=reference:raise ValueError('designated effect board receipt differs')
   life.check(registry,before)
   if registry['current_envelope_sha256']!=life.digest(before):raise ValueError('designated effect lifecycle binding differs')
   projected=life.project_game(registry,g);target=targets[0] if final else None
   if source not in projected['cards'] or (target is not None and target not in projected['cards']):raise ValueError('retired designated reference outside connected scope')
   frame=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id=kind,actor=actor,entry='effect_resolution_start',source_instance_id=source,target_instance_id=target,game_state=projected)
   boundary=prepare(frame);choice_count=int(bool(boundary['candidate_ids']))
   if type(decisions) is not list or len(decisions)!=choice_count:raise ValueError('designated effect decision cardinality differs')
   selected=None
   if choice_count:
    d=decisions[0];selected=d['selected_candidate'];local=d['local_policy_evidence']
    if d['decision_kind']!='mandatory_choice' or local['entry_sha256']!=life.digest(frame) or local['context']['owner']!=actor or local['application']['selected_candidate']!=selected:raise ValueError('designated effect selection binding differs')
   applied=apply_choice(frame,selected)
   if choice_count and canonical(local['application'])!=canonical(applied):raise ValueError('designated effect supplied local application differs')
   operations=boundary['prefix_operations']+applied['suffix_operations'];drawn=[r['instance_id'] for r in operations if r['operation']=='draw'];bottoms=[r['instance_id'] for r in operations if r['operation'] in ('hand_to_bottom','top_to_bottom')]
   if len(bottoms)>1:raise ValueError('designated effect bottom operation differs')
   bottom=bottoms[0] if bottoms else None
   if final:
    returned=[r['instance_id'] for r in operations if r['operation']=='discard_to_bottom']
    receipt=dict(target_instance_id=target,target_valid_at_resolution=bool(returned),returned_discard_to_deck_bottom=target if returned else None,drawn_instance_ids=drawn,hand_bottom_instance_id=bottom,source_destination='discard',growth_added=0)
   else:receipt=dict(drawn_instance_ids=drawn,hand_bottom_instance_id=bottom,target_instance_id=None,growth_added=0)
   if canonical(event['result'])!=canonical(receipt):raise ValueError('designated effect result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['game_state']=life.restore_game(registry,g,applied['local_after_game_state'])
   if final:ec['game_state']['players'][actor]['discard'].append(source)
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('designated effect full envelope differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_designated_effect_semantics.v1',applicable=applicable,errors=errors,supplied_designated_effect_verified=applicable and not errors,choice_contract_id=kind,required_choice_count=choice_count,
  before_envelope_sha256=life.digest(before),after_envelope_sha256=life.digest(after),choice_authenticated=False,activation_proven=False,incarnation_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
