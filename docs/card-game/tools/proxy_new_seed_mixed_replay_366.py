#!/usr/bin/env python3
"""Replay normal pass, first date activation, and two response passes."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_choice_365 as choices
import proxy_new_seed_mixed_audit_364 as audits
import proxy_new_seed_mixed_replay_363 as states
import proxy_new_seed_mixed_replay_345 as first_date
import proxy_new_seed_mixed_replay_342 as second_pass
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-366-20260929.json'
SOURCE_RAW_SHA256='941085f6dfa3de886eb1e956f388fec3771e0a5777f7c7f1e2353cd5c26c3fe7'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_366.v1'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,audited,saved=choices.OUTPUT.read_bytes(),audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest()!=choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=choices.STATE_RAW_SHA256 or
            raw!=choices.canonical_bytes(choices.build_report()) or
            audited!=audits.canonical_bytes(audits.build_report()) or
            saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('366 protected choice/audit/state differs')
    return json.loads(saved)['results'],json.loads(raw)['results'],json.loads(audited)['results']
def run_route(row,selected,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (selected['path_id'],selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'],selected['source_continuation_state_sha256']) or
        selected['candidate_ids']!=proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('366 selected source boundary differs')
    path=row['path_id']
    if path=='probe-01-a-first':
        if selected['selected_candidate']!='pass' or proof['next_opportunity']!='normal_action':
            raise ValueError('366 normal pass differs')
        result=normal_pass.run_route(row,selected,proof)
        if (result['new_events'][0]['action_type']!='normal_pass_end_request' or
                result['final_continuation_state']['game_state']['phase']!='turn_end_response'):
            raise ValueError('366 normal pass transition differs')
        return result
    if path=='probe-01-b-first':
        if (selected['selected_candidate']!='response-use-event-A-040#1-target-A-017#1' or
                proof['next_opportunity']!='response_window'):
            raise ValueError('366 first date choice differs')
        projected=({**row,'path_id':'probe-01-a-first'},
                   {**selected,'path_id':'probe-01-a-first'},
                   {**proof,'path_id':'probe-01-a-first'})
        result=first_date.run_route(*projected)
        if (result['new_events'][0]['action_type']!='activate_response' or
                result['final_continuation_state']['response_context']['chain_status']!='building' or
                result['final_continuation_state']['response_context']['priority_actor']!='A'):
            raise ValueError('366 first date activation differs')
        return {**result,'path_id':path}
    if path not in ('probe-02-a-first','probe-02-b-first') or proof['next_opportunity']!='response_window' or selected['selected_candidate']!='response-pass':
        raise ValueError('366 response path differs')
    projected=({**row,'path_id':'probe-01-b-first'},
               {**selected,'path_id':'probe-01-b-first'},
               {**proof,'path_id':'probe-01-b-first'})
    result=second_pass.run_route(*projected)
    if (result['new_events'][0]['action_type']!='response_pass' or
            result['final_continuation_state']['game_state']['phase']!='normal_action'):
        raise ValueError('366 response closure differs')
    return {**result,'path_id':path}
def validate_result(result):
    try:
        rows,selected,proofs=load_sources();path=result['path_id']
        row=next(x for x in rows if x['path_id']==path)
        choice=next(x for x in selected if x['path_id']==path)
        proof=next(x for x in proofs if x['path_id']==path)
        if result!=run_route(row,choice,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['366 independent replay differs']
        event,shot=result['new_events'][0],result['new_snapshots'][0]
        if (event['seq']!=shot['event_seq'] or
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
                event['game_state_after_sha256']!=shot['game_state_sha256'] or
                event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256'] or
                (shot['game_state_sha256'],shot['continuation_state_sha256'])!=
                (result['final_game_state_sha256'],result['final_continuation_state_sha256'])):
            return ['366 event/snapshot/hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]
def build_report():
    rows,selected,proofs=load_sources()
    results=[run_route(r,next(x for x in selected if x['path_id']==r['path_id']),
                       next(x for x in proofs if x['path_id']==r['path_id'])) for r in rows]
    if len(results)!=4 or any(validate_result(x) for x in results):
        raise ValueError('366 four transitions differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in results),
            'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('366 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('366: normal pass, first date activation and two response passes replayed')
if __name__=='__main__':main()
