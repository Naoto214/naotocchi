"""Independent77/87 public reveal, branch and full effect-delta semantics."""
from proxy_population_resolution_semantics import event_digest
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import canonical

CARDS=frozenset(('I-c_coin2','G-hit-blow'))
TYPES=frozenset(('main','companion','partner','world','play','item','event'))

def audit(before,after,event):
 errors=[];applicable=False;reference=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None;card=link.get('card_id') if link else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in CARDS) or (str(event.get('action_type','')).startswith('resolve') and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS:raise ValueError('quick reveal dispatch differs')
   reference=starts.catalog()['cards'][card]['reference'];ruling.verify_source();coin=card=='I-c_coin2';kind='resolve_item' if coin else 'resolve_play'
   if event.get('action_type')!=kind or ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links] or c['pending_triggers']:raise ValueError('quick reveal chain differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];p=g['players'][actor];variant=link['candidate_variant']
   if actor not in ('A','B') or link.get('source_zone','hand')!='hand' or link['action_type']!=('use_item' if coin else 'use_play') or link['target_instance_ids']!=[] or canonical(link['payment'])!=canonical(dict(time=1)) or (variant is not None if coin else variant not in TYPES):raise ValueError('quick reveal link differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('quick reveal physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or canonical(event['payment'])!=canonical(dict(time=1)):raise ValueError('quick reveal receipt identity differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ep=expected['legacy_continuation']['game_state']['players'][actor];table={r['card_id']:r['card_type'] for r in rules.table()['cards']}
   revealed=ep['deck'][0] if ep['deck'] else None;category=table[g['cards'][revealed]['card_id']] if revealed is not None else None;drawn=None;requested=0;matched=None
   if revealed is not None:
    if category not in TYPES:raise ValueError('quick reveal printed type unknown')
    ep['deck'].pop(0)
    if coin:
     ep['deck'].append(revealed)
     if category=='main':requested=5
     else:drawn=ep['deck'].pop(0);ep['hand'].append(drawn)
    else:
     matched=variant==category
     if matched:drawn=revealed;ep['hand'].append(drawn);requested=5
     else:ep['deck'].append(revealed);drawn=ep['deck'].pop(0);ep['hand'].append(drawn)
   growth=application.growth(p['growth'],requested);ep['growth']=growth['after'];ep['discard'].append(source)
   parts=[growth,dict(operation='public_reveal',instance_id=revealed,status='applied' if revealed is not None else 'not_applied',reason='public_reveal' if revealed is not None else 'empty_deck'),dict(operation='draw',instance_ids=[] if drawn is None else [drawn],status='applied' if drawn is not None else 'not_applied')]
   status=application.classify(parts,True)
   receipt=dict(revealed_instance_id=revealed,revealed_card_type=category,drawn_instance_id=drawn,growth_added=growth['actual_delta'],growth_requested=requested,source_destination='discard',effect_applied=status=='applied')
   if coin:receipt['returned_to_deck_bottom']=revealed
   else:receipt.update(declared_type=variant,declaration_matched=matched)
   evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=parts,parts_complete=True,status=status)
   if canonical(event['result'])!=canonical(receipt):raise ValueError('quick reveal result differs')
   if canonical(event['application_evidence'])!=canonical(evidence):raise ValueError('quick reveal application evidence differs')
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('quick reveal changed unrelated state or wrong effect')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_quick_reveal_semantics.v1',applicable=applicable,errors=errors,supplied_quick_reveal_verified=applicable and not errors,source_reference=reference,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,printed_type_authenticated=False,origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
