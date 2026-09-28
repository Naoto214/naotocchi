#!/usr/bin/env python3
"""Apply four checkpoint-347 response passes to checkpoint-345 states."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_choice_347 as choices
import proxy_new_seed_mixed_audit_346 as audits
import proxy_new_seed_mixed_replay_345 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as chain
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-348-20260928.json'
SOURCE_RAW_SHA256='09ce603246dfcc14cc83994f5c6a7f80be8914d6ad8f573b6288a9ae6ad82d98'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_348.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,audited,saved=choices.OUTPUT.read_bytes(),audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
        hashlib.sha256(audited).hexdigest()!=choices.SOURCE_RAW_SHA256 or
        hashlib.sha256(saved).hexdigest()!=choices.STATE_RAW_SHA256 or
        raw!=choices.canonical_bytes(choices.build_report()) or
        audited!=audits.canonical_bytes(audits.build_report()) or
        saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('348 protected choice/audit/state differ')
    return json.loads(saved)['results'],json.loads(raw)['results'],json.loads(audited)['results']
def run_route(row,selected,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (selected['path_id'],selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'],selected['source_continuation_state_sha256']) or
        selected['candidate_ids']!=proof['candidate_ids'] or
        selected['selected_candidate']!='response-pass' or
        selected['resolution_mode']!='response_unique' or not proof['candidate_set_complete']):
        raise ValueError('348 selected state boundary differs')
    before=copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before)!=row['final_continuation_state_sha256']:
        raise ValueError('348 source state/hash differs')
    actor=before['response_context']['priority_actor']
    path=row['path_id']
    if path=='probe-01-a-first':
        decision_detail={'selected_candidate':'response-pass','actor':actor,
                         'selected_action':{'action_type':'response_pass'}}
        after,event=chain.pass_start_chain(before,decision_detail)
    else:
        after,event,_=start._pass(before,actor)
    if path=='probe-01-a-first':
        # The normal-action verifier counts only deck/hand/board/discard zones; the
        # unresolved event is correctly in activation_zone until chain resolution.
        if (after['game_state']!=before['game_state'] or
            after['activation_zone']!=before['activation_zone'] or
            after['last_event_seq']!=before['last_event_seq']+1 or
            event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['game_state_after_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['continuation_state_after_sha256']!=start._hash(after)):
            raise ValueError('348 chain pass event/hash or activation zone differs')
    else:
        normal._verify_step(before,after,[event])
    context=after['response_context']
    if path=='probe-01-a-first':
        if (context['chain_status']!='building' or context['priority_actor']!='B' or
            len(after['activation_zone'])!=1 or after['activation_zone'][0]['card_id']!='E-first-date' or
            context['window_kind']!='turn_start' or context['consecutive_passes']!=1):
            raise ValueError('348 first date remains unresolved')
        reason='unproved_next_priority_chain_response_candidates'
    elif path=='probe-01-b-first':
        if (after['game_state']['phase']!='post_placement_response' or
            context['priority_actor']!='A' or context['consecutive_passes']!=1):
            raise ValueError('348 placement next priority differs')
        reason='unproved_next_priority_response_candidates'
    elif path in ('probe-02-a-first','probe-02-b-first'):
        if before['response_context']['consecutive_passes']!=1 or context['consecutive_passes']!=2:
            raise ValueError('348 response closure differs')
        reason='unproved_current_normal_action_candidates'
    else:raise ValueError('348 path differs')
    decision={'decision_kind':'response','selected_candidate':'response-pass',
              'resolution_mode':'response_unique','actor':actor,
              'pre_game_state_sha256':row['final_game_state_sha256'],
              'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
              'event_seq':row['last_valid_event_seq']}
    return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[decision],'new_events':[event],
            'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def validate_result(result):
    try:
        rows,selected,proofs=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        choice=next(x for x in selected if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        if result!=run_route(row,choice,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['348 independent replay differs']
        event,shot=result['new_events'][0],result['new_snapshots'][0]
        if (event['seq']!=shot['event_seq'] or
            event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['game_state_after_sha256']!=shot['game_state_sha256'] or
            event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
            return ['348 event/snapshot/hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as exc:return [str(exc)]
def build_report():
    rows,selected,proofs=load_sources()
    results=[run_route(r,next(x for x in selected if x['path_id']==r['path_id']),
                       next(x for x in proofs if x['path_id']==r['path_id'])) for r in rows]
    if len(results)!=4 or any(validate_result(x) for x in results):raise ValueError('348 four transitions differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('348 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('348: four response passes replayed')
if __name__=='__main__':main()
