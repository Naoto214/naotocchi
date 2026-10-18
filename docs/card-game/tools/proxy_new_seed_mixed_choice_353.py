#!/usr/bin/env python3
"""Choose two unique response passes and two paid-action comparisons."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_352 as audits
import proxy_new_seed_mixed_replay_351 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-353-20260929.json'
SOURCE_RAW_SHA256='fbd9d4043ab2954a829b272c87915cda2733fe5217313ffa70f35a1ed5a3cce0'
STATE_RAW_SHA256='435f05d733c4a236d79e775b0a0b65bb95aebcc01b355c7fb3c3c91f53535d3a'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_353.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
        hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
        raw!=audits.canonical_bytes(audits.build_report()) or
        saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('353 protected audit/state differ')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('353 candidate inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']):
        raise ValueError('353 source boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,'balance_sample_count':0}
    if row['path_id']=='probe-01-a-first':
        if (proof['next_opportunity']!='chain_resolution' or not proof['effect_preconditions_proved'] or
            proof['source_instance_id']!='A-040#1' or proof['target_instance_id']!='A-017#1' or
            proof['expected_growth_delta']!=5):
            raise ValueError('353 mandatory resolution differs')
        return {**base,'selected_candidate':'resolve_event','resolution_mode':'mandatory_chain_resolution',
                'target_instance_id':proof['target_instance_id'],'expected_drawn_instance_id':proof['expected_drawn_instance_id'],
                'source_reference':proof['source_reference'],'paid_comparisons':[]}
    if row['path_id'] in ('probe-02-a-first','probe-02-b-first'):
        if proof['next_opportunity']!='turn_end_response' or proof['candidate_ids']!=['response-pass']:
            raise ValueError('353 unique end response differs')
        return {**base,'selected_candidate':'response-pass','resolution_mode':'response_unique','paid_comparisons':[]}
    if row['path_id']!='probe-01-b-first' or proof['next_opportunity']!='normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('353 normal opportunity differs')
    game=row['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
    details=proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details]!=proof['candidate_ids'] or
        [x['action_type'] for x in details]!=['place_world','place_world','play_main','pass'] or
        [x['card_id'] for x in details[:3]]!=['W-city','W-deepsea','M-antlion-01']):
        raise ValueError('353 normal action inventory differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,
            'consumed_card_count':0,'value_comparison_to':{}}
    passed={**common,'candidate_id':'pass','time_after_certain_resolution':owner['time'],
            'payment_time':0,'card_copy_id':''}
    comparisons=[]
    for action in details[:-1]:
        if action['card_id']=='W-deepsea':
            section=(ROOT/'89-world-13-card-text-draft.md').read_text().split('### W-deepsea — ',1)[1].split('\n### ',1)[0]
            template=next(x for x in start.load_candidate_rows()['W-deepsea']['actions'] if x['action_type']=='place_world')
            if ('自分の手札が2枚以下の間' not in section or template['base_time_cost']!=2 or owner['board']['world'] is not None):
                raise ValueError('353 deepsea cost differs')
            cost,ref=2,'89-world-13-card-text-draft.md#W-deepsea'
        else:cost,ref=paid.cost_and_effect(row,action)
        score={**common,'candidate_id':action['candidate_id'],'time_after_certain_resolution':owner['time']-cost,
               'payment_time':cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        compared=priority.compare_candidates(passed,score)
        if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':
            raise ValueError('353 paid action priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':score,'comparison':compared})
    return {**base,'selected_candidate':'pass','resolution_mode':'priority_unique',
            'pass_score':passed,'paid_comparisons':comparisons,'source_contracts':[107,114]}
def build_report():
    rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
    if ([x['selected_candidate'] for x in results].count('pass')!=1 or
        [x['selected_candidate'] for x in results].count('response-pass')!=2):
        raise ValueError('353 choice inventory differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'state_raw_sha256':STATE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('353 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('353: mandatory resolution, normal pass and two end passes selected')
if __name__=='__main__':main()
