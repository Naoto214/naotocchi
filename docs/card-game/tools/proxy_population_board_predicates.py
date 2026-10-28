"""Current normal board-source activation and alternative coverage.

Checks source-bound paid draw, self-cost recovery and passive/triggered sources.
Uses existing cost, public target, classification and incarnation-usage helpers.
No effect execution, new comparison or claim of actual information isolation.
Legacy reservation sources remain explicitly unproved, not zero obligations.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_paid_draw as paid
import proxy_population_cost_alternatives as cost_alternatives
import proxy_population_discard_recovery as recovery
# Preserve the source predicate before closed_start temporarily suppresses native offers.
from proxy_board_trigger_audit_144 import matches as source_start_matches
from proxy_population_candidate_expansions import TABLE_PATH,TABLE_SHA
from proxy_mandatory_policy_contract import ROOT,canonical,load_json

SOURCES={TABLE_PATH:TABLE_SHA,**{'01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71', '02-main-system.md': '6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127', '06-action-chain-checkpoint.md': '7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67', '55-insect-three-lines-card-text-draft.md': '8108f781d2e02b45139fdf7d1d573c7ac839f14cd2b8361983ecb891320f8c28', '72-companion-26-card-text-draft.md': '941d17e157d77badfaaab0e1f04539eb602c05b893241ff3024ecd7ae0c97117'}}
SOURCES['77-current-items-card-text-draft.md']='ec0a630c5616f6a50ca97afcebaab22fe9de13fe5e3789552d4e7d7ee93a8a02'
SOURCES['132-board-active-restart.md']='b431565b6a8de777b9745f3d2c8816d71b1e64753e537b5aa593efb6a7acc58f'
SOURCES['64-turn-boundaries-and-victory-timing.md']='00f9845b5b79774c48bac002e26f6b08096563a4bf1611f408aed0e2c9089a64'
SOURCES['65-challenge-participants-and-resolution.md']='65a8dfef2f97aa982173f1e767215a9da557e29e5adedbc4173250a4de1441a0'
# Existing full-delta resolver families in resolution_semantics.FAMILIES plus
# designated_effects. Resolution restarts response; it does not start a turn (06).
RESOLUTION_ORIGINS={'resolve_payment_modifier','resolve_board_stat','resolve_board_ability','resolve_event','resolve_targeted_zone_move','resolve_immediate_effect','resolve_item','resolve_play'}
PASSIVE_KINDS={'none','continuous','past_trigger','passive','triggered','response_triggered','cost_modifier'}


def _signature(row):
 value={k:row.get(k) for k in ('action_type','target_instance_ids','cost_instance_ids')}
 # Existing normal inventory distinguishes passive and response-only grammar.
 # Both have no ordinary activation; exact grammar is checked by expansion.
 if value['action_type']=='board_response_trigger':value['action_type']='board_passive'
 return canonical(value)


def _expected(envelope,source):
 g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor];card=g['cards'][source]['card_id']
 if card in paid.DESCRIPTORS:
  cap=paid.batch.classification(card)
  if source!=p['board']['main'] or cap['kind']!='activated' or cap['timing']!='own_turn':raise ValueError('paid ability current source differs')
  costs=cost_alternatives.paid_costs(envelope,source)
  rows=[dict(action_type='activate_main_ability',target_instance_ids=[],cost_instance_ids=c,allowed=True) for c in costs]
  if not rows:rows=[dict(action_type='board_passive',target_instance_ids=[],cost_instance_ids=None,allowed=False)]
  return rows,cap['reference']
 if card=='C-cat_friend':
  cap=recovery.descriptor(card)
  if cap['source_cost']!='self_board_to_bottom' or source not in p['board']['companions']:raise ValueError('recovery current source differs')
  #72: public discarded companions except this same card name. The producer
  #also uses recovery.targets; never reuse its potentially incomplete pool.
  companion_ids={row['card_id'] for row in load_json(ROOT/TABLE_PATH)['cards'] if row['card_type']=='companion'}
  targets=sorted(s for s in p['discard'] if g['cards'][s]['card_id'] in companion_ids and g['cards'][s]['card_id']!='C-cat_friend')
  used=cost_alternatives.used(envelope,source,'activated_normal_action')
  rows=[dict(action_type='activate_companion_ability',target_instance_ids=t,cost_instance_ids=None,allowed=bool(t) and not used) for t in ([[s] for s in targets] or [[]])]
  return rows,cap['reference']
 cap=rules.classification(card)
 #77's companion-departure replacement supplies no normal board activation.
 #This negative is independent of whether its departure condition is reachable.
 if card=='I-bond1':
  if cap['kind']!='replacement' or cap['timing']!='companion_departure' or cap['reference']!='77-current-items-card-text-draft.md#I-bond1':raise ValueError('bond normal replacement source differs')
  return [dict(action_type='board_passive',target_instance_ids=[],cost_instance_ids=None,allowed=False)],cap['reference']
 if cap['kind'] not in PASSIVE_KINDS:return None,cap['reference']
 return [dict(action_type='board_passive',target_instance_ids=[],cost_instance_ids=None,allowed=False)],cap['reference']


def audit_normal(envelope,inventory):
 errors=[];verified=[];unproved=[]
 try:
  for name,digest in SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('board predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];b=g['players'][actor]['board']
  if g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or g.get('challenge'):raise ValueError('not a normal board entry')
  sources=[s for s in (b['main'],*b['companions'],b['partner'],b['world'],*b['prepared']) if s is not None]
  rows=[r for r in inventory['enumeration_units'] if r['source_family']=='board_card_action']
  if {r['source_instance_id'] for r in rows}!=set(sources):raise ValueError('current board source coverage differs')
  for source in sources:
   actual=[r for r in rows if r['source_instance_id']==source];card=g['cards'][source]['card_id']
   if any(r['source_id']!=source or r['source_zone']!='board' or r['card_id']!=card for r in actual):raise ValueError('board source identity differs')
   expected,reference=_expected(envelope,source)
   if expected is None:
    unproved.append(dict(source_instance_id=source,card_id=card,reason='normal_board_mechanism_not_certified'));continue
   if Counter(_signature(r) for r in actual)!=Counter(_signature(r) for r in expected):raise ValueError('board target/cost alternatives differ: '+source)
   allowed={_signature(r):r['allowed'] for r in expected}
   for row in actual:
    met=allowed[_signature(row)]
    if row['disposition']!=('admitted' if met else 'excluded') or (row['candidate_id'] is not None)!=met or bool(row['reason_codes'])==met:raise ValueError('board activation disposition differs: '+source)
    #55/72 specify physical-card payments for these three active abilities,
    #not a time payment. This says nothing about the value of those cards.
    payment_time=None
    if met and (card in paid.DESCRIPTORS or card=='C-cat_friend'):
     if reference not in row['source_references']:raise ValueError('board payment source reference differs')
     if card in paid.DESCRIPTORS and (type(row.get('base_time_cost')) is not int or row['base_time_cost']!=0):raise ValueError('board payment time differs')
     payment_time=0
    verified.append(dict(enumeration_unit_id=row['enumeration_unit_id'],source_instance_id=source,card_id=card,activation_allowed=met,source_reference=reference,payment_time=payment_time))
  for row in inventory['enumeration_units']:
   if row['source_family']=='hand_card_action' and row['action_type']=='activate_companion_ability':
    source=row['source_instance_id'];card=row['card_id'];cap=recovery.descriptor(card)
    if source not in g['players'][actor]['hand'] or row['source_zone']!='hand' or row['source_id']!=source or g['cards'][source]['card_id']!=card or cap['source_cost']!='self_board_to_bottom':raise ValueError('hand board-ability source differs')
    if row['disposition']!='excluded' or row['candidate_id'] is not None or not row['reason_codes']:raise ValueError('hand cannot pay companion board-source cost')
    verified.append(dict(enumeration_unit_id=row['enumeration_unit_id'],source_instance_id=source,card_id=card,activation_allowed=False,source_reference=cap['reference']))
   if row['source_family']=='reservation_action':unproved.append(dict(source_id=row['source_id'],reason='legacy_reservation_predicate_not_certified'))
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='normal_board_activation_predicates.v1',board_predicates_verified=not errors,errors=errors,verified_units=verified,unproved_units=unproved,source_sha256=dict(SOURCES),
  exclusion_reason_semantics_proven=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def compose(inventory,proofs):
 """Account for supplied normal rows; no authentication of caller proofs.

 The connected entry invokes this only on its freshly computed three audits.
 Source/target expansion and allowed-information/comparison gates are separate.
 """
 errors=[];covered=[];missing=[]
 statuses={'core_normal_disposition_predicates.v1':'core_predicates_verified',
  'normal_hand_activation_predicates.v1':'hand_predicates_verified',
  'normal_board_activation_predicates.v1':'board_predicates_verified'}
 try:
  wanted=[r['enumeration_unit_id'] for r in inventory['enumeration_units']]
  if len(wanted)!=len(set(wanted)):raise ValueError('duplicate normal unit')
  for proof in proofs:
   key=statuses[proof['schema']]
   if proof[key] is not True or proof['errors']:raise ValueError('normal predicate audit failed')
   covered.extend(r['enumeration_unit_id'] for r in proof['verified_units'])
  if len(covered)!=len(set(covered)) or set(covered)-set(wanted):raise ValueError('overlapping or foreign predicate unit')
  missing=sorted(set(wanted)-set(covered))
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(schema='normal_unit_predicate_coverage.v1',supplied_normal_unit_predicates_covered=not errors and not missing,
  errors=errors,verified_unit_count=len(covered),unproved_enumeration_unit_ids=missing,
  caller_proofs_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,
  selection_operand_provenance_verified=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)


def _start_condition_at_origin(envelope,events,trace,source,actor,origin):
 """Reuse start collection at its actual supplied boundary, never today's hand."""
 import proxy_population_start_obligations as starts
 from proxy_population_resolution_semantics import event_digest
 if type(trace) is not list or not trace:return None
 if canonical(trace[-1])!=canonical(envelope):raise ValueError('start condition trace endpoint differs')
 sequences=[e['event_seq'] for e in trace]
 if any(type(seq) is not int for seq in sequences) or sequences!=sorted(set(sequences)):raise ValueError('start condition trace order differs')
 matches=[e for e in trace if e['event_seq']==origin['seq']]
 if len(matches)!=1:return None
 opened=matches[0];current=state.current(opened);g=current['game_state']
 if origin.get('game_state_after_sha256')!=current['source_game_state_sha256'] or origin.get('continuation_state_after_sha256')!=current['continuation_state_sha256']:raise ValueError('start condition origin event binding differs')
 captures=[e for e in trace if e['event_seq']<origin['seq'] and e['legacy_continuation']['game_state']['phase']=='turn_start' and e['legacy_continuation']['game_state']['turn_player']==actor and e['legacy_continuation']['game_state']['round']==g['round']]
 if len(captures)!=1:return None
 proof=starts.collect(starts.capture(captures[0]),opened)
 rows=[r for r in proof['classifications'] if r['source_instance_id']==source]
 if len(rows)!=1 or rows[0]['card_id']!='I-bowtie' or rows[0]['reason_code']!='hand_count_above_two':return None
 if any(r['source_instance_id']==source for r in proof['occurrences']):raise ValueError('start condition negative has an occurrence')
 now=envelope['legacy_continuation']['game_state']
 if canonical(g['cards'].get(source))!=canonical(now['cards'][source]):raise ValueError('start condition physical source differs')
 return dict(condition_met_at_start=False,hand_count_at_start=len(g['players'][actor]['hand']),
  start_envelope_sha256=state.canonical_sha256(opened),capture_envelope_sha256=state.canonical_sha256(captures[0]),
  origin_event_sha256=event_digest(origin),source_catalog_sha256=starts.CATALOG_SHA,
  classification=rows[0],scope='actual_supplied_start_boundary_only',history_authenticated=False)


