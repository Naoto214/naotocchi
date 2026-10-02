"""Typed one-use payment modifiers with source-bound consumption and expiry."""
import copy,hashlib
from contextlib import contextmanager
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_end as end
import proxy_resource_value_trajectory as old

SCHEMA='naotocchi.card_game.continuation_envelope.v2'
CONTRACT='continuation_contract_v2'
PAYMENT_CARDS={'E-fateful-transform':dict(kind='payment_modifier',timing='next_transform_this_turn',payment_kind='transform',amount=2,base_time_cost=2,reference='91-event-21-card-text-draft.md#E-fateful-transform',semantic_section_sha256='ef900b2c7fb12ea43e45d3f96461ba1884c761a9ccd611b689101dde8bd0accc')}
STAT_CARDS={'E-big-illness':dict(kind='stat_modifier',timing='targeted_main_this_turn',base_time_cost=3,power=-2,wisdom=-2,reference='91-event-21-card-text-draft.md#E-big-illness',semantic_section_sha256='3a74a0e0052b1a431621ec037aa4e11f3245f9f2292fef96ad8c96adc45425a3')}
STAT_CARDS['G-beach-volley']=dict(kind='stat_modifier',timing='targeted_main_this_turn',base_time_cost=1,power=2,wisdom=0,target_owner='own',action_type='use_play',reference='85-play-batch-4-card-text-draft.md#G-beach-volley',semantic_section_sha256='b5ee744b41867910809a7bb3a9635d723f35046afa8dc4da74f83bb85ac4712c')
STAT_CARDS['G-baseball-batting']=dict(kind='stat_modifier',timing='challenge_stat',duration='challenge',base_time_cost=1,power=2,wisdom=0,target_owner='own',action_type='use_play',reference='81-play-batch-2-card-text-draft.md#G-baseball-batting',semantic_section_sha256='b94f20ebca3be90743870b5098258e3f1b51c7cea61805aae85fa76c03aa7330')
STAT_CARDS['G-air-hockey']=dict(kind='stat_modifier',timing='challenge_stat',duration='challenge',base_time_cost=1,amount=-2,choose_parameter=True,action_type='use_play',reference='83-play-batch-3-card-text-draft.md#G-air-hockey',semantic_section_sha256='11f87fb90a904842687d1f434df394cd17e9327723b0694812ef355d759621cb')
TARGETED_CARDS={'G-archery-3d':dict(kind='targeted_zone_move',timing='public_equipment_removal',base_time_cost=2,action_type='use_play',printed_cost_max=2,reference='79-play-batch-1-card-text-draft.md#G-archery-3d',semantic_section_sha256='ab933db236570e3033134ea17add2364f73e6c790d00e05e0f02c2360cee6109')}
TARGETED_CARDS['G-asteroids-classic']=dict(kind='targeted_zone_move',timing='own_equipment_revealed_search',base_time_cost=1,action_type='use_play',target_owner='own',printed_cost_min=3,requires_world=False,reveal_count=5,search_item_cost_max=2,search_maximum=2,reference='83-play-batch-3-card-text-draft.md#G-asteroids-classic',semantic_section_sha256='672dd020245117b4c937a7ea0a6f18cbf61fe563cc9f0978a9fe3ffa697a463a')
CONDITIONAL_CARDS={'G-basketball-3d':dict(kind='conditional_reward',timing='next_main_win_this_turn',base_time_cost=1,amount=10,difference=2,target_owner='own',action_type='use_play',reference='81-play-batch-2-card-text-draft.md#G-basketball-3d',semantic_section_sha256='083274b5ccdd1f713d4a1b6af33bf8eae7dc8cc8a97633e9a43100e9dde5fcc0')}
IMMEDIATE_CARDS={'E-boss':dict(kind='symmetric_draw_growth',timing='after_own_main_loss_this_turn',base_time_cost=2,draw_each=1,growth=5,reference='91-event-21-card-text-draft.md#E-boss',semantic_section_sha256='345f59071659fd615ecd211a35fd049f92c81b6301345fb999e7cd48cd35d2ad')}
BOARD_COUNT_CARDS={'G-area-claim':dict(kind='board_count_growth',timing='board_count_growth',base_time_cost=3,action_type='use_play',minimum=7,bonus_minimum=9,growth=10,bonus_growth=5,reference='85-play-batch-4-card-text-draft.md#G-area-claim',semantic_section_sha256='27ad7f24afb5e80d1b84de188141a3171828a7e3bba32407cad1705a39248436')}
QUICK_CARDS={**BOARD_COUNT_CARDS,**PAYMENT_CARDS,**STAT_CARDS,**TARGETED_CARDS,**CONDITIONAL_CARDS,**IMMEDIATE_CARDS}
BOARD_STATS={card:dict(kind='stat_modifier',timing='challenge_stat',duration='challenge',power=2,wisdom=0,reference=batch.CAPABILITIES[card]['reference'],semantic_section_sha256=batch.CAPABILITIES[card]['semantic_section_sha256']) for card in ('M-antlion-07','P-anglerfish')}
BOARD_STATS['M-antlion-07'].update(power=0,choose_parameter=True,amount=2)
STAT_CARDS.update(BOARD_STATS)
EFFECT_KEYS={'effect_id','controller','source_instance_id','created_event_seq','turn_player','round','payment_kind','amount'}


