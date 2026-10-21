"""Independent four-source timing checks over supplied transition boundaries.

Does not call the occurrence producer or current-action enumerator. Costs,
usage limits and targets belong to the later legal-action check. Effect truth
is conditional on the separate full-delta audit, never inferred from a replay.
"""
from collections import Counter
import hashlib
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_rules as rules
import proxy_population_start_obligations as sources
import proxy_population_effect_creation as creation
import proxy_population_effect_application_runtime as ruling
import proxy_continuation_payments as payments
from proxy_mandatory_policy_contract import ROOT,canonical

KINDS={'M-antlion-03':'after_opponent_quick_play','M-antlion-06':'after_own_quick_effect_applied','C-bat':'after_own_quick_on_opponent_turn','P-cliff_goat':'different_name_world_change'}
QUICK=frozenset(('use_item','use_play','use_event'))
TYPED_CREATION_EVENT='resolve_payment_modifier'


def application(before,after,event,link):
 """474 verdict of the resolved own hand quick card; untyped receipts stay unproved.

 A typed receipt is read as before. A quick typed-creation route (payment,
 stat or conditional row) is certified by the existing creation full-delta
 audit: a created reservation is an application (474/67); zero creation must
 carry the 474 not_applied evidence. Nothing is inferred from receipt keys.
 """
 receipt=event.get('created_effect',event.get('result'))
 if type(receipt) is dict and type(receipt.get('effect_applied')) is bool:return receipt['effect_applied']
 card=link['card_id']
 if event.get('action_type')==TYPED_CREATION_EVENT and (card in payments.PAYMENT_CARDS or card in payments.STAT_CARDS or card in payments.CONDITIONAL_CARDS):
  proof=creation.audit(before,after,event)
  if proof['errors'] or proof['typed_creation_verified'] is not True or proof['created_effect_count'] not in (0,1):raise ValueError('timing requires current typed application evidence: '+str(proof['errors']))
  if proof['created_effect_count']==1:return True
  if 'application_evidence' in event and ruling.status(event)=='not_applied':return False
 raise ValueError('timing requires current typed application evidence')


def audit_hand(before,after,event,capture):
 """Derive83's hand trigger without calling capture or action enumeration.

 Reads each source owner's pre-event hand for rule accounting, not the other
 player's decision. Current payment/targets and full transition semantics
 remain separate checks. A later draw cannot create an earlier occurrence.
 """
 errors=[];expected=[];classified=0
 try:
  state.validate(before);state.validate(after)
  prior=state.current(before);current=state.current(after);g=prior['game_state']
  if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or event['seq']!=after['event_seq']:raise ValueError('hand timing sequence differs')
  for suffix,value in (('before',prior),('after',current)):
   if event['game_state_'+suffix+'_sha256']!=triggers.old.start.opening._stop_state_sha256(value['game_state']) or event['continuation_state_'+suffix+'_sha256']!=triggers.old.start._hash(value):raise ValueError('hand timing transition hashes differ')
  if capture['schema']!='owner_hand_optional_timing_capture.v1' or capture['scope']!=['G-air-hockey']:raise ValueError('hand timing capture scope differs')
  for name,value in (('before_envelope_sha256',before),('after_envelope_sha256',after),('event_sha256',event)):
   if capture[name]!=state.canonical_sha256(value):raise ValueError('hand timing capture boundary differs')
  reference=sources.catalog()['cards']['G-air-hockey']['reference']
  if reference!='83-play-batch-3-card-text-draft.md#G-air-hockey':raise ValueError('hand timing source reference differs')
  actor=event['actor']
  if actor not in ('A','B'):raise ValueError('hand timing actor differs')
  played=event.get('source_instance_id');card=g['cards'].get(played,{}).get('card_id')
  row=next((r for r in rules.table()['cards'] if r['card_id']==card),None)
  is_play=event['action_type'] in ('use_play','activate_response') and event.get('source_zone') not in ('board','prepared') and row is not None and row['card_type']=='play'
  if is_play:
   links=[l for l in current['activation_zone'] if l['link_id']==event.get('chain_link_id')]
   if len(links)!=1 or played not in g['players'][actor]['hand']:raise ValueError('hand timing actual play absent')
   link=links[0]
   if (link['actor'],link['source_instance_id'],link['card_id'],link['action_type'])!=(actor,played,card,'use_play') or link.get('source_zone') in ('board','prepared') or prior['response_context']['chain_status']=='resolving':raise ValueError('hand timing activation identity differs')
   battle=g.get('challenge');owner='B' if actor=='A' else 'A'
   hand_sources=[s for s in g['players'][owner]['hand'] if g['cards'][s]['card_id']=='G-air-hockey'];classified=len(hand_sources)
   if battle and battle['status']=='comparing' and all(g['players'][a]['board']['main']==battle['participants'][a] for a in ('A','B')):
    expected=[dict(origin_event_seq=event['seq'],source_instance_id=s,actor=owner,category='optional',ability_key='opponent_quick_play_during_challenge',source_reference=reference) for s in hand_sources]
  if Counter(map(canonical,capture['occurrences']))!=Counter(map(canonical,expected)):raise ValueError('hand timing occurrence set differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_hand_timing_occurrences.v1',supplied_hand_timing_occurrences_verified=not errors,errors=errors,
  expected_occurrence_count=len(expected),classified_source_count=classified,before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),event_sha256=state.canonical_sha256(event),
  source_catalog_sha256=sources.CATALOG_SHA,scope=['G-air-hockey'],current_legal_actions_proven=False,information_use_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)


