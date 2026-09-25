#!/usr/bin/env python3
"""Prove the second priority response candidates and held quick item."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_restart_168 as prior
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='bf20012d1ef3d971c681e4e55fe5e9282d7cde9860c0262163900d712175cb77'
OUTPUT=ROOT/'data/proxy-new-seed-next-response-audit-169-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_next_response_audit_169.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('168 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(row) for row in data['results']):
        raise ValueError('168 event/hash chain differs')
    return data


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    if row['stop_reason_code']=='unproved_selected_quick_use_activation':
        decision=row['new_decisions'][-1];action=decision['selected_action'];actor=ctx['priority_actor']
        if action['action_type']!='use_item' or action['card_id']!='I-c_coin2' or \
                action['candidate_id']!=decision['selected_candidate'] or \
                action['source_instance_id'] not in game['players'][actor]['hand'] or \
                game['players'][actor]['time']<action['base_time_cost'] or \
                not game['players'][actor]['deck'] or ctx['chain_links'] or \
                state['activation_zone'] or state['pending_triggers']:
            raise ValueError('169 selected quick item boundary differs')
        return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
                'source_game_state_sha256':row['final_game_state_sha256'],
                'source_continuation_state_sha256':row['final_continuation_state_sha256'],
                'next_opportunity':'selected_quick_item_activation',
                'candidate_ids':[decision['selected_candidate']],'candidate_set_complete':True,
                'board_exclusions':[],'hand_exclusions':[],
                'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']!='unproved_next_priority_response_candidates' or \
            len(row['new_events'])!=1 or row['new_events'][-1]['action_type']!='response_pass' or \
            ctx['window_kind']!='turn_start' or ctx['consecutive_passes']!=1 or \
            ctx['origin_event_seq']>=row['last_valid_event_seq'] or \
            state['activation_zone'] or state['pending_triggers']:
        raise ValueError('169 second response priority boundary differs')
    actor=ctx['priority_actor'];board=game['players'][actor]['board'];origin=row['new_events'][-1]
    if board['main'] is not None or board['world'] is not None or board['prepared']:
        raise ValueError('169 unproved next priority board source')
    projected=copy.deepcopy(state);excluded=[]
    for instance in board['companions']:
        card_id=game['cards'][instance]['card_id'];_,*fragments=timing.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(x not in section for x in fragments) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               origin['action_type'],origin['actor']):
            raise ValueError('169 companion trigger cannot be excluded')
        excluded.append({'source_instance_id':instance,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions']=[]
    partner=board['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if '自分が名前の異なるセカイへ変更した時' not in section or \
                origin['action_type']!='response_pass':
            raise ValueError('169 partner response trigger not excluded')
        excluded.append({'source_instance_id':partner,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('169 second response candidate not unique')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'next_opportunity':'response_window','candidate_ids':chance['legal_candidate_ids'],
            'candidate_set_complete':True,'board_exclusions':excluded,
            'hand_exclusions':chance['excluded_candidates'],
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(row):
    try:
        original=next(x for x in load_source()['results'] if x['path_id']==row['path_id'])
        return [] if row==audit_route(original) else ['169 independent opportunity differs']
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('169 next response audit differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('169 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('169: 3 unique second passes and 1 selected item activation boundary')


if __name__=='__main__':main()