def capability(card):
 descriptor=copy.deepcopy(({**QUICK_CARDS,**BOARD_STATS})[card]);body,digest=batch.rules.source_section(descriptor['reference'])
 if hashlib.sha256(body.encode()).hexdigest()!=descriptor.pop('semantic_section_sha256'):raise ValueError('effect canonical semantic section changed: '+card)
 return dict(descriptor,source_raw_sha256=digest)


def validate_effects(envelope):
 effects=envelope['runtime']['payment_effects'];g=envelope['legacy_continuation']['game_state'];seen=set()
 if not isinstance(effects,list):raise ValueError('invalid payment effect collection')
 for row in effects:
  if not isinstance(row,dict) or set(row)!=EFFECT_KEYS:raise ValueError('invalid typed payment effect')
  source=row['source_instance_id'];card=g['cards'].get(source,{}).get('card_id');descriptor=PAYMENT_CARDS.get(card)
  if descriptor is None or row['controller'] not in ('A','B') or row['turn_player']!=g['turn_player'] or row['round']!=g['round'] or not state._int(row['created_event_seq']) or row['created_event_seq']>envelope['event_seq'] or row['effect_id']!=f"payment-effect-{row['created_event_seq']}-{source}" or row['effect_id'] in seen or row['amount']!=descriptor['amount'] or type(row['amount']) is not int or row['payment_kind']!=descriptor['payment_kind']:
   raise ValueError('payment effect identity/source/value/expiry differs')
  capability(card);seen.add(row['effect_id'])
 stats=envelope['runtime']['stat_effects']
 if not isinstance(stats,list):raise ValueError('invalid stat effect collection')
 for row in stats:
  keys=(EFFECT_KEYS-{'payment_kind','amount'})|{'target_instance_id','power','wisdom'}
  if not isinstance(row,dict):raise ValueError('invalid typed stat effect')
  descriptor=STAT_CARDS.get(g['cards'].get(row.get('source_instance_id'),{}).get('card_id'),{})
  if descriptor.get('duration')=='challenge':keys|={'challenge_id'}
  if descriptor.get('choose_parameter'):keys|={'parameter'}
  if set(row)!=keys:raise ValueError('invalid typed stat effect')
  if descriptor.get('duration')=='challenge' and row['challenge_id']!=g.get('challenge',{}).get('challenge_id'):raise ValueError('challenge effect lifetime differs')
  expected={k:descriptor.get(k,0) for k in ('power','wisdom')}
  if descriptor.get('choose_parameter'):
   if row['parameter'] not in ('power','wisdom'):raise ValueError('challenge parameter differs')
   expected[row['parameter']]=descriptor['amount']
  source=row['source_instance_id'];card=g['cards'].get(source,{}).get('card_id');d=STAT_CARDS.get(card)
  if d is None or row['controller'] not in ('A','B') or row['target_instance_id'] not in g['cards'] or row['turn_player']!=g['turn_player'] or row['round']!=g['round'] or not state._int(row['created_event_seq']) or row['created_event_seq']>envelope['event_seq'] or row['effect_id']!=f"stat-effect-{row['created_event_seq']}-{source}" or row['effect_id'] in seen or any(type(row[k]) is not int or row[k]!=expected[k] for k in ('power','wisdom')):raise ValueError('stat effect source/target/value/expiry differs')
  capability(card);seen.add(row['effect_id'])

 conditional=envelope['runtime']['conditional_effects']
 if not isinstance(conditional,list):raise ValueError('invalid conditional effect collection')
 for row in conditional:
  if not isinstance(row,dict) or set(row)!=(EFFECT_KEYS-{'payment_kind'})|{'target_instance_id','difference'}:raise ValueError('invalid typed conditional reward')
  descriptor=CONDITIONAL_CARDS.get(g['cards'].get(row['source_instance_id'],{}).get('card_id'))
  if descriptor is None or row['controller'] not in ('A','B') or row['turn_player']!=g['turn_player'] or row['round']!=g['round'] or row['target_instance_id'] not in g['cards'] or not state._int(row['created_event_seq']) or row['created_event_seq']>envelope['event_seq'] or row['effect_id']!=f"conditional-effect-{row['created_event_seq']}-{row['source_instance_id']}" or row['effect_id'] in seen or any(type(row[k]) is not int or row[k]!=descriptor[k] for k in ('amount','difference')):raise ValueError('conditional effect source/target/value/lifetime differs')
  capability(g['cards'][row['source_instance_id']]['card_id']);seen.add(row['effect_id'])


