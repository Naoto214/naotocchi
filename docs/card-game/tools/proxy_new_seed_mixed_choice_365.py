#!/usr/bin/env python3
"""Choose normal pass, first date response, and two unique passes."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_364 as audits
import proxy_new_seed_mixed_replay_363 as states
import proxy_new_seed_mixed_choice_325 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-365-20260929.json'
SOURCE_RAW_SHA256='d3b487c385d92188fe4d382ce944e6b7befb304baee1ae80ba6d181a21c8f32e'
STATE_RAW_SHA256='0930f90356ddef5007d7392aee104753807d1f9c27a94eb875d514a879334b18'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_365.v1'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
            raw!=audits.canonical_bytes(audits.build_report()) or
            saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('365 protected audit/state differs')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('365 audited candidate inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']):
        raise ValueError('365 source boundary differs')
    path=row['path_id'];game=row['final_continuation_state']['game_state']
    owner=game['players'][game['turn_player']]
    base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,'balance_sample_count':0}
    if path in ('probe-02-a-first','probe-02-b-first'):
        if proof['next_opportunity']!='response_window' or proof['candidate_ids']!=['response-pass']:
            raise ValueError('365 unique response differs')
        return {**base,'selected_candidate':'response-pass','resolution_mode':'response_unique'}
    if path=='probe-01-b-first':
        if (proof['next_opportunity']!='response_window' or
                proof['candidate_ids']!=['response-activate-ability-A-015#1','response-pass',
                                          'response-use-event-A-040#1-target-A-017#1'] or
                len(proof['board_candidate_details'])!=1 or len(proof['hand_candidate_details'])!=1 or
                proof['hand_candidate_details'][0]['target_instance_ids']!=['A-017#1'] or
                owner['board']['partner_stage']!=0):
            raise ValueError('365 first date candidate proof differs')
        detail=proof['board_candidate_details'][0]
        board={**detail,'card_copy_id':game['cards'][detail['source_instance_id']]['card_copy_id'],
               'target_instance_ids':[],'candidate_variant':None,'base_time_cost':0}
        all_details=sorted([start.response.build_response_pass_detail(),board,
                            proof['hand_candidate_details'][0]],key=lambda x:x['candidate_id'])
        if [x['candidate_id'] for x in all_details]!=proof['candidate_ids']:
            raise ValueError('365 first date response details differ')
        opportunity={'actor':game['turn_player'],'response_context':row['final_continuation_state']['response_context'],
                     'legal_candidate_ids':proof['candidate_ids'],'legal_candidate_details':all_details,
                     'candidate_set_complete':True,'forbidden_information_used':[]}
        order=next(x for x in start.load_source()['results'] if x['path_id']==path)['order_id']
        decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':game['round'],
            'round':game['round']},opportunity)
        if (decision['selected_candidate']!='response-use-event-A-040#1-target-A-017#1' or
                decision['resolution_mode']!='priority_unique' or
                decision['comparison_evidence']['criterion']!='maximize_certain_growth_difference'):
            raise ValueError('365 first date certain growth priority differs')
        return {**base,'selected_candidate':decision['selected_candidate'],
                'resolution_mode':'priority_unique','comparison':decision}
    if path!='probe-01-a-first' or proof['next_opportunity']!='normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('365 normal opportunity differs')
    details=proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details]!=proof['candidate_ids'] or
            [x['action_type'] for x in details]!=['place_world','set_item','pass'] or
            [x['card_id'] for x in details[:2]]!=['W-countryside','I-poop1']):
        raise ValueError('365 normal candidate families differ')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,
            'consumed_card_count':0,'value_comparison_to':{}}
    passed={**common,'candidate_id':'pass','payment_time':0,
            'time_after_certain_resolution':owner['time'],'card_copy_id':''}
    comparisons=[]
    for action in details[:2]:
        cost,ref=paid.paid_cost_and_effect(row,action)
        score={**common,'candidate_id':action['candidate_id'],'payment_time':cost,
               'time_after_certain_resolution':owner['time']-cost,
               'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        compared=priority.compare_candidates(passed,score)
        if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':
            raise ValueError('365 paid action priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,
                            'score':score,'comparison':compared})
    return {**base,'selected_candidate':'pass','resolution_mode':'priority_unique',
            'pass_score':passed,'paid_comparisons':comparisons,'source_contracts':[107,114]}
def build_report():
    rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'state_raw_sha256':STATE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('365 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('365: normal pass, first date and two unique response passes selected')
if __name__=='__main__':main()
