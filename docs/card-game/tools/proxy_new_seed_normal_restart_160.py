#!/usr/bin/env python3
"""Apply current uniquely selected normal passes; preserve the held turn end."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_audit_159 as prior
import proxy_new_seed_normal_restart_147 as precedent
import proxy_new_seed_response_restart_158 as states
import proxy_start_response_138 as start
import proxy_normal_action_seeded_restart as normal

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='68d5f4ddf333c1c3f1494b231d0e0ee2aef14d81b74ba4adaff243152127b805'
OUTPUT=ROOT/'data/proxy-new-seed-normal-restart-160-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_restart_160.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('159 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('159 current candidates differ')
    return data


def snapshot(state):
    return {'event_seq':state['last_event_seq'], 'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
        row['final_continuation_state_sha256'])!=(proof['path_id'],
        proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('159/158 current source differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('158 continuation SHA differs')
    decisions=[];events=[];snaps=[]
    if proof['next_opportunity']=='normal_action':
        details=proof['legal_candidate_details']
        only_pass=proof['candidate_ids']==['pass']
        paid_birth_and_pass=(len(details)==2 and {x['action_type'] for x in details}==
                             {'play_main','pass'} and next(x for x in details if
                             x['action_type']=='play_main')['candidate_variant']=='birth')
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()) or \
                not (only_pass or paid_birth_and_pass):
            raise ValueError('160 normal candidate choice not proven')
        decision=precedent.choose(row,proof)
        if decision['selected_candidate']!='pass' or decision['resolution_mode']!='priority_unique':
            raise ValueError('160 normal pass selection differs')
        after,generated=normal.transition(state,decision,{'candidate_table':
            prior.normal.normal_audit.normal.candidate.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        decisions=[decision];events=[{k:copy.deepcopy(v) for k,v in e.items()
            if k!='_snapshot_after'} for e in generated];snaps=[snapshot(after)];state=after
        reason='unproved_next_response_candidates'
    else:
        if proof['next_opportunity']!='turn_end' or state['game_state']['phase']!='turn_end':
            raise ValueError('160 held turn end boundary differs')
        reason=row['stop_reason_code']
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':events,'new_snapshots':snaps,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        saved=json.loads(states.OUTPUT.read_bytes())
        if states.OUTPUT.read_bytes()!=states.canonical_bytes(states.build_report()):
            raise ValueError('158 protected replay differs')
        source=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(source,proof) or result['last_valid_event_seq']!= \
                source['last_valid_event_seq']+len(result['new_events']):
            return ['160 independent replay differs']
        game=source['final_game_state_sha256'];cont=source['final_continuation_state_sha256']
        for offset,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=source['last_valid_event_seq']+offset or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['160 event/snapshot hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        if game!=result['final_game_state_sha256'] or cont!=result['final_continuation_state_sha256']:
            return ['160 final hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    raw=states.OUTPUT.read_bytes()
    if raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('158 protected source differs')
    saved=json.loads(raw)
    proofs=load_source()['results']
    rows=[run_route(row,proof) for row,proof in zip(saved['results'],proofs)]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('160 independent normal replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':3,'new_events':3,
            'new_snapshots':3,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('160 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('160: 3 normal passes, 1 held turn end, 0 completed')


if __name__=='__main__':main()
