#!/usr/bin/env python3
"""Choose and replay the free companion and three unique responses at 379."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_380 as audit
import proxy_new_seed_mixed_replay_379 as source
import proxy_new_seed_normal_restart_157 as free
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-380-20260929.json'
SOURCE_RAW_SHA256='628504d2ee53d03357b9dea784338ff2bb2aeb9a73c0d71a883d7a2b8f235de7'
STATE_RAW_SHA256='669b2fb25c6675525b0617daf4e1c2a10c6d4baafb764857e2016c5896e5ecf7'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_380.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

def load_sources():
    raw,saved=audit.OUTPUT.read_bytes(),source.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
            raw!=audit.canonical_bytes(audit.build_report())):
        raise ValueError('380 protected audit/state differs')
    rows,proofs=json.loads(saved)['results'],json.loads(raw)['results']
    if len(rows)!=4 or len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('380 audit inventory differs')
    return rows,proofs

def choose_free(row,proof):
    game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    details=proof['legal_candidate_details']
    if (row['path_id']!='probe-01-a-first' or actor!='B' or
            [d['action_type'] for d in details]!=['place_companion','place_world','place_world','play_main','pass'] or
            [d['card_id'] for d in details[:4]]!=['C-chicken','W-city','W-deepsea','M-antlion-01'] or
            owner['person_placed'] or len(owner['board']['companions'])!=2 or
            owner['board']['partner']!='B-017#1' or
            not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values())):
        raise ValueError('380 current free placement boundary differs')
    reduced=copy.deepcopy(proof)
    reduced['candidate_ids']=[details[0]['candidate_id'],'pass']
    reduced['legal_candidate_details']=[details[0],details[-1]]
    decision=free.decide(row,reduced)
    if (decision['selected_candidate']!='candidate-place-companion-B-015#1' or
            decision['resolution_mode']!='safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('380 safe placement differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':actor,
             'actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action',
             'decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
    full=fallback.resolve_safe_free_development([decision['selected_placement']],context,proof['candidate_ids'])
    if full.get('error') or full['selected_candidate']!=details[0]['candidate_id']:
        raise ValueError('380 complete candidate fallback differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    left={**common,'candidate_id':details[0]['candidate_id'],'payment_time':0,
          'time_after_certain_resolution':owner['time'],
          'card_copy_id':game['cards'][details[0]['source_instance_id']]['card_copy_id']}
    comparisons=[]
    for action in details[1:4]:
        if action['card_id']=='W-deepsea':
            section=(ROOT/'89-world-13-card-text-draft.md').read_text().split('### W-deepsea — ',1)[1].split('\n### ',1)[0]
            template=next(x for x in start.load_candidate_rows()['W-deepsea']['actions'] if x['action_type']=='place_world')
            if ('自分の手札が2枚以下の間' not in section or template['base_time_cost']!=2 or owner['board']['world'] is not None):
                raise ValueError('380 deepsea payment differs')
            cost,ref=2,'89-world-13-card-text-draft.md#W-deepsea'
        else:cost,ref=paid.cost_and_effect(row,action)
        right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,
               'time_after_certain_resolution':owner['time']-cost,
               'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        compared=priority.compare_candidates(left,right)
        if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':
            raise ValueError('380 paid action priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,
                            'score':right,'comparison':compared})
    full.update(selected_action=copy.deepcopy(details[0]),legal_candidate_details=copy.deepcopy(details),
                paid_comparisons=comparisons,source_contracts=[107,114,116],
                pre_game_state_sha256=row['final_game_state_sha256'],
                pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                event_seq=row['last_valid_event_seq'])
    return full

def run_route(row,proof):
    if row['path_id']!='probe-01-a-first':
        if proof['next_opportunity'] not in ('response_window','post_placement_response'):
            raise ValueError('380 response path differs')
        return source.run_route(row,proof)
    decision=choose_free(row,proof)
    before=copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before)!=row['final_continuation_state_sha256']:
        raise ValueError('380 source hash differs')
    registered=extension.PLACEMENT_TEXT.get('C-chicken')
    current=('72-companion-26-card-text-draft.md#C-chicken','turn_start_trigger_not_placement')
    if registered is not None and registered!=current:
        raise ValueError('380 chicken placement classification differs')
    try:
        extension.PLACEMENT_TEXT['C-chicken']=current
        after,generated=extension._apply_placement(before,decision)
    finally:
        if registered is None:extension.PLACEMENT_TEXT.pop('C-chicken',None)
        else:extension.PLACEMENT_TEXT['C-chicken']=registered
    normal._verify_step(before,after,generated)
    if (len(generated)!=1 or generated[0]['action_type']!='place_companion' or
            after['game_state']['phase']!='post_placement_response' or
            'B-015#1' not in after['game_state']['players']['B']['board']['companions'] or
            after['game_state']['players']['B']['board']['partner']!='B-017#1'):
        raise ValueError('380 chicken placement transition differs')
    event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
    result={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':'unproved_post_placement_response_candidates',
            'new_decisions':[decision],'new_events':[event], 'new_snapshots':[snapshots.snapshot(after)],
            'completed':False,'balance_sample_count':0}
    return result

def verify_result(row,proof,result):
    if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
        raise ValueError('380 independent replay differs')
    event,shot=result['new_events'][0],result['new_snapshots'][0]
    if (event['seq']!=shot['event_seq'] or event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['game_state_after_sha256']!=shot['game_state_sha256'] or
            event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state'])!=result['final_game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state'])!=result['final_continuation_state_sha256']):
        raise ValueError('380 event/snapshot/hash differs')

def build_report():
    rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
    if len(results)!=4:raise ValueError('380 route inventory differs')
    for r,p,result in zip(rows,proofs,results):verify_result(r,p,result)
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('380 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('380: safe free chicken and three unique response passes replayed')

if __name__=='__main__':main()
