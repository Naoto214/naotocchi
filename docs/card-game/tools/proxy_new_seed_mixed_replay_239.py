#!/usr/bin/env python3
"""Apply three unique start response passes and one free placement."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_238 as choices
import proxy_new_seed_mixed_audit_237 as audits
import proxy_new_seed_egg_replay_236 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_normal_action_extension as extension
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='6ec5ba907c3a7698b5ff7f830158740013b7632de601871d3b8c621669df2eba'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-239-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_239.v1'

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
        raise ValueError('239 protected choice/audit/state differs')
    proofs=json.loads(raw)['results'];audited=json.loads(inventory)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(audited)!=len(rows)!=4 or any(choices.validate_result(x) for x in proofs):
        raise ValueError('239 protected choice integrity differs')
    return proofs,audited,rows

def run_route(row,proof,audit):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or \
            proof['candidate_ids']!=audit['candidate_ids']:
        raise ValueError('239 source boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('239 source state hash differs')
    if proof['selected_candidate']=='response-pass':
        if audit['next_opportunity']!='response_window' or proof['resolution_mode']!='response_unique':
            raise ValueError('239 response pass proof differs')
        chance=precedent.opportunity(state,audit)
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':state['game_state']['round'],
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('239 response pass selection differs')
        actor=state['response_context']['priority_actor']
        after,event,_=start._pass(state,actor)
        normal._verify_step(state,after,[event])
        if after['game_state']['phase']!='response_window' or \
                after['response_context']['consecutive_passes']!=1:
            raise ValueError('239 next priority response differs')
        reason='unproved_next_priority_response_candidates'
    else:
        if audit['next_opportunity']!='normal_action' or \
                proof['selected_candidate']!='candidate-place-partner-A-017#1' or \
                proof['selected_decision']['selected_candidate']!=proof['selected_candidate']:
            raise ValueError('239 free placement proof differs')
        decision=copy.deepcopy(proof['selected_decision'])
        with placement_scope.partner_placement_scope():
            after,generated=extension._apply_placement(state,decision)
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or generated[0]['action_type']!='place_partner' or \
                after['game_state']['phase']!='post_placement_response':
            raise ValueError('239 free placement outcome differs')
        event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
        reason='unproved_post_placement_response_candidates'
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
        if result!=run_route(row,proof,audit):return ['239 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=row['last_valid_event_seq']+1 or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['239 event/snapshot hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    proofs,inventory,rows=load_sources()
    result=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']),
                      next(x for x in inventory if x['path_id']==row['path_id'])) for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('239 four replays differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('239 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('239: three start passes and one free partner placement applied')
if __name__=='__main__':main()