def audit(before,after,event,capture):
 errors=[];expected=[];classified=[]
 try:
  state.validate(before);state.validate(after)
  if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or event['seq']!=after['event_seq']:raise ValueError('timing sequence differs')
  prior=state.current(before);current=state.current(after);g=prior['game_state'];known=sources.catalog()['cards']
  if event['actor'] not in g['players']:raise ValueError('timing event actor differs')
  for suffix,value in (('before',prior),('after',current)):
   if event['game_state_'+suffix+'_sha256']!=triggers.old.start.opening._stop_state_sha256(value['game_state']) or event['continuation_state_'+suffix+'_sha256']!=triggers.old.start._hash(value):raise ValueError('timing transition hashes differ')
  if capture['schema']!='conditional_trigger_timing_capture.v1' or capture['scope']!=sorted(KINDS):raise ValueError('timing capture scope differs')
  for name,value in (('before_envelope_sha256',before),('after_envelope_sha256',after),('event_sha256',event)):
   if capture[name]!=state.canonical_sha256(value):raise ValueError('timing capture boundary differs')
  for actor,p in g['players'].items():
   board=p['board']
   for source,slot in [(board['main'],'main'),(board['partner'],'partner'),*((s,'companions') for s in board['companions'])]:
    if source is None:continue
    card=g['cards'][source]['card_id']
    if card not in KINDS:continue
    expected_slot='main' if card.startswith('M-') else 'partner' if card=='P-cliff_goat' else 'companions'
    if slot!=expected_slot:raise ValueError('timing source role differs')
    reference=known[card]['reference'];met=False
    classified.append(dict(source_instance_id=source,source_reference=reference,source_raw_sha256=known[card]['source_raw_sha256']))
    if card in ('M-antlion-03','C-bat') and actor!=g['turn_player']:
     played=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
     details=next((r for r in rules.table()['cards'] if r['card_id']==played),None)
     played_quick=event['action_type'] in QUICK|{'activate_response'} and event.get('source_zone') not in ('board','prepared') and details is not None and any(a['action_type'] in QUICK for a in details['actions'])
     met=played_quick and event['actor']==(g['turn_player'] if card=='M-antlion-03' else actor)
    elif card=='M-antlion-06' and actor==g['turn_player']==event['actor'] and event['action_type'].startswith('resolve'):
     links=[r for r in prior['activation_zone'] if r['link_id']==event.get('chain_link_id') and r['source_instance_id']==event.get('source_instance_id')]
     if len(links)!=1:raise ValueError('timing resolved link absent or ambiguous')
     link=links[0]
     if link['actor']==actor and link['action_type'] in QUICK and link.get('source_zone','hand')=='hand':met=application(before,after,event,link)
    elif card=='P-cliff_goat' and event['action_type']=='place_world' and event['actor']==actor:
     old=board['world'];new=current['game_state']['players'][actor]['board']['world']
     if event.get('previous_world_instance_id')!=old or event.get('source_instance_id')!=new:raise ValueError('timing world receipt differs')
     met=old is not None and new is not None and g['cards'][old]['card_id']!=current['game_state']['cards'][new]['card_id']
     if board['main'] is None:
      if hashlib.sha256((ROOT/'02-main-system.md').read_bytes()).hexdigest()!='6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127':raise ValueError('partner suppression source changed')
      met=False
    if met:expected.append(dict(origin_event_seq=event['seq'],source_instance_id=source,actor=actor,category='optional',ability_key=KINDS[card],source_reference=reference))
  projection=[{k:r[k] for k in ('source_instance_id','source_reference','source_raw_sha256')} for r in capture['classifications']]
  if Counter(map(canonical,projection))!=Counter(map(canonical,classified)):raise ValueError('timing classification coverage differs')
  if Counter(map(canonical,capture['occurrences']))!=Counter(map(canonical,expected)):raise ValueError('timing occurrence set differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_four_source_timing_occurrences.v1',supplied_timing_occurrences_verified=not errors,errors=errors,
  expected_occurrence_count=len(expected),classified_source_count=len(classified),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),event_sha256=state.canonical_sha256(event),
  source_catalog_sha256=sources.CATALOG_SHA,scope=sorted(KINDS),effect_application_truth_proven=False,current_legal_actions_proven=False,information_use_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
