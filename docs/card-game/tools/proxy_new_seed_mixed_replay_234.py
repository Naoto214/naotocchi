#!/usr/bin/env python3
"""Apply three proved turn ends and resolve the held board ability."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_turn_end_proof_233 as proofs
import proxy_new_seed_response_replay_232 as states
import proxy_new_seed_turn_end_replay_204 as turn
import proxy_new_seed_ability_resolution_215 as ability
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=proofs.OUTPUT
SOURCE_RAW_SHA256='cb2dbc7dce2987f7e340500cc600650ce40c281dd8150439a82012f07b968a78'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-234-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_234.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=proofs.SOURCE_RAW_SHA256 or \
            raw!=proofs.canonical_bytes(proofs.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('234 protected proof/state raw differs')
    evidence=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(evidence)!=len(rows)!=4 or any(proofs.validate_result(x) for x in evidence):
        raise ValueError('234 source proof integrity differs')
    return evidence,rows

def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('234 source boundary differs')
    if proof['turn_end_set_complete']:
        result=turn.run_route(row,proof)
        if len(result['new_events'])!=2 or \
                result['stop_reason_code']!='unproved_current_egg_exchange_choice':
            raise ValueError('234 turn end transition differs')
        return result
    if proof['next_opportunity']!='unproved_current_board_ability_chain_resolution' or \
            row['stop_reason_code']!=proof['next_opportunity']:
        raise ValueError('234 held chain differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('234 chain source hash differs')
    after,event=ability.resolve_board_ability(state)
    if event['action_type']!='resolve_board_ability' or \
            after['game_state']['phase']!='normal_action':
        raise ValueError('234 board resolution differs')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':'unproved_current_normal_action_candidates',
            'new_decisions':[],'new_events':[event],
            'new_snapshots':[snapshots.snapshot(after)],
            'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        evidence,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in evidence if x['path_id']==result['path_id'])
        if result!=run_route(row,proof):return ['234 independent replay differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for idx,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=row['last_valid_event_seq']+idx or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['234 event/snapshot/hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        return [] if (game,cont)==(result['final_game_state_sha256'],
                                   result['final_continuation_state_sha256']) else ['234 final hash differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    evidence,rows=load_sources()
    result=[run_route(row,next(x for x in evidence if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or sum(len(x['new_events']) for x in result)!=7 or \
            any(validate_result(x) for x in result):
        raise ValueError('234 mixed replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':7,'new_snapshots':7,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('234 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('234: three turn ends and one board resolution applied')
if __name__=='__main__':main()