def add_conditional_reward(envelope,controller,source,target):
 game=envelope['legacy_continuation']['game_state'];descriptor=CONDITIONAL_CARDS[game['cards'][source]['card_id']];seq=envelope['event_seq']
 envelope['runtime']['conditional_effects'].append(dict(effect_id=f'conditional-effect-{seq}-{source}',controller=controller,source_instance_id=source,target_instance_id=target,created_event_seq=seq,turn_player=game['turn_player'],round=game['round'],amount=descriptor['amount'],difference=descriptor['difference']))
 validate_effects(envelope)


def consume_win_rewards(envelope,battle,winner,values):
 if winner is None:return 0
 source=battle['participants'][winner];other='B' if winner=='A' else 'A';matches=[r for r in envelope['runtime']['conditional_effects'] if r['controller']==winner and r['target_instance_id']==source]
 envelope['runtime']['conditional_effects']=[r for r in envelope['runtime']['conditional_effects'] if r not in matches]
 return sum(r['amount'] for r in matches if values[winner]-values[other]==r['difference'])


def upgrade(envelope):
 state.validate(envelope)
 if envelope['schema']==SCHEMA and envelope['execution_contract_id']==CONTRACT:return copy.deepcopy(envelope)
 e=copy.deepcopy(envelope);e['schema']=SCHEMA;e['execution_contract_id']=CONTRACT;e['runtime']['payment_effects']=[];e['runtime']['stat_effects']=[];e['runtime']['conditional_effects']=[];state.validate(e);return e


def add_modifier(envelope,controller,source):
 g=envelope['legacy_continuation']['game_state'];descriptor=PAYMENT_CARDS[g['cards'][source]['card_id']];seq=envelope['event_seq']
 envelope['runtime']['payment_effects'].append(dict(effect_id=f'payment-effect-{seq}-{source}',controller=controller,source_instance_id=source,created_event_seq=seq,turn_player=g['turn_player'],round=g['round'],payment_kind=descriptor['payment_kind'],amount=descriptor['amount']))
 validate_effects(envelope)


def add_stat_modifier(envelope,controller,source,target,parameter=None):
 g=envelope['legacy_continuation']['game_state'];d=STAT_CARDS[g['cards'][source]['card_id']];seq=envelope['event_seq']
 row=dict(effect_id=f'stat-effect-{seq}-{source}',controller=controller,source_instance_id=source,target_instance_id=target,created_event_seq=seq,turn_player=g['turn_player'],round=g['round'],power=d.get('power',0),wisdom=d.get('wisdom',0))
 if d.get('duration')=='challenge':row['challenge_id']=g['challenge']['challenge_id']
 if d.get('choose_parameter'):
  if parameter not in ('power','wisdom'):raise ValueError('challenge effect parameter missing')
  row['parameter']=parameter;row[parameter]=d['amount']
 envelope['runtime']['stat_effects'].append(row)
 validate_effects(envelope)


def clear_challenge(envelope,challenge_id):
 envelope['runtime']['stat_effects']=[r for r in envelope['runtime']['stat_effects'] if r.get('challenge_id')!=challenge_id]


def stat_delta(envelope,target):
 return {k:sum(r[k] for r in envelope['runtime']['stat_effects'] if r['target_instance_id']==target) for k in ('power','wisdom')}


def adjust_payment(envelope,unit,proof):
 result=copy.deepcopy(proof)
 if unit['candidate_variant']!='transform' or any(r!='insufficient_time' for r in proof['reason_codes']):return result
 actor=envelope['legacy_continuation']['game_state']['turn_player'];effects=[r for r in envelope['runtime']['payment_effects'] if r['controller']==actor and r['payment_kind']=='transform']
 if not effects:return result
 result['payment_time']=max(0,proof['payment_time']-sum(r['amount'] for r in effects));result['payment_effect_ids']=sorted(r['effect_id'] for r in effects)
 result['reason_codes']=[] if envelope['legacy_continuation']['game_state']['players'][actor]['time']>=result['payment_time'] else ['insufficient_time'];result['legal']=not result['reason_codes']
 return result


