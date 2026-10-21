#!/usr/bin/env python3
"""Resolve the first-date chain and apply three checkpoint-353 passes."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_choice_353 as choices
import proxy_new_seed_mixed_audit_352 as audits
import proxy_new_seed_mixed_replay_351 as states
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_response_window_seeded_restart as resolver
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-354-20260929.json'
SOURCE_RAW_SHA256='a9245ec347d548f343fb3a1370aa7b47d035fbaa5a9e4ebddc2f57fd46aad82a'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_354.v1'
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
        raise ValueError('354 protected choice/audit/state differ')
    return json.loads(saved)['results'],json.loads(raw)['results'],json.loads(audited)['results']
def run_route(row,selected,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (selected['path_id'],selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'],selected['source_continuation_state_sha256']) or
        selected['candidate_ids']!=proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('354 selected state boundary differs')
    path=row['path_id']
    if path!='probe-01-a-first':
        if path not in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
            raise ValueError('354 unknown path')
        result=normal_pass.run_route(row,selected,proof)
        expected='normal_pass_end_request' if path=='probe-01-b-first' else 'response_pass'
        phase='turn_end_response' if path=='probe-01-b-first' else 'turn_end'
        if result['new_events'][0]['action_type']!=expected or result['final_continuation_state']['game_state']['phase']!=phase:
            raise ValueError('354 pass transition differs')
        return result
    if (selected['selected_candidate']!='resolve_event' or
        selected['resolution_mode']!='mandatory_chain_resolution' or
        proof['next_opportunity']!='chain_resolution' or not proof['effect_preconditions_proved']):
        raise ValueError('354 mandatory effect choice differs')
    before=copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before)!=row['final_continuation_state_sha256']:
        raise ValueError('354 source state/hash differs')
    actor='A';original=before['game_state']['players'][actor]
    if (original['board']['partner']!=proof['target_instance_id'] or
        original['board']['partner_stage']!=0 or
        original['deck'][0]!=proof['expected_drawn_instance_id'] or
        before['response_context']['chain_status']!='resolving'):
        raise ValueError('354 first date target/deck boundary differs')
    after,generated=resolver.resolve_chain(before,{})
    if len(generated)!=1:
        raise ValueError('354 first date resolution event count differs')
    event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
    effect=event['result'];person=after['game_state']['players'][actor]
    if (event['action_type']!='resolve_event' or event['actor']!=actor or
        event['target_instance_ids']!=[proof['target_instance_id']] or
        effect['effect_applied'] is not True or effect['growth_added']!=5 or
        effect['drawn_instance_ids']!=[proof['expected_drawn_instance_id']] or
        person['growth']!=original['growth']+5 or
        person['board']['partner_stage']!=0 or
        person['discard']!=original['discard']+[proof['source_instance_id']] or
        person['hand']!=original['hand']+[proof['expected_drawn_instance_id']] or
        after['activation_zone'] or after['response_context']['chain_links'] or
        after['response_context']['chain_status']!='empty' or after['game_state']['phase']!='normal_action'):
        raise ValueError('354 first date effect differs')
    decision={'decision_kind':'chain_resolution','selected_candidate':'resolve_event',
              'resolution_mode':'mandatory_chain_resolution','actor':actor,
              'pre_game_state_sha256':row['final_game_state_sha256'],
              'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
              'event_seq':row['last_valid_event_seq']}
    return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':'unproved_current_normal_action_candidates',
            'new_decisions':[decision],'new_events':[event],
            'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def validate_result(result):
    try:
        rows,selected,proofs=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        choice=next(x for x in selected if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        if result!=run_route(row,choice,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['354 independent replay differs']
        event,shot=result['new_events'][0],result['new_snapshots'][0]
        if (event['seq']!=shot['event_seq'] or
            event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['game_state_after_sha256']!=shot['game_state_sha256'] or
            event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
            return ['354 event/snapshot/hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as exc:return [str(exc)]
def build_report():
    rows,selected,proofs=load_sources()
    results=[run_route(r,next(x for x in selected if x['path_id']==r['path_id']),
                       next(x for x in proofs if x['path_id']==r['path_id'])) for r in rows]
    if len(results)!=4 or any(validate_result(x) for x in results):raise ValueError('354 four transitions differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('354 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('354: first date and three passes replayed')
if __name__=='__main__':main()
