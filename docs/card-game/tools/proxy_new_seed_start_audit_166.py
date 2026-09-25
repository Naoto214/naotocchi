#!/usr/bin/env python3
"""Audit current hand and board sources at four post-exchange start windows."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_egg_restart_165 as prior
import proxy_new_seed_turn_end_restart_164 as turn
import proxy_board_trigger_audit_144 as triggers
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='e8e1f3347161b8fd448b08c41960178d1e3cdd38b5c216c52610072e125ee90d'
OUTPUT=ROOT/'data/proxy-new-seed-start-audit-166-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_audit_166.v1'
CONDITIONAL={
 'E-final-time':('91-event-21-card-text-draft.md','自分のメインが⑧、または現在のラウンドがR10の場合','requires_main_eight_or_r10'),
 'G-archery-3d':('79-play-batch-1-card-text-draft.md','自分にセカイがある場合','requires_own_world'),
 'E-fateful-transform':('91-event-21-card-text-draft.md','自分のメインがいる場合','requires_own_main'),
 'G-asteroids-classic':('83-play-batch-3-card-text-draft.md','自分の準備枠の時コスト3以上の装備カード1枚','requires_own_prepared_target'),
}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('165 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('165 state/hash chain differs')
    return data


@lru_cache(maxsize=1)
def previous_board_states():
    raw=turn.OUTPUT.read_bytes()
    if raw!=turn.canonical_bytes(turn.build_report()):
        raise ValueError('164 protected board source differs')
    return json.loads(raw)['results']


@lru_cache(maxsize=1)
def candidate_rows():
    return start.load_candidate_rows()


def conditional_exclusion(card_id,game,actor):
    if card_id not in CONDITIONAL:return None
    filename,fragment,reason=CONDITIONAL[card_id]
    section=(ROOT/filename).read_text().split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]
    if fragment not in section:raise ValueError('166 quick-use card text differs: '+card_id)
    board=game['players'][actor]['board']
    main=board['main']
    if card_id=='E-final-time':
        # The two terminal prerequisites are public and neither is present.
        if game['round']==10 or main is not None:
            raise ValueError('166 E-final-time main stage needs separate proof')
    elif card_id=='G-archery-3d':
        if board['world'] is not None:raise ValueError('166 archery world needs target proof')
    elif card_id=='E-fateful-transform':
        if main is not None:raise ValueError('166 transform own main needs proof')
    elif card_id=='G-asteroids-classic':
        if board['prepared']:raise ValueError('166 asteroids prepared target needs proof')
    return {'card_id':card_id,'reason_code':reason,'source_reference':f'{filename}#{card_id}'}


def audit_route(row):
    state=copy.deepcopy(row['final_continuation_state']);game=state['game_state']
    ctx=state['response_context'];actor=ctx['priority_actor'];board=game['players'][actor]['board']
    if game['phase']!='response_window' or ctx['window_kind']!='turn_start' or \
            ctx['turn_player']!=actor or ctx['origin_event_seq']!=row['last_valid_event_seq'] or \
            row['new_events'][0]['action_type']!='egg_exchange_bottom' or \
            state['activation_zone'] or state['pending_triggers']:
        raise ValueError('166 start response boundary differs')
    if board['main'] is not None or board['partner'] is not None or board['world'] is not None or board['prepared']:
        raise ValueError('166 unproved start board source')
    projected=copy.deepcopy(state);removed=[]
    hand=game['players'][actor]['hand'];rows=candidate_rows()
    for instance in hand:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('166 missing 114 candidate source')
        actions=entry['actions'];action=next((x for x in actions if x['action_type'] in ('use_play','use_item','use_event')),None)
        if action is None or game['players'][actor]['time']<action['base_time_cost']:
            continue
        exclusion=conditional_exclusion(card_id,game,actor)
        if exclusion is not None:
            removed.append({'source_instance_id':instance,**exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    board_excluded=[];board_legal=[]
    former=next(x for x in previous_board_states() if x['path_id']==row['path_id'])
    for instance in board['companions']:
        card_id=game['cards'][instance]['card_id']
        if card_id not in triggers.TRIGGERS:raise ValueError('166 board timing not registered')
        _,*fragments=triggers.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(x not in section for x in fragments) or \
                instance not in former['final_continuation_state']['game_state']['players'][actor]['board']['companions']:
            raise ValueError('166 board existed or source text differs')
        if card_id=='C-chicken' and triggers.matches(card_id,'turn_start',actor,ctx['turn_player'],
                                                     'turn_start',actor):
            board_legal.append({'candidate_family':'triggered_ability','card_id':card_id,
                                'source_instance_id':instance,
                                'source_reference':'72-companion-26-card-text-draft.md#C-chicken'})
        elif card_id=='C-bat' and not triggers.matches(card_id,'turn_start',actor,ctx['turn_player'],
                                                      'egg_exchange_bottom',actor):
            board_excluded.append({'card_id':card_id,'source_instance_id':instance,
                                   'reason_code':'opponent_quick_use_condition_not_met'})
        else:raise ValueError('166 board response condition needs proof')
    projected['game_state']['players'][actor]['board']['companions']=[]
    opportunity=start.enumerate_opportunity(projected,actor,rows)
    if not opportunity['candidate_set_complete'] or len(opportunity['legal_candidate_ids'])!=len(set(opportunity['legal_candidate_ids'])):
        raise ValueError('166 hand response enumeration incomplete')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'hand_candidate_ids':opportunity['legal_candidate_ids'],
            'hand_conditional_exclusions':removed,'hand_other_exclusions':opportunity['excluded_candidates'],
            'board_exclusions':board_excluded,'board_legal_without_id':board_legal,
            'hand_candidate_set_complete':True,
            'candidate_set_complete':not board_legal,
            'missing_contract':'triggered_ability_response_id_unestablished' if board_legal else None,
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(row):
    try:
        origin=next(x for x in load_source()['results'] if x['path_id']==row['path_id'])
        return [] if row==audit_route(origin) else ['166 independent start audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('166 start response audit differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('166 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('166: 4 start response audits; C-chicken ability ID unresolved, 0 events')


if __name__=='__main__':main()