def consume(envelope,action):
 ids=action['evidence'].get('payment_effect_ids',[])
 if ids:
  if action['candidate_variant']!='transform':raise ValueError('payment modifier used outside transform')
  envelope['runtime']['payment_effects']=[r for r in envelope['runtime']['payment_effects'] if r['effect_id'] not in ids]


def equipment_targets(game,runtime,actor,card):
 d=TARGETED_CARDS[card];owner=actor if d.get('target_owner')=='own' else 'B' if actor=='A' else 'A';prepared=game['players'][owner]['board']['prepared'];entries=old.start.load_candidate_rows();targets=[]
 if prepared and runtime is None:
  if owner==actor and not any(any(a['action_type']=='attach_item' and d.get('printed_cost_min',0)<=a['base_time_cost']<=d.get('printed_cost_max',float('inf')) for a in entries[game['cards'][s]['card_id']]['actions']) for s in prepared):return []
  raise ValueError('public equipment target metadata unavailable')
 for target in prepared:
  if not runtime['public_prepared'][target]['face_up']:continue
  if target not in runtime['attachments']:raise ValueError('public equipment target relation missing')
  if any(a['action_type']=='attach_item' and d.get('printed_cost_min',0)<=a['base_time_cost']<=d.get('printed_cost_max',float('inf')) for a in entries[game['cards'][target]['card_id']]['actions']):targets.append(target)
 return targets


def board_count(game,actor):
 board=game['players'][actor]['board'];sources=[s for s in (board['main'],*board['companions'],board['partner'],board['world'],*board['prepared']) if s is not None]
 if len(sources)!=len(set(sources)):raise ValueError('board count contains duplicate physical sources')
 return len(sources)


def hand_candidates(current,actor,source,entry,events=None,runtime=None):
 g=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];card=g['cards'][source]['card_id'];descriptor=QUICK_CARDS[card];cap=capability(card);p=g['players'][actor];runtime=runtime or batch.RESPONSE_FULL_RUNTIME
 template=next(a for a in entry['actions'] if a['action_type']==descriptor.get('action_type','use_event'))
 if template['base_time_cost']!=descriptor['base_time_cost'] or template['source_text_reference']!=cap['reference']:raise ValueError('payment card registered cost/source differs')
 if card in BOARD_COUNT_CARDS:
  count=board_count(g,actor);descriptor=BOARD_COUNT_CARDS[card];details=[]
  if count>=descriptor['minimum'] and p['time']>=descriptor['base_time_cost']:
   variant='nine_or_more_cards' if count>=descriptor['bonus_minimum'] else 'seven_or_eight_cards';detail=old.start._hand_detail(g,actor,source,entry,template,variant);details.append(detail)
  return details,dict(card_id=card,reason_code='enumerated_board_count_growth' if details else 'board_count_requirement_unmet',source_reference=cap['reference'])
 if card in TARGETED_CARDS:
  template=next(a for a in entry['actions'] if a['action_type']==descriptor['action_type']);world_required=descriptor.get('requires_world',True);targets=equipment_targets(g,runtime,actor,card) if not world_required or p['board']['world'] is not None else []
  reason='requires_own_world' if world_required and p['board']['world'] is None else 'insufficient_time' if p['time']<template['base_time_cost'] else 'required_public_equipment_target_absent' if not targets else 'enumerated_public_equipment_targets'
  details=[]
  if reason=='enumerated_public_equipment_targets':
   for target in targets:
    detail=old.start._hand_detail(g,actor,source,entry,template);detail.update(candidate_id=old.start.response_id(template['action_type'],source,target_instance_id=target,registered_variants=template['candidate_variants']),target_instance_ids=[target]);details.append(detail)
  return details,dict(card_id=card,reason_code=reason,source_reference=cap['reference'])
 if card in IMMEDIATE_CARDS:
  met=batch.candidates.HISTORY_ADAPTER is not None and actor in batch.candidates.HISTORY_ADAPTER(g,events or [])
  details=[old.start._hand_detail(g,actor,source,entry,template)] if met and p['time']>=template['base_time_cost'] else []
  return details,dict(card_id=card,reason_code='enumerated_public_loss_reward' if details else 'requires_own_main_battle_loss_this_turn',source_reference=cap['reference'])
 if descriptor.get('duration')=='challenge':
  return challenge_hand_candidates(current,actor,source,entry,events or [],runtime)
 opponent='B' if actor=='A' else 'A';target_actor=actor if descriptor.get('target_owner')=='own' else opponent;target=g['players'][target_actor]['board']['main'] if card in STAT_CARDS or card in CONDITIONAL_CARDS else None
 if card=='G-beach-volley':
  proof=__import__('proxy_continuation_public_history').companion_applied(g,events or [],actor)
  if not proof['condition_met']:return [],dict(card_id=card,reason_code='requires_applied_companion_ability_this_turn',source_reference=cap['reference'],condition_proof=proof)
 reason=('required_opponent_main_target_absent' if target is None else 'enumerated_payment_modifier') if card in STAT_CARDS or card in CONDITIONAL_CARDS else 'requires_own_main' if p['board']['main'] is None else 'enumerated_payment_modifier'
 if p['time']<template['base_time_cost']:reason='insufficient_time'
 details=[]
 if reason=='enumerated_payment_modifier':
  detail=old.start._hand_detail(g,actor,source,entry,template)
  if card in STAT_CARDS or card in CONDITIONAL_CARDS:detail.update(candidate_id=old.start.response_id(template['action_type'],source,target_instance_id=target,registered_variants=template['candidate_variants']),target_instance_ids=[target])
  elif detail['target_instance_ids']:raise ValueError('payment modifier unexpectedly targeted')
  details.append(detail)
 return details,dict(card_id=card,reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])


