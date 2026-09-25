#!/usr/bin/env python3
"""Compare reached safe free placement to two paid options and pass."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_216 as audits
import proxy_new_seed_ability_resolution_215 as states
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_normal_action_candidate_completeness as candidates
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='508036f7c3f2de7fe4985c9de2d3a3be6bd577cd61a9ac7ef3ed7b036e365eab'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-217-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_217.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('217 protected source raw/replay differs')
    proof=json.loads(raw);source=json.loads(saved)
    if len(proof['results'])!=len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('217 candidate inventory differs')
    return proof,source


def no_card_play_this_turn(row):
    path=row['path_id'];seq=None;game=None;cont=None;classified=[]
    for number in range(204,216):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError('217 saved event inventory missing')
        current=next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id']==path)
        batch=current.get('new_events',[])
        if batch==0:batch=[]
        for event in batch:
            if seq is not None and (event['seq']!=seq+1 or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont):
                raise ValueError('217 history hash chain differs')
            seq=event['seq'];game=event['game_state_after_sha256']
            cont=event['continuation_state_after_sha256'];classified.append(event['action_type'])
    if seq!=row['last_valid_event_seq'] or game!=row['final_game_state_sha256'] or \
            cont!=row['final_continuation_state_sha256'] or \
            not {'turn_start_and_egg_draw','egg_exchange_bottom'}.issubset(classified) or \
            any(x not in ('turn_end_completed','turn_start_and_egg_draw','egg_exchange_bottom',
                          'response_pass','activate_response','resolve_board_ability') for x in classified):
        raise ValueError('217 no current card play unproved')
    return {'classified_event_actions':classified,'current_turn_card_plays':0}


def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
        row['final_continuation_state_sha256'])!=(proof['path_id'],
        proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('217 state/audit boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':copy.deepcopy(proof['candidate_ids']),
          'new_events':0,'completed':False,'balance_sample_count':0}
    if proof['next_opportunity']!='normal_action':
        return {**base,'next_opportunity':proof['next_opportunity'],
                'selected_candidate':None,'selected_decision':None,
                'comparison_evidence':None}
    if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
        raise ValueError('217 incomplete normal candidates')
    game=row['final_continuation_state']['game_state'];actor=game['turn_player']
    owner=game['players'][actor];details=proof['legal_candidate_details']
    if game['phase']!='normal_action' or \
            {x['action_type'] for x in details}!={'place_partner','place_world','set_item','pass'} or \
            len(details)!=4 or owner['board']['partner'] or owner['board']['world'] or \
            owner['board']['main'] or owner['person_placed']:
        raise ValueError('217 normal action families differ')
    person=next(x for x in details if x['action_type']=='place_partner')
    source=person['source_instance_id']
    if source not in owner['hand'] or person['card_id']!='P-cat_ceo':
        raise ValueError('217 free person identity differs')
    table=candidates.load_inputs()['candidate_table']
    with placement_scope.partner_placement_scope():
        placement=placement_scope.precedent.opening._placement_for_card(
            source,game['cards'][source],table,owner['board'])
    if placement is None or placement['candidate_id']!=person['candidate_id'] or \
            fallback.validate_safe_free_placement(placement):
        raise ValueError('217 safe free placement differs')
    history=no_card_play_this_turn(row)
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    free={**common,'candidate_id':person['candidate_id'],
          'time_after_certain_resolution':owner['time'],'payment_time':0,
          'card_copy_id':game['cards'][source]['card_copy_id']}
    paid_comparisons=[]
    for action in details:
        kind=action['action_type']
        if kind not in ('place_world','set_item'):continue
        card_id=action['card_id'];instance=action['source_instance_id']
        if instance not in owner['hand']:raise ValueError('217 paid source absent')
        if kind=='place_world':
            section=(ROOT/'89-world-13-card-text-draft.md').read_text().split(
                f'### {card_id} — ',1)[1].split('\n### ',1)[0]
            if card_id!='W-city' or '合計が2枚になった時' not in section or \
                    history['current_turn_card_plays']!=0:
                raise ValueError('217 world immediate trigger unproved')
        else:
            section=(ROOT/'77-current-items-card-text-draft.md').read_text().split(
                f'### {card_id} — ',1)[1].split('\n### ',1)[0]
            if card_id!='I-poop1' or '相手がメインを除去する効果を発動した時' not in section or \
                    owner['board']['main'] is not None:
                raise ValueError('217 item immediate trigger unproved')
        entry=start.load_candidate_rows()[card_id]
        template=next(x for x in entry['actions'] if x['action_type']==kind)
        cost=template['base_time_cost']
        if not 0<cost<=owner['time']:
            raise ValueError('217 paid cost unproved')
        paid={**common,'candidate_id':action['candidate_id'],
              'time_after_certain_resolution':owner['time']-cost,
              'payment_time':cost,'card_copy_id':game['cards'][instance]['card_copy_id']}
        compare=priority.compare_candidates(free,paid)
        if compare['winner']!='left' or compare['decided_at']!='time_after_certain_resolution':
            raise ValueError('217 free placement does not dominate paid')
        paid_comparisons.append({'candidate_id':action['candidate_id'],
                                 'source_reference':('89-world-13-card-text-draft.md#' if kind=='place_world'
                                                      else '77-current-items-card-text-draft.md#')+card_id,
                                 'score':paid,'comparison':compare})
    if len(paid_comparisons)!=2:raise ValueError('217 paid candidate count differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,
             'actor':actor,'actor_turn_index':game['round'],'round':game['round'],
             'phase':'normal_action','decision_kind':'normal_action',
             'choice_kind':'zero_cost_person_placement'}
    decision=fallback.resolve_safe_free_development([placement],context,proof['candidate_ids'])
    if decision.get('resolution_mode')!='safe_free_development' or \
            decision['selected_candidate']!=person['candidate_id']:
        raise ValueError('217 safe free choice differs')
    decision.update({'selected_action':copy.deepcopy(person),
                     'legal_candidate_details':copy.deepcopy(details),
                     'paid_action_comparisons':paid_comparisons,
                     'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    return {**base,'next_opportunity':'selected_normal_placement',
            'selected_candidate':person['candidate_id'],
            'selected_decision':decision,
            'comparison_evidence':{'source_contracts':[107,114,116],
                                   'safe_free':free,'paid_actions':paid_comparisons,
                                   'pass_dominated':True,'history':history}}


def validate_result(result):
    try:
        proof,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        audit=next(x for x in proof['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,audit) else ['217 independent choice differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proof,saved=load_sources()
    rows=[audit_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(x['selected_candidate'] is not None for x in rows)!=1 or \
            any(validate_result(x) for x in rows):
        raise ValueError('217 mixed choice differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('217 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('217: one safe free placement selected against paid world, item, and pass')


if __name__=='__main__':main()
