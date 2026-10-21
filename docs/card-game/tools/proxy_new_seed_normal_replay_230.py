#!/usr/bin/env python3
"""Apply three priority normal passes and one unique chain pass."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_normal_choice_229 as choices
import proxy_new_seed_normal_audit_228 as audits
import proxy_new_seed_current_replay_227 as states
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='0da24802ebb92d2e58ff295bcac3e0a94e36b64af305628ade89c0750b9b296e'
OUTPUT=ROOT/'data/proxy-new-seed-normal-replay-230-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_replay_230.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();inventory=audits.OUTPUT.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(inventory).hexdigest()!=choices.SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=choices.canonical_bytes(choices.build_report()) or \
            inventory!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('230 protected choice/inventory/state raw differs')
    proofs=json.loads(raw)['results'];audited=json.loads(inventory)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(audited)!=len(rows)!=4 or any(choices.validate_result(x) for x in proofs):
        raise ValueError('230 protected choice integrity differs')
    return proofs,audited,rows

def run_route(row,proof,inventory):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or proof['candidate_ids']!=inventory['candidate_ids']:
        raise ValueError('230 source choice boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('230 source state hash differs')
    if proof['selected_candidate']=='response-pass':
        ctx=state['response_context'];actor=ctx['priority_actor']
        if inventory['next_opportunity']!='response_window' or \
                ctx['chain_status']!='building' or ctx['consecutive_passes']!=0:
            raise ValueError('230 chain response boundary differs')
        projected=copy.deepcopy(state)
        for excluded in inventory['hand_conditional_exclusions']:
            projected['game_state']['players'][actor]['hand'].remove(excluded['source_instance_id'])
        for excluded in inventory['board_exclusions']:
            instance=excluded['source_instance_id'];on_board=projected['game_state']['players'][actor]['board']
            if instance not in on_board['companions']:
                raise ValueError('230 active board exclusion differs')
            on_board['companions'].remove(instance)
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=['response-pass'] or \
                chance['excluded_candidates']!=inventory['hand_other_exclusions']:
            raise ValueError('230 unique response projection differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('230 unique chain pass differs')
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
            raise ValueError('230 chain pass result differs')
        normal._verify_step(state,after,[event]);reason='unproved_other_actor_chain_response_candidates'
    elif proof['selected_candidate']=='pass':
        if inventory['next_opportunity']!='normal_action' or \
                proof['resolution_mode']!='priority_unique' or \
                any(x['comparison']['winner']!='left' for x in proof['paid_comparisons']):
            raise ValueError('230 normal comparison differs')
        detail=next(x for x in inventory['legal_candidate_details'] if x['action_type']=='pass')
        decision={'decision_kind':'normal_action','resolution_mode':'priority_unique',
                  'reason_code':'time_balance','strategic_unresolved':False,
                  'legal_candidates':copy.deepcopy(inventory['candidate_ids']),
                  'legal_candidate_details':copy.deepcopy(inventory['legal_candidate_details']),
                  'candidate_set_complete':True,'selected_candidate':'pass',
                  'selected_action':copy.deepcopy(detail),
                  'runner_up_candidates':[x for x in inventory['candidate_ids'] if x!='pass'],
                  'seed_context':None,'seed_proof':None,
                  'priority_basis':copy.deepcopy(proof['paid_comparisons'])}
        after,generated=normal.transition(state,decision,{'candidate_table':
            candidates.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or after['game_state']['phase']!='turn_end_response':
            raise ValueError('230 normal pass phase differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        reason='unproved_turn_end_response_candidates'
    else:raise ValueError('230 selected choice unclassified')
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[decision],'new_events':[event],
            'new_snapshots':[snapshots.snapshot(after)],'completed':False,
            'balance_sample_count':0}

def validate_result(result):
    try:
        proofs,inventory,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        audit=next(x for x in inventory if x['path_id']==result['path_id'])
        if result!=run_route(row,proof,audit):return ['230 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=row['last_valid_event_seq']+1 or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['230 event/snapshot chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,inventory,rows=load_sources()
    result=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']),
                      next(x for x in inventory if x['path_id']==row['path_id'])) for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('230 four replays differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('230 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('230: three normal passes and one chain pass applied')
if __name__=='__main__':main()