def challenge_hand_candidates(current,actor,source,entry,events,runtime):
 import proxy_continuation_challenge as challenge
 game=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];card=game['cards'][source]['card_id'];cap=capability(card);battle=game.get('challenge');owner=game['players'][actor];other='B' if actor=='A' else 'A'
 template=next(a for a in entry['actions'] if a['action_type']=='use_play');met=bool(battle and battle['status']=='comparing' and all(game['players'][o]['board']['main']==battle['participants'][o] for o in 'AB'))
 if met and card=='G-baseball-batting':
  payload=old.start._payload(current);payload['game_state']=copy.deepcopy(game)
  envelope=dict(schema=state.SCHEMA,execution_contract_id=state.CONTRACT,event_seq=current['last_event_seq'],legacy_continuation=payload,runtime=runtime)
  met=battle['declaring_actor']==actor and battle['parameter']=='power' and challenge.stats(envelope,other)['power']>=challenge.stats(envelope,actor)['power']
 elif met:
  latest=next((e for e in reversed(events) if e['action_type']!='response_pass'),None)
  met=bool(latest and latest['actor']==other and latest['action_type'] in ('use_play','activate_response') and game['cards'].get(latest.get('source_instance_id'),{}).get('card_id','').startswith('G-') and any(l['link_id']==latest.get('chain_link_id') for l in current['activation_zone']))
 if owner['time']<template['base_time_cost']:met=False
 details=[]
 if met:
  target=battle['participants'][actor if STAT_CARDS[card].get('target_owner')=='own' else other]
  for variant in template['candidate_variants']:
   detail=old.start._hand_detail(game,actor,source,entry,template,variant if len(template['candidate_variants'])>1 else None);identifier=old.start.response_id('use_play',source,target_instance_id=target,registered_variants=[variant])
   if STAT_CARDS[card].get('choose_parameter'):identifier+='-variant-'+variant
   detail.update(candidate_id=identifier,target_instance_ids=[target],candidate_variant=variant if STAT_CARDS[card].get('choose_parameter') else None);details.append(detail)
 return details,dict(card_id=card,reason_code='enumerated_challenge_stat' if details else 'challenge_stat_condition_not_met',source_reference=cap['reference'])


def forced_result(before,after,event):
 raw={k:v for k,v in event.items() if k not in end.BIND_KEYS};c=state.current(after)
 return dict(final_continuation_state=old.start._payload(c),last_valid_event_seq=after['event_seq'],new_events=[raw],new_snapshots=[old._snapshot(c)],new_envelopes=[after],new_decisions=[],completed=False)


def transition_event(before,after,kind,actor,**extra):
 a=state.current(before);b=state.current(after)
 return actions.bind_event(before,after,dict(seq=after['event_seq'],action_type=kind,actor=actor,game_state_before_sha256=old.start.opening._stop_state_sha256(a['game_state']),game_state_after_sha256=old.start.opening._stop_state_sha256(b['game_state']),continuation_state_before_sha256=old.start._hash(a),continuation_state_after_sha256=old.start._hash(b),**extra))


