"""Narrow concealed/replacement absence from public registered quick routes.

All active links are inspected, not only the original response event. Unknown
or board mechanisms stay unproved. This does not prove prior trigger coverage,
actual information-use isolation, effect execution or complete legal sets.
"""
from collections import Counter
import hashlib
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
import proxy_continuation_preparation as preparation
import proxy_population_start_obligations as sources
import proxy_population_discard_recovery as recovery
from proxy_population_board_predicates import SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical

NONACTIVATIONS=frozenset(('turn_start_and_egg_draw','turn_start_and_normal_draw','egg_exchange_bottom',
 'open_turn_end_triggers','normal_pass_end_request','main_movement','person_placement','place_world',
 'set_item','attach_item','relationship_start','relationship_progress','relationship_marriage',
 'challenge_declared','challenge_compared','resolve_board_stat','resolve_payment_modifier',
 'resolve_immediate_effect','resolve_event','resolve_item','resolve_play','resolve_board_ability','resolve_targeted_zone_move'))
QUICK_TIMINGS={'I-c_coin2':'quick_draw','G-hit-blow':'declared_top_reveal',
 'E-first-date':'targeted_relationship_growth','E-final-time':'targeted_draw_cycle'}


def quick_effect_route(link):
 """Registered public dispatch + pinned semantics, not an effect simulator."""
 card=link.get('card_id');action=link.get('action_type');handler=None;cap=None
 unknown=dict(status='unproved',card_id=card,reason='public_effect_route_not_certified')
 if link.get('source_zone','hand')!='hand' or action not in ('use_item','use_play','use_event'):return unknown
 known=sources.catalog()['cards']
 if card not in known:return unknown
 templates=[a for r in rules.table()['cards'] if r['card_id']==card for a in r['actions']]
 if not any(a['action_type']==action for a in templates):return unknown
 if card in recovery.DESCRIPTORS:
  cap=recovery.descriptor(card)
  if cap['source_cost']=='quick_time_two':handler='proxy_population_discard_recovery.resolve_quick:own_discard_companion'
 elif card in payments.QUICK_CARDS:
  cap=payments.capability(card)
  routes=((payments.PAYMENT_CARDS,{'payment_modifier'},'payment_modifier'),
   (payments.BOARD_COUNT_CARDS,{'board_count_growth'},'bounded_growth'),
   (payments.IMMEDIATE_CARDS,{'symmetric_draw_growth'},'draw_and_bounded_growth'),
   (payments.CONDITIONAL_CARDS,{'conditional_reward'},'future_growth_modifier'),
   (payments.TARGETED_CARDS,{'targeted_zone_move'},'prepared_equipment_only'),
   (payments.STAT_CARDS,{'stat_modifier'},'main_stat_modifier'))
  for registry,kinds,branch in routes:
   if card in registry and cap['kind'] in kinds:
    if branch=='prepared_equipment_only' and cap['timing'] not in ('public_equipment_removal','own_equipment_revealed_search'):return unknown
    handler='proxy_continuation_payments.resolve:'+branch;break
 elif card in QUICK_TIMINGS:
  cap=rules.classification(card)
  if cap['kind']=='quick' and cap['timing']==QUICK_TIMINGS[card]:
   handler='proxy_continuation_quick.resolve' if card=='E-final-time' else 'proxy_population_chain_resolution.resolve_top'
 if handler is None:return unknown
 if cap['reference']!=known[card]['reference']:raise ValueError('public effect source differs')
 return dict(status='registered_no_person_removal',card_id=card,handler=handler,source_reference=cap['reference'],source_raw_sha256=known[card]['source_raw_sha256'],
  opponent_main_removal=False,opponent_companion_removal=False,effect_execution_proven=False)


# These pinned107 bodies have no opponent main/companion removal operation.
# A family names the existing full-resolution check required by the later join;
# this public classification alone never attests that an effect was executed.
BOARD_ROUTES={
 'draw_effect_audits':frozenset(('M-antlion-02','M-antlion-05','M-antlion-08','P-desert_scorpion','I-bowtie')),
 'zone_effect_audits':frozenset(('C-cat_friend','M-antlion-04')),
 'return_effect_audits':frozenset(('C-bat','M-antlion-06')),
 'typed_resolution_audits':frozenset(('M-antlion-03','P-cliff_goat','M-antlion-07','P-anglerfish')),
 'reveal_effect_audits':frozenset(('C-chicken',)),
 'immediate_growth_audits':frozenset(('W-countryside',)),
 'designated_effect_audits':frozenset(('M-beetle-01','M-beetle-02','P-cat_ceo','I-sleepboost1','W-city'))}


def public_effect_route(envelope,link):
 if link.get('source_zone','hand')!='board':return quick_effect_route(link)
 card=link.get('card_id');unknown=dict(status='unproved',card_id=card,reason='public_effect_route_not_certified')
 families=[family for family,cards in BOARD_ROUTES.items() if card in cards]
 if len(families)!=1:return unknown
 try:
  from proxy_population_activation_reference import validate_reference
  known=sources.catalog()['cards'][card]
  validate_reference(envelope,link)
  if type(link['payment']['time']) is not int or link['payment']['time']!=0 or link['source_references']!=[known['reference']]:return unknown
 except (ValueError,KeyError,TypeError,IndexError,OSError):return unknown
 return dict(status='registered_no_person_removal',card_id=card,handler='current_board_resolution_dispatch',resolution_audit_family=families[0],source_reference=known['reference'],source_raw_sha256=known['source_raw_sha256'],
  opponent_main_removal=False,opponent_companion_removal=False,effect_execution_proven=False,activation_origin_authenticated=False)


