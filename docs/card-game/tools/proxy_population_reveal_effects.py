"""Source-bound supplied C-chicken reveal semantics, not activation authority."""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event):
 errors=[];applicable=False;reference=None;revealed=None;drawn=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and link is not None and link.get('card_id')=='C-chicken') or (event.get('action_type')=='resolve_board_ability' and claimed=='C-chicken')
  if applicable:
   reference=starts.catalog()['cards']['C-chicken']['reference']
   if not link or link.get('card_id')!='C-chicken' or event.get('action_type')!='resolve_board_ability':raise ValueError('reveal dispatch differs')
   if ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links] or ctx['window_kind']!='turn_start' or g['phase']!='response_window' or c['pending_triggers']:raise ValueError('reveal chain differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];p=g['players'][actor]
   if actor not in ('A','B') or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['candidate_variant'] is not None or link['target_instance_ids']!=[] or canonical(link['payment'])!=canonical(dict(time=0)):raise ValueError('reveal activated link differs')
   if source not in p['board']['companions'] or g['cards'][source]['card_id']!='C-chicken' or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('reveal physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('reveal sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['source_zone']!='board' or event['chain_link_id']!=link['link_id'] or canonical(event['payment'])!=canonical(dict(time=0)):raise ValueError('reveal receipt identity differs')
   table={r['card_id']:r for r in rules.table()['cards']}
   revealed=p['deck'][0] if p['deck'] else None
   card_type=table[g['cards'][revealed]['card_id']]['card_type'] if revealed is not None else None
   drawn=revealed if card_type=='companion' else None
   receipt=dict(revealed_instance_id=revealed,revealed_card_type=card_type,drawn_instance_id=drawn,source_destination='board')
   if canonical(event['result'])!=canonical(receipt):raise ValueError('reveal result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ep=expected['legacy_continuation']['game_state']['players'][actor]
   if drawn is not None:ep['hand'].append(ep['deck'].pop(0))
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('reveal changed unrelated state or wrong movement')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_reveal_semantics.v1',applicable=applicable,errors=errors,
  supplied_reveal_resolution_verified=applicable and not errors,revealed_instance_id=revealed,drawn_instance_id=drawn,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