def resolve(envelope,initial=None):
 c=state.current(envelope);ctx=c['response_context']
 if ctx['chain_status']!='resolving' or not c['activation_zone']:raise ValueError('payment resolution chain boundary differs')
 link=c['activation_zone'][-1];card=link['card_id'];cap=capability(card)
 if card not in QUICK_CARDS or link['action_type']!=QUICK_CARDS[card].get('action_type','use_event') or (card in PAYMENT_CARDS and link['target_instance_ids']):raise ValueError('payment effect source/target differs')
 after=copy.deepcopy(envelope);after['event_seq']+=1;p=after['legacy_continuation'];p['activation_zone'].pop();p['response_context']['chain_links'].pop();p['game_state']['players'][link['actor']]['discard'].append(link['source_instance_id'])
 if not p['activation_zone']:
  end_return=ctx['source_phase']=='turn_end' or c['game_state']['phase']=='turn_end_response';p['response_context'].update(chain_status='empty',consecutive_passes=2 if end_return else 0);p['game_state']['phase']='turn_end' if end_return else 'normal_action';p['return_target']='turn_end' if end_return else 'normal_action_opportunity'
 applied=None;decisions=[]
 if card in PAYMENT_CARDS:
  add_modifier(after,link['actor'],link['source_instance_id']);applied=copy.deepcopy(after['runtime']['payment_effects'][-1])
 elif card in BOARD_COUNT_CARDS:
  descriptor=BOARD_COUNT_CARDS[card];count=board_count(p['game_state'],link['actor']);growth=descriptor['growth']+(descriptor['bonus_growth'] if count>=descriptor['bonus_minimum'] else 0) if count>=descriptor['minimum'] else 0
  p['game_state']['players'][link['actor']]['growth']+=growth;applied=dict(board_card_count=count,growth_added=growth,effect_applied=growth>0)
 elif card in IMMEDIATE_CARDS:
  drawn={}
  for controller in (link['actor'],'B' if link['actor']=='A' else 'A'):
   owner=p['game_state']['players'][controller];drawn[controller]=owner['deck'][:IMMEDIATE_CARDS[card]['draw_each']];del owner['deck'][:len(drawn[controller])];owner['hand'].extend(drawn[controller])
  p['game_state']['players'][link['actor']]['growth']+=IMMEDIATE_CARDS[card]['growth'];applied=dict(drawn_instance_ids_by_actor=drawn,growth_added=IMMEDIATE_CARDS[card]['growth'],effect_applied=True)
 elif card in CONDITIONAL_CARDS:
  if len(link['target_instance_ids'])!=1:raise ValueError('conditional reward target count differs')
  target=link['target_instance_ids'][0]
  if target==p['game_state']['players'][link['actor']]['board']['main']:
   add_conditional_reward(after,link['actor'],link['source_instance_id'],target);applied=copy.deepcopy(after['runtime']['conditional_effects'][-1])
 elif card in TARGETED_CARDS:
  if len(link['target_instance_ids'])!=1:raise ValueError('equipment removal target count differs')
  target=link['target_instance_ids'][0]
  if target in equipment_targets(p['game_state'],after['runtime'],link['actor'],card):
   descriptor=TARGETED_CARDS[card];controller=link['actor'] if descriptor.get('target_owner')=='own' else 'B' if link['actor']=='A' else 'A';owner=p['game_state']['players'][controller]
   owner['board']['prepared'].remove(target);owner['discard'].append(target);del after['runtime']['attachments'][target];del after['runtime']['public_prepared'][target];applied=dict(target_instance_id=target,effect_applied=True)
   if 'reveal_count' in descriptor:
    if initial is None:raise ValueError('revealed search requires bound initial seed context')
    import proxy_continuation_choices as choices
    revealed=owner['deck'][:descriptor['reveal_count']];entries=old.start.load_candidate_rows()
    eligible=[s for s in revealed if entries[p['game_state']['cards'][s]['card_id']]['card_type']=='item' and any(a['base_time_cost']<=descriptor['search_item_cost_max'] for a in entries[p['game_state']['cards'][s]['card_id']]['actions'])]
    options=choices.revealed_search_options(revealed,eligible,descriptor['search_maximum'])
    decision=choices.resolve(initial,c,link['actor'],options,'revealed_item_search',link['link_id']);decisions.append(decision);chosen=decision['selected_action']['option']
    del owner['deck'][:len(revealed)];owner['hand'].extend(chosen['take']);owner['deck'].extend(chosen['bottom'])
    applied.update(revealed_instance_ids=revealed,taken_instance_ids=chosen['take'],bottom_instance_ids=chosen['bottom'])

 else:
  opponent=link['actor'] if STAT_CARDS[card].get('target_owner')=='own' else 'B' if link['actor']=='A' else 'A'
  if len(link['target_instance_ids'])!=1:raise ValueError('stat modifier target count differs')
  target=link['target_instance_ids'][0]
  if target==p['game_state']['players'][opponent]['board']['main']:
   add_stat_modifier(after,link['actor'],link['source_instance_id'],target,link['candidate_variant']);applied=copy.deepcopy(after['runtime']['stat_effects'][-1])
 state.validate(after)
 event=transition_event(envelope,after,'resolve_targeted_zone_move' if card in TARGETED_CARDS else 'resolve_immediate_effect' if card in IMMEDIATE_CARDS or card in BOARD_COUNT_CARDS else 'resolve_payment_modifier',link['actor'],source_instance_id=link['source_instance_id'],chain_link_id=link['link_id'],source_reference=cap['reference'],created_effect=applied)
 result=forced_result(envelope,after,event);result['new_decisions']=decisions;return result