def audit(envelope,events,inventory):
 errors=[];verified=[];unproved=[];routes=[];public_unproved=[];equipment=[];verified_equipment=[]
 try:
  for name,digest in SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('prepared predicate source changed')
  # Full-state validation belongs to the existing runtime boundary. This
  # source-local audit validates only public structure and never traverses
  # concealed physical-card records for structural hashes or identity checks.
  c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor']
  if set(g['players'])!={'A','B'} or actor not in ('A','B'):raise ValueError('prepared players differ')
  if ctx['chain_links']!=[l['link_id'] for l in c['activation_zone']] or len(ctx['chain_links'])!=len(set(ctx['chain_links'])):raise ValueError('prepared public chain differs')
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary prepared response entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('prepared response identity differs')
  concealed=[];seen=set()
  for owner,p in g['players'].items():
   for index,s in enumerate(p['board']['prepared']):
    if s in seen:raise ValueError('duplicate prepared source')
    seen.add(s)
    meta=envelope['runtime']['public_prepared'][s]
    if meta['controller']!=owner or type(meta['face_up']) is not bool:raise ValueError('prepared public metadata differs')
    if meta['face_up']:
     attachment=envelope['runtime']['attachments'][s];card=g['cards'][s]['card_id']
     if attachment['controller']!=owner:raise ValueError('equipment controller differs')
     target=attachment['target_instance_id'];board=p['board']
     if target not in [board['main'],board['partner']]+board['companions'] or target is None:raise ValueError('equipment current target absent')
     if card=='I-bond1':
      if target not in board['companions']:raise ValueError('replacement target is not companion')
      known=sources.catalog()['cards'][card];cap=rules.classification(card)
      if cap['timing']!='companion_departure' or cap['reference']!=known['reference']:raise ValueError('replacement source differs')
      equipment.append(dict(source_instance_id=s,target_instance_id=target,controller=owner,source_reference=known['reference'],source_raw_sha256=known['source_raw_sha256']))
     else:public_unproved.append(dict(source_instance_id=s,reason='public_equipment_predicate_separate'))
     continue
    # No hidden identity is inspected, even for the actor's own preparation.
    concealed.append((owner,index,s))
  if concealed or equipment:
   sources.catalog()
   origins=[e for e in events if e['seq']==ctx['origin_event_seq']]
   if len(origins)!=1:raise ValueError('prepared origin absent or ambiguous')
   origin=origins[0];links=c['activation_zone']
   if origin['action_type'] not in NONACTIVATIONS:
    matches=[l for l in links if l['link_id']==origin.get('chain_link_id') and l['source_instance_id']==origin.get('source_instance_id') and l['actor']==origin['actor']]
    if origin['action_type'] not in ('activate_response','use_item','use_play','use_event') or len(matches)!=1:unproved.append(dict(reason='origin_effect_not_bound_to_current_public_link',origin_event_seq=origin['seq']))
   concealed_ids={s for _,_,s in concealed}
   for l in links:
    if l['source_instance_id'] in concealed_ids:raise ValueError('public activation source still concealed')
    physical=g['cards'][l['source_instance_id']]
    if physical['card_id']!=l['card_id'] or physical['card_copy_id']!=l['card_copy_id']:raise ValueError('public effect physical source differs')
    route=public_effect_route(envelope,l);routes.append(dict(link_id=l['link_id'],**route))
    if route['status']=='unproved':unproved.append(dict(link_id=l['link_id'],reason=route['reason']))
  if equipment:
   exclusions=inventory.get('equipment_exclusions',[])
   for row in equipment:
    source=row['source_instance_id']
    expected_row=dict(source_instance_id=source,source_reference=row['source_reference'],reason='certified_origin_does_not_move_an_opponent_companion')
    supplied=[r for r in exclusions if r.get('source_instance_id')==source]
    if supplied!=[expected_row]:raise ValueError('replacement exclusion coverage differs')
    if any(a.get('source_instance_id')==source for a in inventory['legal_candidate_details']):raise ValueError('inactive replacement reoffered')
    if unproved:public_unproved.append(dict(source_instance_id=source,reason='public_effect_route_not_certified'))
    else:verified_equipment.append(dict(row,reason='registered_current_links_do_not_move_companions'))
  public_ids={r['source_instance_id'] for r in equipment+public_unproved}
  if any(r.get('source_instance_id') not in public_ids for r in inventory.get('equipment_exclusions',[])):raise ValueError('foreign equipment exclusion')
  if concealed:
   references=preparation.concealed_pool();expected=[]
   for owner,index,s in concealed:
    row=dict(controller=owner,slot=index,reason='public_origin_has_no_opponent_main_removal_activation',source_references=references)
    if owner==actor:row['source_instance_id']=s
    expected.append(row)
    if any(a.get('source_instance_id')==s for a in inventory['legal_candidate_details']):raise ValueError('inactive preparation reoffered')
   if Counter(map(canonical,inventory.get('preparation_exclusions',[])))!=Counter(map(canonical,expected)):raise ValueError('concealed preparation exclusion coverage differs')
   if not unproved:verified=expected
  elif inventory.get('preparation_exclusions'):raise ValueError('extra concealed exclusion')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='concealed_current_public_effect_predicates.v1',prepared_predicates_verified=not errors and not unproved,
  errors=errors,verified_preparations=verified,equipment_predicates_verified=not errors and not public_unproved,verified_equipment=verified_equipment,equipment_scope='current_replacement_negative_only',public_effect_routes=routes,unproved_public_effects=unproved,unproved_public_equipment=public_unproved,
  scope='current_concealed_negative_only',full_state_validity_proven=False,history_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
