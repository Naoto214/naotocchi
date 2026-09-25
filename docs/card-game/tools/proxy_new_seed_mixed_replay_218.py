#!/usr/bin/env python3
"""Apply selected free placement and unique response pass, retaining two ends."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_217 as choices
import proxy_new_seed_mixed_audit_216 as audits
import proxy_new_seed_ability_resolution_215 as states
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='ee009df2f982a345e52aa2c9c46ed303130e25a6a496b5dcd4efcd8a4667aab3'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-218-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_218.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes();inventory=audits.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            hashlib.sha256(inventory).hexdigest()!=choices.SOURCE_RAW_SHA256 or \
            raw!=choices.canonical_bytes(choices.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()) or \
            inventory!=audits.canonical_bytes(audits.build_report()):
        raise ValueError('218 protected choice/state/inventory differs')
    proof=json.loads(raw);source=json.loads(saved);audit=json.loads(inventory)
    if len(proof['results'])!=len(source['results'])!=len(audit['results'])!=4 or \
            any(choices.validate_result(x) for x in proof['results']):
        raise ValueError('218 source decisions differ')
    return proof,source,audit


def run_route(row,proof,inventory):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
        row['final_continuation_state_sha256'])!=(proof['path_id'],
        proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']) or row['path_id']!=inventory['path_id']:
        raise ValueError('218 saved state/choice boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('218 source hash differs')
    decisions=[];events=[];shots=[]
    if proof['next_opportunity']=='selected_normal_placement':
        decision=proof['selected_decision']
        if choices.audit_route(row,inventory)!=proof or \
                decision['selected_candidate']!=proof['selected_candidate'] or \
                decision['selected_action']['action_type']!='place_partner':
            raise ValueError('218 selected placement differs')
        with placement_scope.partner_placement_scope():
            after,generated=extension._apply_placement(state,decision)
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or generated[0]['action_type']!='place_partner':
            raise ValueError('218 placement result differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        decisions=[decision];events=[event];shots=[snapshots.snapshot(after)]
        reason='unproved_post_placement_response_candidates'
    elif proof['next_opportunity']=='response_window':
        if proof['selected_candidate'] is not None or \
                inventory['candidate_ids']!=['response-pass'] or \
                not inventory['candidate_set_complete']:
            raise ValueError('218 response pass not unique')
        ctx=state['response_context'];actor=ctx['priority_actor']
        projected=copy.deepcopy(state);owner=projected['game_state']['players'][actor]
        for excluded in inventory['hand_conditional_exclusions']:
            owner['hand'].remove(excluded['source_instance_id'])
        for excluded in inventory['board_exclusions']:
            instance=excluded['source_instance_id']
            if instance!=owner['board']['partner']:
                raise ValueError('218 board exclusion identity differs')
            owner['board']['partner']=None;owner['board']['partner_stage']=None
        projected['game_state']['phase']='response_window'
        projected['response_context']['window_kind']='turn_start'
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=['response-pass'] or \
                chance['excluded_candidates']!=inventory['hand_other_exclusions']:
            raise ValueError('218 response candidate proof differs')
        chance['response_context']=copy.deepcopy(ctx)
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or \
                decision['resolution_mode']!='response_unique':
            raise ValueError('218 response choice differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after,event,snap=start._pass(state,actor)
        if after['game_state']['phase']!='normal_action':
            raise ValueError('218 response not closed')
        normal._verify_step(state,after,[event]);decisions=[decision];events=[event];shots=[snap]
        reason='unproved_current_normal_action_candidates'
    elif proof['next_opportunity']=='turn_end_provenance':
        after=state;reason=row['stop_reason_code']
    else:raise ValueError('218 unclassified choice')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':decisions,
            'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proof,saved,inventory=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        choice=next(x for x in proof['results'] if x['path_id']==result['path_id'])
        audit=next(x for x in inventory['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,choice,audit) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['218 independent replay differs']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=snap['event_seq'] or \
                    event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                    event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
                return ['218 event/snapshot hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proof,saved,inventory=load_sources()
    rows=[run_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']),
                    next(x for x in inventory['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('218 mixed replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':2,'new_events':2,
            'new_snapshots':2,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('218 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('218: free partner placement and unique response pass, two held ends')


if __name__=='__main__':main()
