#!/usr/bin/env python3
"""Verify 224 reached phases and record a correction to one stop label."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_replay_224 as states
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='d10754dbcccf34724cdecbc0f5852bc20218ba239740cbcd451a2e3188c8326a'
OUTPUT=ROOT/'data/proxy-new-seed-boundary-225-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_boundary_225.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('225 saved 224 source differs')
    data=json.loads(raw)
    if len(data['results'])!=4 or any(states.validate_result(r) for r in data['results']):
        raise ValueError('225 replay integrity differs')
    return data

def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('225 final hashes differ')
    phase=game['phase'];origin=row['new_events'][0]['action_type'] if row['new_events'] else None
    code=row['stop_reason_code'];corrected=code
    if phase=='post_placement_response' and origin=='response_pass' and \
            ctx['consecutive_passes']==1 and code=='unproved_current_normal_action_candidates':
        corrected='unproved_next_priority_response_candidates'
    elif (phase,origin,code) not in (
            ('response_window',None,'unproved_selected_board_ability_activation'),
            ('response_window','response_pass','unproved_next_priority_response_candidates'),
            ('turn_end_response','normal_pass_end_request','unproved_turn_end_response_candidates')):
        raise ValueError('225 reached boundary differs')
    if len(row['new_events'])!=len(row['new_snapshots']) or \
            row['last_valid_event_seq']!=row['source_last_valid_event_seq']+len(row['new_events']):
        raise ValueError('225 event count differs')
    for event,snap in zip(row['new_events'],row['new_snapshots']):
        if event['seq']!=row['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['source_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['source_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256']:
            raise ValueError('225 event/snapshot continuity differs')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'phase':phase,'origin_action_type':origin,'recorded_stop_reason_code':code,
            'corrected_stop_reason_code':corrected,'event_count':len(row['new_events']),
            'new_events':0,'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['225 independent boundary differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(r['recorded_stop_reason_code']!=r['corrected_stop_reason_code']
                           for r in rows)!=1 or any(validate_result(r) for r in rows):
        raise ValueError('225 boundary correction differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('225 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('225: saved 224 phases and one stop label correction verified')
if __name__=='__main__':main()
