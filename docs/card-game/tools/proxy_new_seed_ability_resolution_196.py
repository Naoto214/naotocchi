#!/usr/bin/env python3
"""Resolve an on-board start ability at the reached response chain."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_pass_195 as prior
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='b24799d035f8980b136bd8db0d0506eba0e2956db437ab7f76aa1ca2726a4588'
OUTPUT=ROOT/'data/proxy-new-seed-ability-resolution-196-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_ability_resolution_196.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('196 protected 195 raw/replay differs')
    source=json.loads(raw)
    if source['schema']!=prior.SCHEMA or len(source['results'])!=4 or \
            any(prior.validate_result(x) for x in source['results']):
        raise ValueError('196 source integrity differs')
    return source


def resolve_board_ability(before):
    ctx=before['response_context'];links=before['activation_zone']
    if before['game_state']['phase']!='response_window' or ctx['chain_status']!='resolving' or \
            len(ctx['chain_links'])!=1 or len(links)!=1 or \
            ctx['chain_links']!=[links[0]['link_id']] or before['pending_triggers']:
        raise ValueError('196 unproved ability resolution chain')
    link=links[0];actor=link['actor'];source=link['source_instance_id']
    owner=before['game_state']['players'][actor]
    if link['action_type']!='activate_board_ability' or link['source_zone']!='board' or \
            link['card_id']!='C-chicken' or link['payment']!={'time':0} or \
            link['target_instance_ids'] or link['candidate_variant'] is not None or \
            source not in owner['board']['companions'] or \
            before['game_state']['cards'][source]['card_id']!=link['card_id'] or \
            not owner['deck'] or ctx['window_kind']!='turn_start':
        raise ValueError('196 reached C-chicken board source differs')
    text=(ROOT/'72-companion-26-card-text-draft.md').read_text().split('### C-chicken — ',1)[1].split('\n### ',1)[0]
    if '山札上1枚を公開する。それがなかまカードなら、手札に加える' not in text or \
            'なかま以外は移動させず、その位置へ戻す' not in text:
        raise ValueError('196 C-chicken approved effect differs')
    after=copy.deepcopy(before);target=after['game_state']['players'][actor]
    revealed=target['deck'][0];card=after['game_state']['cards'][revealed]
    registered=start.load_candidate_rows().get(card['card_id'])
    if registered is None or registered['card_type'] not in start.VARIANTS:
        raise ValueError('196 revealed card category unregistered')
    matched=registered['card_type']=='companion'
    if matched:
        target['deck'].pop(0);target['hand'].append(revealed)
    after['activation_zone'].pop();after['response_context']['chain_links'].pop()
    after['response_context']['chain_status']='empty'
    after['response_context']['consecutive_passes']=0
    after['return_target']='normal_action_opportunity'
    after['game_state']['phase']='normal_action'
    after['last_event_seq']+=1
    after['continuation_state_sha256']=start._hash(after)
    event={'seq':after['last_event_seq'],'action_type':'resolve_board_ability','actor':actor,
           'source_instance_id':source,'source_zone':'board','chain_link_id':link['link_id'],
           'payment':copy.deepcopy(link['payment']),
           'result':{'revealed_instance_id':revealed,'revealed_card_type':registered['card_type'],
                     'drawn_instance_id':revealed if matched else None,
                     'source_destination':'board'},
           'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    normal._verify_step(before,after,[event])
    return after,event


def run_route(row):
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('196 source continuation hash differs')
    if row['stop_reason_code']=='unproved_current_board_ability_chain_resolution':
        after,event=resolve_board_ability(state)
        events=[event];shots=[snapshots.snapshot(after)]
        reason='unproved_current_normal_action_candidates'
    elif row['stop_reason_code'] in ('unproved_next_priority_response_candidates',
                                     'unproved_current_turn_end_provenance'):
        after=state;events=[];shots=[];reason=row['stop_reason_code']
    else:raise ValueError('196 held route differs')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[],'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(source) or result['last_valid_event_seq']!=source['last_valid_event_seq']+len(result['new_events']):
            return ['196 independent replay differs']
        game=source['final_game_state_sha256'];cont=source['final_continuation_state_sha256']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['game_state_before_sha256']!=game or event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['196 event/snapshot hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(row) for row in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('196 board ability replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':0,'new_events':1,
            'new_snapshots':1,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('196 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('196: board ability revealed top, noncompanion retained; 0 completed')


if __name__=='__main__':main()