def audit_response(envelope,events,inventory,runtime_history=None):
 """Own-turn activated board abilities and explicitly nonactivated kinds.

 Occurrence-dependent triggers, prepared cards and unknown classifications need
 their own event-origin proof; no absence is inferred for those sources.
 """
 errors=[];verified=[];unproved=[];count=0;end_negative_audits={};event_negative_audits={};latched_negative_audits={};start_negative_audits={}
 try:
  for path,digest in SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('response board predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];b=p['board']
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary board response entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('board response identity differs')
  sources=[s for s in (b['main'],*b['companions'],b['partner'],b['world'],*b['prepared']) if s is not None]
  for source in sources:
   card=g['cards'][source]['card_id'];expected=[]
   if card in paid.DESCRIPTORS or card=='C-cat_friend':
    if (card in paid.DESCRIPTORS and b['main']!=source) or (card=='C-cat_friend' and source not in b['companions']):raise ValueError('activated board response source differs')
    rows=[]
    if actor==g['turn_player']:rows,_=_expected(envelope,source)
    # Historical response uses and the current incarnation usage register are
    # complementary inputs, not evidence that supplied history is authentic.
    since=max((e['seq'] for e in events if e['actor']==actor and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')),default=0)
    history_used=card=='C-cat_friend' and any(e['seq']>since and e['action_type']=='activate_response' and e.get('source_zone')=='board' and e.get('source_instance_id')==source for e in events)
    for row in rows:
     if row['allowed'] and not history_used:
      expected.append(dict(action_type='activate_board_ability',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=row['target_instance_ids'],candidate_variant=None,base_time_cost=0,cost_instance_ids=row['cost_instance_ids']))
   elif card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    # Reuse the pinned end predicate only for an independently empty set.
    # Positive/declined groups require their actual ledger closure separately.
    import proxy_population_trigger_predicates as end_predicates
    public=envelope['runtime']['public_prepared'].get(source,{})
    if card=='I-sleepboost1' and (public.get('face_up') is not True or source not in envelope['runtime']['attachments']):
     unproved.append(dict(source_instance_id=source,card_id=card,reason='end_equipment_visibility_unproved'));continue
    cap=end_predicates.batch.classification(card)
    occurrence=dict(origin_event_seq=ctx['origin_event_seq'],source_instance_id=source,actor=actor,category='optional',ability_key=cap['timing'],source_reference=cap['reference'])
    proof=end_predicates.audit_end(envelope,occurrence,[],events)
    if proof['errors'] or proof['current_trigger_predicates_verified'] is not True or proof['verified_candidate_count']!=0:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='end_response_negative_not_proven'));continue
    end_negative_audits[source]=proof
   elif card in ('M-antlion-04','M-antlion-05','M-beetle-01','W-city','P-cat_ceo','M-antlion-07','P-anglerfish'):
    import proxy_population_trigger_predicates as event_predicates
    mechanism=('arrival' if card in event_predicates.ARRIVAL_CARDS else 'city' if card=='W-city' else 'relationship' if card=='P-cat_ceo' else 'challenge')
    cap=event_predicates.batch.classification(card)
    occurrence=dict(origin_event_seq=ctx['origin_event_seq'],source_instance_id=source,actor=actor,category='forced' if mechanism=='relationship' else 'optional',ability_key=cap['timing'],source_reference=cap['reference'])
    proof=getattr(event_predicates,'audit_'+mechanism)(envelope,occurrence,[],events)
    if proof['errors'] or proof['current_trigger_predicates_verified'] is not True or proof['verified_candidate_count']!=0:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='event_response_negative_not_proven'));continue
    event_negative_audits[source]=proof
   elif card in ('M-antlion-03','M-antlion-06','C-bat','P-cliff_goat'):
    import proxy_population_trigger_predicates as latched_predicates
    cap=latched_predicates.batch.classification(card)
    occurrence=dict(origin_event_seq=ctx['origin_event_seq'],source_instance_id=source,actor=actor,category='optional',ability_key=cap['timing'],source_reference=cap['reference'])
    # Current cost/target/usage absence is sufficient to reject activation;
    # it does not prove whether a timing occurrence was produced or closed.
    proof=latched_predicates.audit_latched(envelope,occurrence,[])
    if proof['errors'] or proof['current_trigger_predicates_verified'] is not True or proof['verified_candidate_count']!=0:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='latched_response_negative_not_proven'));continue
    latched_negative_audits[source]=proof
   elif card in ('C-chicken','I-bowtie'):
    import proxy_continuation_batch as batch
    import proxy_population_start_obligations as starts
    if card=='C-chicken' and source not in b['companions']:raise ValueError('start companion current source differs')
    if card=='I-bowtie':
     public=envelope['runtime']['public_prepared'].get(source,{})
     if source not in b['prepared'] or public.get('face_up') is not True or source not in envelope['runtime']['attachments']:raise ValueError('start equipment current source differs')
     known=starts.catalog()['cards'][card]
     if known['start_kind']!='own_start_hand_at_most_two_draw':raise ValueError('start equipment source contract differs')
    cap=rules.classification(card)
    if cap['kind']!='triggered' or cap['timing']!='own_turn_start':raise ValueError('start companion source contract differs')
    origins=[e for e in events if e['seq']==ctx['origin_event_seq']]
    if len(origins)!=1:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='start_response_origin_unproved'));continue
    origin=origins[0];raw=origin['action_type'];kind='turn_start' if raw in ('turn_start_and_normal_draw','turn_start_and_egg_draw','egg_exchange_bottom') else raw
    if card=='C-chicken':met=source_start_matches(card,ctx['window_kind'],actor,g['turn_player'],kind,origin['actor'])
    else:
     if cap['reference']!=known['reference']:raise ValueError('start equipment reference differs')
     #77 is own-start only. Do not infer the original hand condition from
     #the current hand, or reuse144's C-chicken-only registration for this card.
     met=ctx['window_kind']=='turn_start' and actor==g['turn_player'] and origin['actor']==actor and kind=='turn_start'
    # Restrict this local negative to registered normal-method/end/challenge origins or
    # another player's turn; unknown own-turn mechanisms remain unproved.
    condition=_start_condition_at_origin(envelope,events,runtime_history,source,actor,origin) if met and card=='I-bowtie' and runtime_history is not None else None
    resolved_response=raw in RESOLUTION_ORIGINS and ctx['window_kind']=='after_normal_action'
    # activate_main_ability/activate_companion_ability are the registered current
    # normal methods (paid draw, C-cat_friend); they open an after_normal_action
    # window, never a turn start.
    if (met and condition is None) or (actor==g['turn_player'] and raw not in batch.NORMAL_CARD_EVENTS|{'normal_pass_end_request','open_turn_end_triggers','challenge_declared','challenge_compared','relationship_progress','relationship_marriage','activate_main_ability','activate_companion_ability'} and not resolved_response and condition is None):
     unproved.append(dict(source_instance_id=source,card_id=card,reason='start_response_negative_not_proven'));continue
    start_negative_audits[source]=dict(origin_event_seq=origin['seq'],origin_action=raw,normalized_origin_action=kind,timing_matches=met,source_reference=cap['reference'])
    if condition is not None:start_negative_audits[source]['condition_at_start']=condition
   else:
    if source in b['prepared']:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='event_or_prepared_response_predicate_unproved'));continue
    cap=rules.classification(card)
    if cap['kind'] not in {'none','continuous','passive','cost_modifier'}:
     unproved.append(dict(source_instance_id=source,card_id=card,reason='event_or_prepared_response_predicate_unproved'));continue
   keys=('action_type','card_id','card_copy_id','source_instance_id','target_instance_ids','candidate_variant','base_time_cost','cost_instance_ids')
   signature=lambda r:canonical({k:r.get(k) for k in keys})
   actual=[r for r in inventory['legal_candidate_details'] if r.get('source_instance_id')==source]
   if Counter(map(signature,actual))!=Counter(map(signature,expected)):raise ValueError('board response semantic alternatives differ: '+source)
   verified.append(source);count+=len(expected)
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='response_board_activation_predicates.v1',response_board_predicates_verified=not errors,errors=errors,verified_source_ids=sorted(verified),unproved_sources=unproved,verified_candidate_count=count,end_negative_audits=end_negative_audits,event_negative_audits=event_negative_audits,latched_negative_audits=latched_negative_audits,start_negative_audits=start_negative_audits,source_sha256=dict(SOURCES),
  candidate_identity_grammar_proven=False,history_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
