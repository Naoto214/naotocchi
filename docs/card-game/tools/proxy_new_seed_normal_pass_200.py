#!/usr/bin/env python3
"""Apply two priority-proved normal passes and retain two turn ends."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_choice_199 as choices
import proxy_new_seed_followup_pass_197 as states
import proxy_new_seed_normal_audit_198 as audits
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='5443e10baa89407a4f99ca180c7b9da466005b778dd0dd1a533bc53b12d1feb0'
OUTPUT=ROOT/'data/proxy-new-seed-normal-pass-200-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_pass_200.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();original=states.OUTPUT.read_bytes();inventory=audits.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(original).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            hashlib.sha256(inventory).hexdigest()!=choices.SOURCE_RAW_SHA256 or \
            raw!=choices.canonical_bytes(choices.build_report()):
        raise ValueError('200 protected priority/state/audit raw differs')
    proof=json.loads(raw);source=json.loads(original);audit=json.loads(inventory)
    if proof['schema']!=choices.SCHEMA or source['schema']!=states.SCHEMA or \
            audit['schema']!=audits.SCHEMA or len(proof['results'])!=4 or \
            any(choices.validate_result(x) for x in proof['results']):
        raise ValueError('200 saved priority proof differs')
    return proof,source,audit


def run_route(row,proof,audit):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or \
            (row['path_id'],row['last_valid_event_seq'])!=(audit['path_id'],
            audit['source_last_valid_event_seq']):
        raise ValueError('200 priority/state boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('200 source state hash differs')
    decisions=[];events=[];shots=[]
    if proof['next_opportunity']=='selected_normal_pass':
        if proof['selected_candidate']!='pass' or proof['comparison']['winner']!='left' or \
                not audit['candidate_set_complete'] or not all(audit['completeness_checks'].values()):
            raise ValueError('200 priority pass proof differs')
        detail=next(x for x in audit['legal_candidate_details'] if x['action_type']=='pass')
        others=[x for x in audit['candidate_ids'] if x!='pass']
        if len(others)!=1 or proof['candidate_ids']!=audit['candidate_ids']:
            raise ValueError('200 normal candidate inventory differs')
        decision={'decision_kind':'normal_action','resolution_mode':'priority_unique',
                  'reason_code':'time_balance','strategic_unresolved':False,
                  'legal_candidates':copy.deepcopy(audit['candidate_ids']),
                  'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
                  'candidate_set_complete':True,'selected_candidate':'pass',
                  'selected_action':copy.deepcopy(detail),'runner_up_candidates':others,
                  'seed_context':None,'seed_proof':None,
                  'priority_comparison':copy.deepcopy(proof['comparison']),
                  'pre_game_state_sha256':row['final_game_state_sha256'],
                  'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                  'event_seq':row['last_valid_event_seq']}
        after,generated=normal.transition(state,decision,{'candidate_table':
            candidates.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or after['game_state']['phase']!='turn_end_response':
            raise ValueError('200 normal pass transition differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        decisions=[decision];events=[event];shots=[snapshots.snapshot(after)]
        reason='unproved_turn_end_response_candidates'
    elif proof['next_opportunity']=='turn_end_provenance':
        after=state;reason=row['stop_reason_code']
    else:raise ValueError('200 normal selection unclassified')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved,audits_data=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        audit=next(x for x in audits_data['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof,audit) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['200 independent normal pass replay differs']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=result['last_valid_event_seq'] or \
                    event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                    event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
                return ['200 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proof,saved,audit=load_sources()
    rows=[run_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']),
                    next(x for x in audit['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('200 normal pass replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':2,'new_events':2,
            'new_snapshots':2,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('200 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('200: two normal passes enter end response; two turn ends held')


if __name__=='__main__':main()
