#!/usr/bin/env python3
"""Apply three proven passes and activate one selected on-board ability."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_opportunity_189 as audit
import proxy_new_seed_start_choice_188 as states
import proxy_board_ability_id_167 as identifiers
import proxy_new_seed_next_response_restart_170 as prior
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audit.OUTPUT
SOURCE_RAW_SHA256='b40fe9d5409722a4fb661dcf383f6fbdee88a0a00837df5e1b01d96b7664f099'
OUTPUT=ROOT/'data/proxy-new-seed-ability-activation-190-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_ability_activation_190.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();original=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(original).hexdigest()!=audit.SOURCE_RAW_SHA256:
        raise ValueError('190 protected audit or state raw differs')
    proof=json.loads(raw);source=json.loads(original)
    if proof['schema']!=audit.SCHEMA or source['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audit.validate_result(x) for x in proof['results']):
        raise ValueError('190 full opportunity proof differs')
    return proof,source


def activate_board_ability(before,decision,proof):
    action=decision['selected_action'];ctx=before['response_context'];actor=ctx['priority_actor']
    instance=action['source_instance_id'];board=before['game_state']['players'][actor]['board']
    if action['candidate_family']!='triggered_ability' or \
            action['action_type']!='activate_board_ability' or \
            action['base_time_cost']!=0 or action['target_instance_ids']!=[] or \
            action['candidate_variant'] is not None or \
            identifiers.board_ability_response_id(instance,1)!=action['candidate_id'] or \
            decision['selected_candidate']!=action['candidate_id'] or \
            proof['candidate_ids']!=[action['candidate_id']] or \
            proof['source_instance_id']!=instance or \
            instance not in board['companions'] or \
            before['game_state']['cards'][instance]['card_id']!=action['card_id'] or \
            ctx['window_kind']!='turn_start' or ctx['chain_status']!='empty' or \
            ctx['chain_links'] or ctx['consecutive_passes']!=0 or \
            before['pending_triggers'] or before['activation_zone']:
        raise ValueError('190 board ability activation source differs')
    after=copy.deepcopy(before);seq=before['last_event_seq']+1
    link_id=f'response-link-{seq}-{instance}'
    link={'link_id':link_id,'action_type':action['action_type'],
          'source_zone':'board','actor':actor,'card_id':action['card_id'],
          'card_copy_id':action['card_copy_id'],'source_instance_id':instance,
          'target_instance_ids':[],'candidate_variant':None,
          'payment':{'time':0},'source_references':copy.deepcopy(action['source_references'])}
    after['activation_zone'].append(link)
    transitioned=chain._turn_start_transition(before,{'kind':'activate','actor':actor,'link_id':link_id})
    response._apply_transition_result(after,transitioned)
    after['last_event_seq']=seq;after['continuation_state_sha256']=start._hash(after)
    event={'seq':seq,'action_type':'activate_response','actor':actor,
           'selected_candidate':action['candidate_id'],'source_instance_id':instance,
           'source_zone':'board','candidate_variant':None,'payment':{'time':0},
           'target_instance_ids':[],'chain_link_id':link_id,
           'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    normal._verify_step(before,after,[event])
    return after,event


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('190 saved state/audit boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('190 source continuation differs')
    decisions=[]
    if proof['next_opportunity']=='response_window':
        actor=state['response_context']['priority_actor'];projected=copy.deepcopy(state)
        for exclusion in proof['hand_conditional_exclusions']:
            projected['game_state']['players'][actor]['hand'].remove(exclusion['source_instance_id'])
        board=projected['game_state']['players'][actor]['board']
        board['companions']=[];board['partner']=None;board['partner_stage']=None
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
                chance['excluded_candidates']!=proof['hand_other_exclusions']:
            raise ValueError('190 response pass completeness differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or \
                decision['resolution_mode']!='response_unique':
            raise ValueError('190 unique response pass differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after,event,_=start._pass(state,actor)
        normal._verify_step(state,after,[event]);decisions=[decision]
        reason='unproved_current_normal_action_candidates'
    elif proof['next_opportunity']=='selected_board_ability_activation':
        decision=row['new_decisions'][-1]
        if decision['pre_game_state_sha256']!=row['final_game_state_sha256'] or \
                decision['pre_continuation_state_sha256']!=row['final_continuation_state_sha256']:
            raise ValueError('190 selected board decision hash differs')
        after,event=activate_board_ability(state,decision,proof)
        reason='unproved_current_chain_response_or_resolution'
    else:raise ValueError('190 current opportunity unclassified')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':decisions,
            'new_events':[event],'new_snapshots':[prior.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,originals=load_sources()
        row=next(x for x in originals['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['190 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['190 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,originals=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in originals['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('190 response activation or passes differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':3,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('190 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('190: 3 unique passes and 1 board ability activation, 4 events')


if __name__=='__main__':main()
