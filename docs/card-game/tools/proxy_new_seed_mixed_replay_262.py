#!/usr/bin/env python3
"""Advance one proved turn end through draw, retain three normal routes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_261 as audits
import proxy_new_seed_mixed_replay_260 as states
import proxy_new_seed_turn_end_replay_204 as precedent
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='866a871e178ce572ffaeffd0273891e62d064d0d68f27eb9327f3b1d2fee883e'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-262-20260926.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_262.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('262 protected proof/state raw/replay differs')
    proof=json.loads(raw);source=json.loads(saved)
    if len(proof['results'])!=len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('262 protected source differs')
    return proof,source


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
        row['final_continuation_state_sha256'])!=(proof['path_id'],
        proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('262 source/proof boundary differs')
    if proof['turn_end_set_complete']:
        result=precedent.run_route(row,proof)
        if result['stop_reason_code']!='unproved_current_egg_exchange_choice' or \
                len(result['new_events'])!=len(result['new_snapshots'])!=2:
            raise ValueError('262 next turn transition differs')
        return result
    if proof['next_opportunity']!='normal_action' or not proof['candidate_set_complete'] or \
            row['stop_reason_code']!='unproved_current_normal_action_candidates':
        raise ValueError('262 held normal action differs')
    state=copy.deepcopy(row['final_continuation_state'])
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:
        raise ValueError('262 held state/hash differs')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':row['last_valid_event_seq'],
            'final_game_state_sha256':row['final_game_state_sha256'],
            'final_continuation_state_sha256':row['final_continuation_state_sha256'],
            'final_continuation_state':state,'stop_reason_code':row['stop_reason_code'],
            'new_decisions':[],'new_events':[],'new_snapshots':[],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proof,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        p=next(x for x in proof['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,p) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['262 independent replay differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for index,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=row['last_valid_event_seq']+index or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['262 event/snapshot/hash differs']
            game=snap['game_state_sha256'];cont=snap['continuation_state_sha256']
        if (game,cont)!=(result['final_game_state_sha256'],
                         result['final_continuation_state_sha256']):
            return ['262 final hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proof,saved=load_sources()
    rows=[run_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('262 next turn replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':0,'new_events':2,
            'new_snapshots':2,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('262 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('262: one turn end and draw, three normal routes held')


if __name__=='__main__':main()
