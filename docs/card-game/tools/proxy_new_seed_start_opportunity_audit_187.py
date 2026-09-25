#!/usr/bin/env python3
"""Enumerate current start responses including reached conditional hand cards."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_egg_exchange_replay_186 as states
import proxy_new_seed_turn_end_replay_185 as previous
import proxy_new_seed_start_audit_166 as precedent
import proxy_board_ability_id_167 as identifiers
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='b0796fd2b5890ee53bb304b29857264665e8cd1954a769b6e7d9f1557b6383fe'
OUTPUT=ROOT/'data/proxy-new-seed-start-opportunity-audit-187-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_opportunity_audit_187.v1'
CONDITIONS={
    'E-final-time':('91-event-21-card-text-draft.md',
        '自分のメインが⑧、または現在のラウンドがR10の場合','requires_main_eight_or_r10'),
    'G-animal-shogi':('83-play-batch-3-card-text-draft.md',
        '自分の捨て札のなかま1枚を対象','requires_own_discarded_companion'),
}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes();previous_raw=previous.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(previous_raw).hexdigest()!=states.SOURCE_RAW_SHA256:
        raise ValueError('187 protected source raw differs')
    data=json.loads(raw);earlier=json.loads(previous_raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            len(earlier['results'])!=4 or any(states.validate_result(x) for x in data['results']):
        raise ValueError('187 protected state or previous board differs')
    return data,earlier


def audit_route(row,former):
    state=copy.deepcopy(row['final_continuation_state']);game=state['game_state'];ctx=state['response_context']
    actor=ctx['priority_actor'];owner=game['players'][actor];on_board=owner['board']
    if game['phase']!='response_window' or game['round']!=2 or \
            ctx['window_kind']!='turn_start' or ctx['turn_player']!=actor or \
            ctx['origin_event_seq']!=row['last_valid_event_seq'] or \
            row['new_events'][0]['action_type']!='egg_exchange_bottom' or \
            state['activation_zone'] or state['pending_triggers'] or \
            on_board['main'] is not None or on_board['world'] is not None or on_board['prepared']:
        raise ValueError('187 current response boundary differs')
    original=former['final_continuation_state']['game_state']['players'][actor]['board']
    if on_board!=original:
        raise ValueError('187 board identity changed in egg exchange')
    projected=copy.deepcopy(state);removed=[];board_excluded=[];board_legal=[]
    entries=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=entries.get(card_id)
        if entry is None:raise ValueError('187 missing candidate table source')
        action=next((x for x in entry['actions'] if x['action_type'] in
                     ('use_play','use_item','use_event')),None)
        if action is None or owner['time']<action['base_time_cost']:
            continue
        if card_id not in CONDITIONS:
            continue
        filename,fragment,reason=CONDITIONS[card_id]
        text=(ROOT/filename).read_text();section=text.split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if fragment not in section:raise ValueError('187 conditional hand source differs')
        if card_id=='E-final-time':
            if game['round']==10 or on_board['main'] is not None:
                raise ValueError('187 final-time stage needs distinct proof')
        elif any(game['cards'][other]['card_id'].startswith('C-')
                 for other in owner['discard']):
            raise ValueError('187 animal-shogi target requires variant proof')
        removed.append({'source_instance_id':instance,'card_id':card_id,
                        'reason_code':reason,'source_reference':filename+'#'+card_id})
        projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in on_board['companions']:
        card_id=game['cards'][instance]['card_id']
        if card_id not in timing.TRIGGERS:raise ValueError('187 unclassified board companion')
        _,*fragments=timing.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(x not in section for x in fragments):
            raise ValueError('187 board companion body differs')
        eligible=timing.matches(card_id,'turn_start',actor,ctx['turn_player'],'turn_start',actor)
        if eligible:
            board_legal.append({'candidate_family':'triggered_ability','card_id':card_id,
                                'source_instance_id':instance,'source_reference':
                                '72-companion-26-card-text-draft.md#'+card_id})
        else:
            board_excluded.append({'source_instance_id':instance,'card_id':card_id,
                                   'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions']=[]
    partner=on_board['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        if card_id not in board.PARTNER_TRIGGERS:
            raise ValueError('187 unclassified board partner')
        section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if board.PARTNER_TRIGGERS[card_id] not in section or \
                '発動できる' not in section:
            raise ValueError('187 partner response source differs')
        board_excluded.append({'source_instance_id':partner,'card_id':card_id,
                               'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,entries)
    if not chance['candidate_set_complete'] or len(chance['legal_candidate_ids'])!=len(
            set(chance['legal_candidate_ids'])):
        raise ValueError('187 hand response candidates incomplete')
    grouped={}
    for ability in board_legal:
        grouped.setdefault(ability['source_instance_id'],[]).append(ability)
    board_details=[]
    for instance,abilities in grouped.items():
        identifier=identifiers.board_ability_response_id(instance,len(abilities))
        board_details.append({'candidate_id':identifier,
            'candidate_family':'triggered_ability','action_type':'activate_board_ability',
            'source_instance_id':instance,'card_id':abilities[0]['card_id'],
            'source_references':[abilities[0]['source_reference']]})
    ids=sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in board_details])
    if len(ids)!=len(set(ids)):
        raise ValueError('187 response namespace collision')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'candidate_ids':ids,'hand_candidate_ids':chance['legal_candidate_ids'],
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],
            'board_candidate_details':board_details,'board_exclusions':board_excluded,
            'candidate_set_complete':True,'new_events':0,'completed':False,
            'balance_sample_count':0}


def validate_result(result):
    try:
        current,previous_data=load_source()
        row=next(x for x in current['results'] if x['path_id']==result['path_id'])
        former=next(x for x in previous_data['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,former) else ['187 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    current,previous_data=load_source()
    rows=[audit_route(row,next(x for x in previous_data['results'] if x['path_id']==row['path_id']))
          for row in current['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('187 start opportunity audit differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,
            'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('187 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('187: 4 complete start opportunities; one board ability candidate')


if __name__=='__main__':main()
