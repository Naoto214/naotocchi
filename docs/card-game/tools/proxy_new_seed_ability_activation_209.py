#!/usr/bin/env python3
"""Activate one reached board ability and apply three unique priority passes."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_response_audit_208 as audits
import proxy_new_seed_start_choice_207 as states
import proxy_new_seed_ability_activation_190 as board
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='25147df1d67b954f1be04d813ccf69bf586c7df51946e1c398af94ef2df3bee1'
OUTPUT=ROOT/'data/proxy-new-seed-ability-activation-209-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_ability_activation_209.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()):
        raise ValueError('209 protected response audit/state raw differs')
    proof=json.loads(raw);source=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or source['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('209 selected source inventory differs')
    return proof,source


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('209 source state/audit boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('209 source continuation differs')
    decisions=[]
    if proof['next_opportunity']=='selected_board_ability_activation':
        if len(row['new_decisions'])!=1 or row['new_events'] or \
                row['new_decisions'][0]['selected_candidate']!=proof['candidate_ids'][0]:
            raise ValueError('209 selected ability source differs')
        after,event=board.activate_board_ability(state,row['new_decisions'][0],proof)
        reason='unproved_current_chain_response_candidates'
    elif proof['next_opportunity']=='response_window':
        ctx=state['response_context'];actor=ctx['priority_actor']
        if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete'] or \
                ctx['consecutive_passes']!=1:
            raise ValueError('209 next priority pass proof differs')
        projected=copy.deepcopy(state);owner=projected['game_state']['players'][actor]
        for excluded in proof['hand_conditional_exclusions']:
            owner['hand'].remove(excluded['source_instance_id'])
        for excluded in proof['board_exclusions']:
            instance=excluded['source_instance_id'];board_state=owner['board']
            if instance in board_state['companions']:board_state['companions'].remove(instance)
            elif board_state['partner']==instance:
                board_state['partner']=None;board_state['partner_stage']=None
            else:raise ValueError('209 projected board exclusion differs')
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
                chance['excluded_candidates']!=proof['hand_other_exclusions']:
            raise ValueError('209 complete response candidate proof differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('209 unique pass choice differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after,event,_=start._pass(state,actor)
        normal._verify_step(state,after,[event]);decisions=[decision]
        reason='unproved_current_normal_action_candidates'
    else:raise ValueError('209 next opportunity unclassified')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':[event],
            'new_snapshots':[snapshots.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['209 independent activation/pass replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['209 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('209 three passes/one ability activation differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':3,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('209 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('209: one board ability activated, three next priority passes')


if __name__=='__main__':main()
