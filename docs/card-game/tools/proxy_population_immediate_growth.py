"""Independent operands/full effect delta for three supplied growth handlers."""
import copy
import proxy_continuation_state as state
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import canonical

CARDS=frozenset(('G-area-claim','E-boss','W-countryside'))

def audit(before,after,event):
 errors=[];applicable=False;reference=None;requested=None;applied=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None;card=link.get('card_id') if link else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and card in CARDS) or (str(event.get('action_type','')).startswith('resolve') and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS:raise ValueError('immediate growth dispatch differs')
   reference=starts.catalog()['cards'][card]['reference'];ruling.verify_source();board=card=='W-countryside';kind='resolve_board_ability' if board else 'resolve_immediate_effect'
   if event.get('action_type')!=kind or ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links]:raise ValueError('immediate growth chain/dispatch differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];p=g['players'][actor]
   if actor not in ('A','B') or link.get('source_zone','hand')!=('board' if board else 'hand') or link['action_type']!=('activate_board_ability' if board else 'use_play' if card=='G-area-claim' else 'use_event') or link['target_instance_ids']!=[]:raise ValueError('immediate growth link differs')
   if g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('immediate growth physical identity differs')
   if board and (link['candidate_variant'] is not None or canonical(link['payment'])!=canonical(dict(time=0)) or event['source_zone']!='board'):raise ValueError('immediate growth board source differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('immediate growth sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('immediate growth receipt identity differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;eg=expected['legacy_continuation']['game_state'];ep=eg['players'][actor]
   if card=='G-area-claim':
    b=p['board'];physical=[s for s in (b['main'],b['partner'],b['world'],*b['companions'],*b['prepared']) if s is not None]
    if len(physical)!=len(set(physical)):raise ValueError('immediate growth duplicate board card')
    count=len(physical);requested=0 if count<7 else 15 if count>=9 else 10;receipt=dict(board_card_count=count)
   else:requested=5;receipt={}
   part=application.growth(p['growth'],requested);parts=[part];ep['growth']=part['after']
   if card=='E-boss':
    drawn={}
    for owner in (actor,'B' if actor=='A' else 'A'):
     player=eg['players'][owner];drawn[owner]=player['deck'][:1]
     if drawn[owner]:player['hand'].append(player['deck'].pop(0))
    receipt['drawn_instance_ids_by_actor']=drawn
    parts.append(dict(operation='draw',actual_instance_ids_by_actor=copy.deepcopy(drawn),status='applied' if any(drawn.values()) else 'not_applied',reason='actual_draw' if any(drawn.values()) else 'empty_decks'))
   if board:receipt.update(drawn_instance_ids=[],hand_bottom_instance_id=None,target_instance_id=None)
   else:ep['discard'].append(source)
   status=application.classify(parts,True);applied=status=='applied';receipt.update(growth_added=part['actual_delta'],growth_requested=requested,effect_applied=applied)
   if canonical(event['result'] if board else event['created_effect'])!=canonical(receipt):raise ValueError('immediate growth result differs')
   evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=parts,parts_complete=True,status=status)
   if canonical(event['application_evidence'])!=canonical(evidence):raise ValueError('immediate growth application evidence differs')
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('immediate growth changed unrelated state or wrong effect')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_immediate_growth_semantics.v1',applicable=applicable,errors=errors,
  supplied_growth_resolution_verified=applicable and not errors,requested_growth=requested,effect_applied=applied,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
