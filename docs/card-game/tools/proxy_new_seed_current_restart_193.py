#!/usr/bin/env python3
"""Apply proved normal choices and one pass within a board-ability chain."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_current_choices_192 as audits
import proxy_new_seed_chain_normal_audit_191 as opportunities
import proxy_new_seed_ability_activation_190 as states
import proxy_new_seed_normal_restart_157 as partner
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_chain_pass_172 as chain_pass
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='29c42f427afc8098f5c0bc3d50b56cd0bcebc85b911dd059593f5bbc5769b022'
OUTPUT=ROOT/'data/proxy-new-seed-current-restart-193-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_current_restart_193.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes(); saved=states.OUTPUT.read_bytes(); earlier=opportunities.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=opportunities.SOURCE_RAW_SHA256 or \
            hashlib.sha256(earlier).hexdigest()!=audits.SOURCE_RAW_SHA256:
        raise ValueError('193 protected source/audit raw differs')
    proof=json.loads(raw); rows=json.loads(saved); inventory=json.loads(earlier)
    if proof['schema']!=audits.SCHEMA or rows['schema']!=states.SCHEMA or \
            inventory['schema']!=opportunities.SCHEMA or len(proof['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('193 chosen current source differs')
    return proof,rows,inventory


def run_route(row,proof,inventory):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or row['path_id']!=inventory['path_id']:
        raise ValueError('193 state/selection boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('193 continuation source differs')
    decisions=[]
    if proof['next_opportunity']=='response_window':
        ctx=state['response_context'];actor=ctx['priority_actor']
        if proof['selected_candidate']!='response-pass' or \
                inventory['candidate_ids']!=['response-pass'] or \
                ctx['chain_status']!='building' or ctx['consecutive_passes']!=0:
            raise ValueError('193 selected chain pass differs')
        projected=copy.deepcopy(state)
        for excluded in inventory['hand_conditional_exclusions']:
            projected['game_state']['players'][actor]['hand'].remove(excluded['source_instance_id'])
        projected['game_state']['players'][actor]['board']['companions']=[]
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
                chance['excluded_candidates']!=inventory['hand_other_exclusions']:
            raise ValueError('193 chain response candidate proof differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or \
                decision['resolution_mode']!='response_unique':
            raise ValueError('193 response choice differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after=copy.deepcopy(state)
        transitioned=chain._turn_start_transition(state,{'kind':'response_pass','actor':actor})
        response._apply_transition_result(after,transitioned)
        after['last_event_seq']=state['last_event_seq']+1
        after['continuation_state_sha256']=start._hash(after)
        event={'seq':after['last_event_seq'],'action_type':'response_pass',
               'actor':actor,'selected_candidate':'response-pass',
               'game_state_before_sha256':row['final_game_state_sha256'],
               'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
               'continuation_state_before_sha256':row['final_continuation_state_sha256'],
               'continuation_state_after_sha256':after['continuation_state_sha256']}
        if after['response_context']['chain_status']!='building' or \
                after['response_context']['consecutive_passes']!=1:
            raise ValueError('193 first chain pass transition differs')
        normal._verify_step(state,after,[event]);decisions=[decision]
        reason='unproved_other_actor_chain_response_candidates'
    elif proof['next_opportunity']=='normal_action' and \
            proof['selected_candidate'].startswith('candidate-place-partner-'):
        applied=partner.run_route(row,inventory)
        if applied['new_decisions']!=[proof['selected_decision']] or \
                applied['new_events'][0]['action_type']!='place_partner':
            raise ValueError('193 selected free placement differs')
        after=copy.deepcopy(applied['final_continuation_state'])
        after.update({'last_event_seq':applied['last_valid_event_seq'],
                      'continuation_state_sha256':applied['final_continuation_state_sha256']})
        event=applied['new_events'][0];decisions=applied['new_decisions']
        reason='unproved_post_placement_response_candidates'
    elif proof['next_opportunity']=='normal_action' and proof['selected_candidate']=='pass':
        if proof['resolution_mode']!='priority_unique' or \
                proof['comparison_evidence']['paid_vs_pass']['winner']!='left':
            raise ValueError('193 priority pass proof differs')
        detail=next(x for x in inventory['legal_candidate_details'] if x['candidate_id']=='pass')
        other=next(x for x in inventory['legal_candidate_details'] if x['candidate_id']!='pass')
        decision={'decision_kind':'normal_action','resolution_mode':'priority_unique',
                  'reason_code':'time_balance','strategic_unresolved':False,
                  'legal_candidates':inventory['candidate_ids'],
                  'legal_candidate_details':inventory['legal_candidate_details'],
                  'candidate_set_complete':True,'selected_candidate':'pass',
                  'selected_action':copy.deepcopy(detail),
                  'runner_up_candidates':[other['candidate_id']],
                  'seed_context':None,'seed_proof':None,
                  'priority_basis':proof['comparison_evidence'],
                  'pre_game_state_sha256':row['final_game_state_sha256'],
                  'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                  'event_seq':row['last_valid_event_seq']}
        after,generated=normal.transition(state,decision,{'candidate_table':
                                      candidates.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        event={key:copy.deepcopy(value) for key,value in generated[0].items()
               if key!='_snapshot_after'};decisions=[decision]
        reason='unproved_turn_end_response_candidates'
    else:raise ValueError('193 current selection unclassified')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':decisions,
            'new_events':[event],'new_snapshots':[chain_pass.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved,inventory=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        previous=next(x for x in inventory['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof,previous) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['193 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['193 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved,inventory=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']),
                    next(x for x in inventory['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('193 replay choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('193 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('193: free placement, 2 normal passes and first chain pass')


if __name__=='__main__':main()
