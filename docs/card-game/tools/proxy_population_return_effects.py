"""Source-bound C-bat/M06 resolution semantics, conditional on supplied links.

Reconstruct only the allowed return and chain-pop delta; never call the native
resolver or certify prior activation, choice authority or all opportunities.
"""
from proxy_population_resolution_semantics import event_digest
import copy, hashlib
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_population_resolution_delta as tail
from proxy_mandatory_policy_contract import canonical

SOURCES={
 'C-bat':('72-companion-26-card-text-draft.md#C-bat','b30496057c5aa33e95301f879052cecd435d9f9227b39fd7d32ab9661d9a5d21'),
 'M-antlion-06':('55-insect-three-lines-card-text-draft.md#M-antlion-06','f90c6c72de75235ae61e3d4331690a7b7fbc8ba68087564477380173605e3f0a'),
}


def audit(before,after,event):
 errors=[];applicable=False;returned=None;reference=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone']
  link=links[-1] if links else None;card=link.get('card_id') if link else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in SOURCES) or (event.get('action_type')=='resolve_board_ability' and claimed in SOURCES)
  if applicable:
   if not link or card not in SOURCES or event.get('action_type')!='resolve_board_ability':raise ValueError('return effect dispatch differs')
   reference,digest=SOURCES[card];body,_=batch.rules.source_section(reference)
   if hashlib.sha256(body.encode()).hexdigest()!=digest:raise ValueError('return effect source changed')
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[row['link_id'] for row in links]:raise ValueError('return effect chain boundary differs')
   actor=link['actor'];source=link['source_instance_id'];targets=link['target_instance_ids'];seq=event['seq']
   if actor not in ('A','B') or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['candidate_variant'] is not None:raise ValueError('return effect link route differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('return effect source identity differs')
   if type(targets) is not list or len(targets)!=1:raise ValueError('return effect target count differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('return effect sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['source_zone']!='board' or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('return effect receipt identity differs')
   target=targets[0];p=g['players'][actor]
   zone=p['board']['prepared'] if card=='C-bat' else p['discard']
   met=target in zone
   # Bat deliberately does not read concealed target identity. M06's target
   # must still be a world when present; activation/cost history is separate.
   if met and card=='M-antlion-06':
    worlds={row['card_id'] for row in batch.rules.table()['cards'] if row['card_type']=='world'}
    if g['cards'][target]['card_id'] not in worlds:raise ValueError('return target is not a world')
   returned=target if met else None
   receipt=dict(effect_applied=met,target_instance_id=target,returned_instance_id=returned)
   if canonical(event['result'])!=canonical(receipt):raise ValueError('return effect result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   if met:
    (ep['board']['prepared'] if card=='C-bat' else ep['discard']).remove(target);ep['hand'].append(target)
    if card=='C-bat':
     expected['runtime']['public_prepared'].pop(target);expected['runtime']['attachments'].pop(target,None)
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('return effect changed unrelated state or retained chain')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_return_effect_semantics.v1',applicable=applicable,errors=errors,
  supplied_return_resolution_verified=applicable and not errors,returned_instance_id=returned,source_reference=reference,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,choice_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,
  legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
