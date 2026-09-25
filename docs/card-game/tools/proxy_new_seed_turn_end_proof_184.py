#!/usr/bin/env python3
"""Extend protected full histories with two passes and prove four turn ends."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_r2_turn_end_history_181 as history
import proxy_new_seed_end_response_replay_183 as states
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'd1ea8e03315d2170d023750ed49f623f38b8e57a7df65eac3c4ce927e90482bb'
HISTORY_RAW_SHA256 = '9a35e730cac42493cef2030aa215e8d09f2093b411f916ebf5edef9d4cc8ef31'
OUTPUT = ROOT / 'data/proxy-new-seed-turn-end-proof-184-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_turn_end_proof_184.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes(); old = history.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or \
            hashlib.sha256(old).hexdigest() != HISTORY_RAW_SHA256:
        raise ValueError('183 state or 181 history raw differs')
    source = json.loads(raw); baseline = json.loads(old)
    if source['schema'] != states.SCHEMA or baseline['schema'] != history.SCHEMA or \
            source['planned'] != 4 or baseline['planned'] != 4 or \
            source['source_raw_sha256'] != states.SOURCE_RAW_SHA256:
        raise ValueError('184 saved state/history inventory differs')
    return source, baseline


def audit_route(row, old):
    path = row['path_id']; current = row['final_continuation_state']
    if (old['path_id'], old['source_last_valid_event_seq'],
            old['source_game_state_sha256'],old['source_continuation_state_sha256']) != \
            (path,row['source_last_valid_event_seq'],row['source_game_state_sha256'],
             row['source_continuation_state_sha256']):
        raise ValueError('184 prior historical boundary differs')
    seq = old['source_last_valid_event_seq']; game_sha = old['source_game_state_sha256']
    cont_sha = old['source_continuation_state_sha256']
    classified = copy.deepcopy(old['classified_events']); growth = copy.deepcopy(old['growth_trace'])
    events = row['new_events']; snaps = row['new_snapshots']
    if len(events) != len(snaps) or len(events) > 1:
        raise ValueError('184 new event/snapshot inventory differs')
    for event, snap in zip(events, snaps):
        if event['action_type'] != 'response_pass' or event['seq'] != seq + 1 or \
                snap['event_seq'] != event['seq'] or \
                event['game_state_before_sha256'] != game_sha or \
                event['continuation_state_before_sha256'] != cont_sha or \
                event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
            raise ValueError('184 new event/state/hash chain differs')
        now = {actor: snap['game_state']['players'][actor]['growth'] for actor in 'AB'}
        if now != growth[-1]['growth'] or snap['continuation_state']['pending_triggers'] or \
                snap['continuation_state']['activation_zone']:
            raise ValueError('184 response pass growth/pending state differs')
        seq = event['seq']; game_sha = snap['game_state_sha256']
        cont_sha = snap['continuation_state_sha256']
        classified.append({'seq':seq, 'action_type':'response_pass',
                           'source_reference':'119-response-window-contract.md',
                           'growth_delta':{'A':0,'B':0}})
        growth.append({'event_seq':seq,'growth':now})
    if (row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (seq,game_sha,cont_sha) or \
            current['game_state']['phase'] != 'turn_end' or \
            current['return_target'] != 'turn_end' or \
            old['growth_reach_100'] or old['active_expiring_effects'] or old['unresolved_codes']:
        raise ValueError('184 final turn end history differs')
    proof = {'classified_events': classified, 'growth_trace':growth,
             'growth_reach_100':old['growth_reach_100'],
             'active_expiring_effects':old['active_expiring_effects'],
             'unresolved_codes':old['unresolved_codes'], 'source_event_seq':seq}
    stop = {'path_id':path,'last_valid_event_seq':seq,'game_state_sha256':game_sha,
            'continuation_state_sha256':cont_sha,'game_state':current['game_state'],
            'continuation_state':current}
    with board.current_board_scope(): result = precedent.audit_current_turn_end(stop,proof)
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or \
            not all(result['completeness_checks'].values()):
        raise ValueError('184 six-stage current turn-end incomplete')
    return {'path_id':path,'source_last_valid_event_seq':seq,
            'source_game_state_sha256':game_sha,
            'source_continuation_state_sha256':cont_sha,
            'source_round':current['game_state']['round'],
            'classified_events':classified,'growth_trace':growth,
            'growth_reach_100':old['growth_reach_100'],
            'active_expiring_effects':old['active_expiring_effects'],
            'unresolved_codes':old['unresolved_codes'],
            'stage_inventory':result['stage_inventory'],
            'completeness_checks':result['completeness_checks'],
            'contract_stop_codes':result['contract_stop_codes'],
            'turn_end_set_complete':True,'new_events':0,'completed':False,
            'balance_sample_count':0}


def validate_result(result):
    try:
        states_data, baseline = load_sources()
        row = next(x for x in states_data['results'] if x['path_id']==result['path_id'])
        old = next(x for x in baseline['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,old) else ['184 independent provenance differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:
        return [str(error)]


def build_report():
    current, old = load_sources()
    rows = [audit_route(row,next(x for x in old['results'] if x['path_id']==row['path_id']))
            for row in current['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('184 turn-end provenance differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'history_raw_sha256':HISTORY_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('184 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('184: four complete historical six-stage turn ends')


if __name__=='__main__':main()