def resolve_board_stat(envelope):
 c=state.current(envelope);ctx=c['response_context'];link=c['activation_zone'][-1];card=link['card_id']
 if ctx['chain_status']!='resolving' or card not in BOARD_STATS or link.get('source_zone')!='board':raise ValueError('board stat resolution boundary differs')
 after=copy.deepcopy(envelope);after['event_seq']+=1;p=after['legacy_continuation'];p['activation_zone'].pop();p['response_context']['chain_links'].pop();applied=None;battle=p['game_state'].get('challenge')
 if len(link['target_instance_ids'])!=1:raise ValueError('board stat target count differs')
 target=link['target_instance_ids'][0]
 if battle and target==battle['participants'][link['actor']] and target==p['game_state']['players'][link['actor']]['board']['main']:
  add_stat_modifier(after,link['actor'],link['source_instance_id'],target,link['candidate_variant']);applied=copy.deepcopy(after['runtime']['stat_effects'][-1])
 if not p['activation_zone']:
  p['response_context'].update(chain_status='empty',consecutive_passes=0);p['game_state']['phase']='normal_action';p['return_target']='normal_action_opportunity'
 event=transition_event(envelope,after,'resolve_board_stat',link['actor'],source_zone='board',source_instance_id=link['source_instance_id'],chain_link_id=link['link_id'],created_effect=applied,source_reference=capability(card)['reference'])
 return actions.normalize_resolution_result(envelope,forced_result(envelope,after,event))


def expire(envelope):
 c=state.current(envelope);g=c['game_state'];effects=envelope['runtime']['payment_effects']+envelope['runtime']['stat_effects']+envelope['runtime']['conditional_effects']
 if not effects:return None
 if g['phase']!='turn_end' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['consecutive_passes']!=2 or any(p['growth']>=100 or p['reservations'] for p in g['players'].values()):raise ValueError('payment expiry requires closed end with priority proof')
 after=copy.deepcopy(envelope);after['event_seq']+=1;after['runtime']['payment_effects']=[];after['runtime']['stat_effects']=[];after['runtime']['conditional_effects']=[]
 event=transition_event(envelope,after,'expire_payment_modifiers',g['turn_player'],expired_effect_ids=sorted(r['effect_id'] for r in effects),source_reference='64-turn-boundaries-and-victory-timing.md')
 return forced_result(envelope,after,event)


