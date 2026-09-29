#!/usr/bin/env python3
"""Choose and replay one response, two paid normal passes and free C-box."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_381 as audit
import proxy_new_seed_mixed_replay_380 as source
import proxy_new_seed_mixed_replay_379 as response_pass
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_mixed_replay_342 as placement
import proxy_new_seed_mixed_choice_325 as countryside
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-381-20260929.json'
SOURCE_RAW_SHA256='ec10c5dd90921c5503393f5631fa0de4811ddd40627828760a594ec48d1afe49'
STATE_RAW_SHA256='1e966556dc0e9841b75c44f69caac4abeb613a59644971d14bc0fbf1570ebbda'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_381.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

def load_sources():
    raw,saved=audit.OUTPUT.read_bytes(),source.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
            raw!=audit.canonical_bytes(audit.build_report())):
        raise ValueError('381 protected audit/state differs')
    rows,proofs=json.loads(saved)['results'],json.loads(raw)['results']
    if len(rows)!=4 or len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('381 audited inventory differs')
    return rows,proofs

def choose_free(row,proof):
    game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    details=proof['legal_candidate_details']
    if (row['path_id']!='probe-02-a-first' or actor!='B' or
            [d['action_type'] for d in details]!=['place_companion','play_main','set_item','pass'] or
            [d['card_id'] for d in details[:3]]!=['C-box','M-antlion-01','I-poop1'] or
            owner['person_placed'] or len(owner['board']['companions'])!=1 or
            not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values())):
        raise ValueError('381 free box boundary differs')
    reduced=copy.deepcopy(proof)
    reduced['candidate_ids']=[details[0]['candidate_id'],'pass']
    reduced['legal_candidate_details']=[details[0],details[-1]]
    decision=free.decide(row,reduced)
    if (decision['selected_candidate']!='candidate-place-companion-B-012#1' or
            decision['resolution_mode']!='safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('381 safe C-box choice differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':actor,
             'actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action',
             'decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
    full=fallback.resolve_safe_free_development([decision['selected_placement']],context,proof['candidate_ids'])
    if full.get('error') or full['selected_candidate']!=details[0]['candidate_id']:
        raise ValueError('381 complete safe choice differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    left={**common,'candidate_id':details[0]['candidate_id'],'payment_time':0,
          'time_after_certain_resolution':owner['time'],
          'card_copy_id':game['cards'][details[0]['source_instance_id']]['card_copy_id']}
    comparisons=[]
    for action in details[1:3]:
        cost,ref=paid.cost_and_effect(row,action)
        right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,
               'time_after_certain_resolution':owner['time']-cost,
               'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        compared=priority.compare_candidates(left,right)
        if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':
            raise ValueError('381 paid candidate priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,
                            'score':right,'comparison':compared})
    full.update(selected_action=copy.deepcopy(details[0]),legal_candidate_details=copy.deepcopy(details),
                paid_comparisons=comparisons,source_contracts=[107,114,116],
                pre_game_state_sha256=row['final_game_state_sha256'],
                pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                event_seq=row['last_valid_event_seq'])
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'candidate_ids':proof['candidate_ids'],'selected_candidate':details[0]['candidate_id'],
            'resolution_mode':'safe_free_development','selected_action':details[0],
            'selected_decision':full,'paid_comparisons':comparisons}

def run_route(row,proof):
    path=row['path_id']
    if path=='probe-01-a-first':
        if proof['candidate_ids']!=['response-pass'] or proof['next_opportunity']!='post_placement_response':
            raise ValueError('381 response opportunity differs')
        return response_pass.run_route(row,proof)
    if path=='probe-01-b-first':
        selected=countryside.choose(row,proof)
        if selected['selected_candidate']!='pass' or len(selected['paid_comparisons'])!=2:
            raise ValueError('381 countryside/poop pass choice differs')
        return normal_pass.run_route(row,selected,proof)
    if path=='probe-02-b-first':
        selected=paid.audit_route(row,proof)
        if selected['selected_candidate']!='pass' or len(selected['paid_comparisons'])!=1:
            raise ValueError('381 paid main pass choice differs')
        return normal_pass.run_route(row,selected,proof)
    if path=='probe-02-a-first':
        selected=choose_free(row,proof)
        projected=({**row,'path_id':'probe-02-b-first'},
                   {**selected,'path_id':'probe-02-b-first'},
                   {**proof,'path_id':'probe-02-b-first'})
        result=placement.run_route(*projected)
        if (result['new_decisions']!=[selected['selected_decision']] or
                result['new_events'][0]['action_type']!='place_companion'):
            raise ValueError('381 selected C-box replay differs')
        return {**result,'path_id':path}
    raise ValueError('381 unknown route')

def verify_result(row,proof,result):
    if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
        raise ValueError('381 independent replay differs')
    event,shot=result['new_events'][0],result['new_snapshots'][0]
    if (event['seq']!=shot['event_seq'] or event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['game_state_after_sha256']!=shot['game_state_sha256'] or
            event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state'])!=result['final_game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state'])!=result['final_continuation_state_sha256']):
        raise ValueError('381 event/snapshot/hash differs')

def build_report():
    rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
    if len(results)!=4:raise ValueError('381 route inventory differs')
    for r,p,result in zip(rows,proofs,results):verify_result(r,p,result)
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('381 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('381: response pass, free box and two normal passes replayed')

if __name__=='__main__':main()
