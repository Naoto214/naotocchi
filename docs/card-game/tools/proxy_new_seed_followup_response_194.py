#!/usr/bin/env python3
"""Prove complete pass-only response candidates at four mixed windows."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_current_restart_193 as states
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='92b53d8b241e8512d6ef9c7ff35ad325bdb7a2d0b6cd8bd9988d6ea6af6474a4'
OUTPUT=ROOT/'data/proxy-new-seed-followup-response-194-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_followup_response_194.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256:
        raise ValueError('194 protected 193 raw differs')
    result=json.loads(raw)
    if result['schema']!=states.SCHEMA or len(result['results'])!=4 or \
            any(states.validate_result(x) for x in result['results']):
        raise ValueError('194 source state/hash differs')
    return result


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    actor=ctx['priority_actor'];owner=game['players'][actor];board_state=owner['board']
    phase=game['phase'];origin=row['new_events'][0]
    if phase not in ('post_placement_response','response_window','turn_end_response') or \
            ctx['origin_event_seq']>row['last_valid_event_seq'] or \
            state['pending_triggers'] or board_state['prepared'] or \
            board_state['main'] is not None or board_state['world'] is not None:
        raise ValueError('194 current response boundary differs')
    if phase=='post_placement_response' and \
            (origin['action_type']!='place_partner' or ctx['consecutive_passes']!=0):
        raise ValueError('194 post-placement origin differs')
    if phase=='turn_end_response' and \
            (origin['action_type']!='normal_pass_end_request' or \
             ctx['consecutive_passes']!=1 or state['return_target']!='turn_end'):
        raise ValueError('194 turn-end response origin differs')
    if phase=='response_window' and \
            (origin['action_type']!='response_pass' or \
             ctx['chain_status']!='building' or ctx['consecutive_passes']!=1 or \
             len(state['activation_zone'])!=1):
        raise ValueError('194 chain response origin differs')
    projected=copy.deepcopy(state);removed=[];board_excluded=[]
    rows=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('194 missing hand candidate table')
        action=next((x for x in entry['actions'] if x['action_type'] in
                     ('use_play','use_item','use_event')),None)
        if action is None or owner['time']<action['base_time_cost']:
            continue
        exclusion=conditional.conditional_exclusion(card_id,game,actor)
        if exclusion:
            removed.append({'source_instance_id':instance,**exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in board_state['companions']:
        card_id=game['cards'][instance]['card_id']
        _,*fragments=timing.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(x not in section for x in fragments) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               origin['action_type'],origin['actor']):
            raise ValueError('194 companion response cannot be excluded')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_excluded.append({'source_instance_id':instance,'card_id':card_id,
                               'reason_code':'trigger_condition_not_met'})
    partner=board_state['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if card_id=='P-cat_ceo':
            if '交際を始めた時、発動する' not in section or \
                    'たまご中は元の関係を保ち、こいびとの能力を無効に' not in \
                    (ROOT/'66-relationship-start-and-romance-profile.md').read_text() or \
                    board_state['main'] is not None:
                raise ValueError('194 egg suppression proof differs')
            reason='partner_ability_disabled_during_egg'
        elif card_id in board.PARTNER_TRIGGERS and \
                board.PARTNER_TRIGGERS[card_id] in section and \
                origin['action_type'] in ('normal_pass_end_request','response_pass'):
            reason='trigger_condition_not_met'
        else:raise ValueError('194 partner ability timing unclassified')
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
        board_excluded.append({'source_instance_id':partner,'card_id':card_id,
                               'reason_code':reason})
    projected['game_state']['phase']='response_window'
    projected['response_context']['window_kind']='turn_start'
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or \
            not chance['candidate_set_complete']:
        raise ValueError('194 response candidate completeness differs')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'current_phase':phase,'candidate_ids':['response-pass'],
            'candidate_set_complete':True,'board_exclusions':board_excluded,
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['194 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('194 mixed response opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('194 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('194: four complete mixed response windows; each unique pass')


if __name__=='__main__':main()