@contextmanager
def scope(initial=None):
 originals=(state.SCHEMA,state.CONTRACT,state.RUNTIME_KEYS,state.create,state.validate,state.visible,candidates.MAIN_TRANSITION_ADAPTER,end.RUNTIME_TRANSITION_VERIFIER,end.verify_new_events,copy.deepcopy(batch.CAPABILITIES),old.reached.provenance.RUNTIME_DURATION_VERIFIER)
 verified=set()
 try:
  batch.CAPABILITIES.update(copy.deepcopy(QUICK_CARDS));state.SCHEMA=SCHEMA;state.CONTRACT=CONTRACT;state.RUNTIME_KEYS=set(state.RUNTIME_KEYS)|{'payment_effects','stat_effects','conditional_effects'}
  def validate(e):
   if e.get('schema')==originals[0] and e.get('execution_contract_id')==originals[1] and set(e.get('runtime',{}))==originals[2]:
    projected=copy.deepcopy(e);projected['schema']=SCHEMA;projected['execution_contract_id']=CONTRACT;projected['runtime']['payment_effects']=[];projected['runtime']['stat_effects']=[];projected['runtime']['conditional_effects']=[];return originals[4](projected)
   originals[4](e);validate_effects(e)
  def create(c,seq):
   e=dict(schema=SCHEMA,execution_contract_id=CONTRACT,event_seq=seq,legacy_continuation=state.legacy._payload(c),runtime=dict(attachments={},ability_uses=[],public_prepared={},payment_effects=[],stat_effects=[],conditional_effects=[]));state.validate(e);return e
  def visible(e,actor):
   v=originals[5](e,actor);v['schema']='naotocchi.card_game.continuation_view.v2';v['runtime']['payment_effects']=copy.deepcopy(e['runtime'].get('payment_effects',[]));v['runtime']['stat_effects']=copy.deepcopy(e['runtime'].get('stat_effects',[]));v['runtime']['conditional_effects']=copy.deepcopy(e['runtime'].get('conditional_effects',[]));return v
  state.validate=validate;state.create=create;state.visible=visible;candidates.MAIN_TRANSITION_ADAPTER=adjust_payment
  def runtime_verify(prior,actual,event,history=None):
   kind=event['action_type']
   if kind in ('resolve_board_stat','resolve_payment_modifier','resolve_immediate_effect','resolve_targeted_zone_move','expire_payment_modifiers'):
    result=resolve_board_stat(prior) if kind=='resolve_board_stat' else actions.normalize_resolution_result(prior,resolve(prior,initial)) if kind in ('resolve_payment_modifier','resolve_immediate_effect','resolve_targeted_zone_move') else expire(prior)
    if result is None or result['new_envelopes'][0]!=actual or result['new_events'][0]!=event:raise ValueError('typed payment effect independent replay differs')
    return True
   if kind=='main_movement':
    inv=candidates.audit(prior,history or []);a=next((a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
    if a is None:return False
    expected,generated=batch.transition(prior,a,history or []);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    return expected==actual and raw==event
   return originals[7](prior,actual,event,history) if originals[7] else False
  end.RUNTIME_TRANSITION_VERIFIER=runtime_verify
  def verify(events,shots,runtime):
   proofs=originals[8](events,shots,runtime);byseq={e['event_seq']:e for e in runtime};verified.clear()
   for event in events:
    if event['action_type'] not in ('resolve_board_stat','resolve_payment_modifier','resolve_immediate_effect','resolve_targeted_zone_move','expire_payment_modifiers'):continue
    runtime_verify(byseq[event['seq']-1],byseq[event['seq']],event,[e for e in events if e['seq']<event['seq']]);card=byseq[event['seq']]['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id'] if 'source_instance_id' in event else None
    ref=capability(card)['reference'] if card else '64-turn-boundaries-and-victory-timing.md';digest=__import__('hashlib').sha256((batch.rules.ROOT/ref.split('#')[0]).read_bytes()).hexdigest()
    proofs.append(dict(event_seq=event['seq'],kind=event['action_type'],card_id=card,source_reference=ref,source_raw_sha256=digest,certain_growth_difference=event.get('created_effect',{}).get('growth_added',0) if card in IMMEDIATE_CARDS or card in BOARD_COUNT_CARDS else 0,duration='verified_runtime_challenge' if STAT_CARDS.get(card,{}).get('duration')=='challenge' else 'verified_runtime_this_turn' if card in PAYMENT_CARDS or card in STAT_CARDS or card in CONDITIONAL_CARDS else 'none'));verified.add(event['seq'])
   if runtime[-1]['runtime']['payment_effects'] or runtime[-1]['runtime']['stat_effects'] or runtime[-1]['runtime']['conditional_effects']:verified.clear()
   return proofs
  end.verify_new_events=verify;old.reached.provenance.RUNTIME_DURATION_VERIFIER=lambda event,rule:event['seq'] in verified and rule['duration'] in ('verified_runtime_this_turn','verified_runtime_challenge')
  yield
 finally:
  state.SCHEMA,state.CONTRACT,state.RUNTIME_KEYS,state.create,state.validate,state.visible,candidates.MAIN_TRANSITION_ADAPTER,end.RUNTIME_TRANSITION_VERIFIER,end.verify_new_events=originals[:9];batch.CAPABILITIES.clear();batch.CAPABILITIES.update(originals[9]);old.reached.provenance.RUNTIME_DURATION_VERIFIER=originals[10]
