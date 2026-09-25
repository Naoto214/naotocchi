#!/usr/bin/env python3
"""Apply four proved choices to their saved 209 states and preserve event hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_choice_audit_211 as choices
import proxy_new_seed_chain_normal_audit_210 as opportunities
import proxy_new_seed_ability_activation_209 as states
import proxy_new_seed_normal_restart_157 as free_choice
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='f49f1fca9ef98154a4843a9088c9be207f6ab2310fd4e9bc236c7908f43206d7'
OUTPUT=ROOT/'data/proxy-new-seed-choice-replay-212-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_choice_replay_212.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes(); saved=states.OUTPUT.read_bytes(); inventory=opportunities.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=opportunities.SOURCE_RAW_SHA256 or \
            hashlib.sha256(inventory).hexdigest()!=choices.SOURCE_RAW_SHA256 or \
            raw!=choices.canonical_bytes(choices.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()) or \
            inventory!=opportunities.canonical_bytes(opportunities.build_report()):
        raise ValueError('212 protected choice/state/inventory differs')
    proof=json.loads(raw); source=json.loads(saved); audit=json.loads(inventory)
    if len(proof['results'])!=len(source['results'])!=len(audit['results'])!=4 or \
            any(choices.validate_result(x) for x in proof['results']):
        raise ValueError('212 source selection differs')
    return proof,source,audit


def run_route(row,proof,inventory):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or row['path_id']!=inventory['path_id'] or \
            proof['candidate_ids']!=inventory['candidate_ids']:
        raise ValueError('212 state/selection boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('212 source continuation differs')
    if proof['selected_candidate']=='response-pass':
        ctx=state['response_context'];actor=ctx['priority_actor']
        if inventory['next_opportunity']!='response_window' or \
                ctx['chain_status']!='building' or ctx['consecutive_passes']!=0:
            raise ValueError('212 first chain pass boundary differs')
        projected=copy.deepcopy(state)
        for excluded in inventory['hand_conditional_exclusions']:
            projected['game_state']['players'][actor]['hand'].remove(excluded['source_instance_id'])
        projected['game_state']['players'][actor]['board']['companions']=[]
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=inventory['candidate_ids'] or \
                chance['excluded_candidates']!=inventory['hand_other_exclusions']:
            raise ValueError('212 response candidate inventory differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('212 response unique choice differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after=copy.deepcopy(state)
        transitioned=chain._turn_start_transition(state,{'kind':'response_pass','actor':actor})
        response._apply_transition_result(after,transitioned)
        after['last_event_seq']=state['last_event_seq']+1
        after['continuation_state_sha256']=start._hash(after)
        event={'seq':after['last_event_seq'],'action_type':'response_pass','actor':actor,
               'selected_candidate':'response-pass',
               'game_state_before_sha256':row['final_game_state_sha256'],
               'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
               'continuation_state_before_sha256':row['final_continuation_state_sha256'],
               'continuation_state_after_sha256':after['continuation_state_sha256']}
        if after['response_context']['consecutive_passes']!=1:
            raise ValueError('212 chain pass outcome differs')
        normal._verify_step(state,after,[event]);reason='unproved_other_actor_chain_response_candidates'
    elif proof['selected_candidate'].startswith('candidate-place-partner-'):
        decision=proof['selected_decision']
        if decision!=free_choice.decide(row,inventory):
            raise ValueError('212 free placement choice differs')
        with placement_scope.partner_placement_scope():
            after,generated=extension._apply_placement(state,decision)
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or generated[0]['action_type']!='place_partner':
            raise ValueError('212 placement outcome differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        reason='unproved_post_placement_response_candidates'
    elif proof['selected_candidate']=='pass':
        if inventory['next_opportunity']!='normal_action' or \
                proof['resolution_mode']!='priority_unique' or \
                len(proof['comparison_evidence']['paid_actions'])!=2 or \
                any(x['comparison']['winner']!='left' for x in proof['comparison_evidence']['paid_actions']):
            raise ValueError('212 priority pass evidence differs')
        detail=next(x for x in inventory['legal_candidate_details'] if x['action_type']=='pass')
        decision={'decision_kind':'normal_action','resolution_mode':'priority_unique',
                  'reason_code':'time_balance','strategic_unresolved':False,
                  'legal_candidates':copy.deepcopy(inventory['candidate_ids']),
                  'legal_candidate_details':copy.deepcopy(inventory['legal_candidate_details']),
                  'candidate_set_complete':True,'selected_candidate':'pass',
                  'selected_action':copy.deepcopy(detail),
                  'runner_up_candidates':[x for x in inventory['candidate_ids'] if x!='pass'],
                  'seed_context':None,'seed_proof':None,
                  'priority_basis':copy.deepcopy(proof['comparison_evidence']),
                  'pre_game_state_sha256':row['final_game_state_sha256'],
                  'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                  'event_seq':row['last_valid_event_seq']}
        after,generated=normal.transition(state,decision,{'candidate_table':
                                      candidates.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or after['game_state']['phase']!='turn_end_response':
            raise ValueError('212 normal pass outcome differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        reason='unproved_turn_end_response_candidates'
    else:raise ValueError('212 selected action unclassified')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':[decision],
            'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proof,saved,inventory=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        choice=next(x for x in proof['results'] if x['path_id']==result['path_id'])
        audit=next(x for x in inventory['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,choice,audit) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['212 independent replay differs']
        event=result['new_events'][0]; snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['212 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proof,saved,inventory=load_sources()
    rows=[run_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']),
                    next(x for x in inventory['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('212 replay choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('212 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('212: four selected decisions and events, zero completed')


if __name__=='__main__':main()
