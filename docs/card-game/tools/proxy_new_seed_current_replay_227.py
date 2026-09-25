#!/usr/bin/env python3
"""Apply the four complete opportunities reached in checkpoint 226."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_current_audit_226 as audits
import proxy_new_seed_mixed_replay_224 as states
import proxy_new_seed_ability_activation_190 as board
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='ee00df6b650a0c9c3a71fe6d3fc7b53962e6d9ee019f821627163fbdeb3ef395'
OUTPUT=ROOT/'data/proxy-new-seed-current-replay-227-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_current_replay_227.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.boundary.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('227 protected audit/state differs')
    proofs=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(rows)!=4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('227 protected candidate inventory differs')
    return proofs,rows

def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('227 source boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('227 source state hash differs')
    decisions=[]
    if proof['next_opportunity']=='selected_board_ability_activation':
        if len(row['new_decisions'])!=1 or row['new_events'] or \
                row['new_decisions'][0]['selected_candidate']!=proof['candidate_ids'][0]:
            raise ValueError('227 selected board response differs')
        after,event=board.activate_board_ability(state,row['new_decisions'][0],proof)
        reason='unproved_current_chain_response_candidates'
    elif proof['next_opportunity']=='response_window':
        ctx=state['response_context'];actor=ctx['priority_actor']
        if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('227 response pass not unique')
        projected=copy.deepcopy(state);owner=projected['game_state']['players'][actor]
        for excluded in proof['hand_conditional_exclusions']:
            owner['hand'].remove(excluded['source_instance_id'])
        for excluded in proof['board_exclusions']:
            instance=excluded['source_instance_id'];on_board=owner['board']
            if instance in on_board['companions']:on_board['companions'].remove(instance)
            elif on_board['partner']==instance:
                on_board['partner']=None;on_board['partner_stage']=None
            else:raise ValueError('227 board projection differs')
        projected['game_state']['phase']='response_window'
        projected['response_context']['window_kind']='turn_start'
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
                chance['excluded_candidates']!=proof['hand_other_exclusions']:
            raise ValueError('227 candidate reconstruction differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('227 response resolution differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after,event,_=start._pass(state,actor)
        normal._verify_step(state,after,[event]);decisions=[decision]
        phase=after['game_state']['phase']
        reason={'normal_action':'unproved_current_normal_action_candidates',
                'turn_end':'unproved_current_turn_end_provenance',
                'response_window':'unproved_next_priority_response_candidates',
                'post_placement_response':'unproved_next_priority_response_candidates',
                'turn_end_response':'unproved_next_priority_response_candidates'}.get(phase)
        if reason is None:raise ValueError('227 response continuation phase unclassified')
    else:raise ValueError('227 opportunity unclassified')
    shot=snapshots.snapshot(after)
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':[event],'new_snapshots':[shot],
            'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        if result!=run_route(row,proof):return ['227 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=row['last_valid_event_seq']+1 or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['227 event/snapshot hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('227 four replays differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':3,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('227 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('227: four reached responses applied')
if __name__=='__main__':main()
