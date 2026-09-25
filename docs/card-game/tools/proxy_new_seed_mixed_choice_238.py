#!/usr/bin/env python3
"""Choose three unique responses and a safe zero-cost partner placement."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_237 as audits
import proxy_new_seed_egg_replay_236 as states
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_new_seed_normal_choice_229 as prior_paid
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='b9dc656d9a66eb37b72c450973cf9224f5c6efea2039ac0e1a88bc5b4f8c5e3d'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-238-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_238.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('238 protected audit/state differs')
    proofs=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(rows)!=4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('238 source inventory differs')
    return proofs,rows

def no_card_play_since_turn_start(row):
    path=row['path_id'];seq=None;game=None;cont=None;events=[]
    for number in range(220,237):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError('238 saved turn history missing')
        saved=next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id']==path)
        batch=saved.get('new_events',[])
        if batch==0:batch=[]
        for event in batch:
            if seq is not None and (event['seq']!=seq+1 or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont):
                raise ValueError('238 turn history chain differs')
            seq=event['seq'];game=event['game_state_after_sha256']
            cont=event['continuation_state_after_sha256'];events.append(event)
    if seq!=row['last_valid_event_seq'] or game!=row['final_game_state_sha256'] or \
            cont!=row['final_continuation_state_sha256'] or \
            not any(x['action_type']=='turn_start_and_egg_draw' for x in events) or \
            any(x['action_type'] not in ('turn_end_completed','turn_start_and_egg_draw',
                                        'egg_exchange_bottom','response_pass',
                                        'activate_response','resolve_board_ability') for x in events):
        raise ValueError('238 current turn free placement history differs')
    return [x['action_type'] for x in events]

def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('238 source boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,
          'balance_sample_count':0}
    if proof['next_opportunity']=='response_window':
        if proof['candidate_ids']!=['response-pass']:
            raise ValueError('238 response pass not unique')
        return {**base,'selected_candidate':'response-pass',
                'resolution_mode':'response_unique','paid_comparisons':[]}
    if proof['next_opportunity']!='normal_action' or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('238 normal opportunity incomplete')
    game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    details=proof['legal_candidate_details']
    if [x['candidate_id'] for x in details]!=proof['candidate_ids'] or \
            {x['action_type'] for x in details}!={'place_partner','place_world','set_item','pass'} or \
            len(details)!=4 or owner['person_placed'] or owner['board']['main'] is not None or \
            any(x['growth']>=100 for x in game['players'].values()):
        raise ValueError('238 normal candidate families differ')
    history=no_card_play_since_turn_start(row)
    free=next(x for x in details if x['action_type']=='place_partner')
    card=game['cards'][free['source_instance_id']]
    with placement_scope.partner_placement_scope():
        placement=start.opening._placement_for_card(free['source_instance_id'],card,
            candidates.load_inputs()['candidate_table'],owner['board'])
    if placement is None or placement['candidate_id']!=free['candidate_id'] or \
            fallback.validate_safe_free_placement(placement):
        raise ValueError('238 free person development differs')
    section=audits.starts.source_section('74-partner-18-card-text-draft.md',card['card_id'])
    if card['card_id']!='P-cat_ceo' or '交際を始めた時、発動する' not in section:
        raise ValueError('238 placed partner timing differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    free_score={**common,'candidate_id':free['candidate_id'],
                'time_after_certain_resolution':owner['time'],'payment_time':0,
                'card_copy_id':card['card_copy_id']}
    comparisons=[]
    for paid in details:
        if paid['action_type'] not in ('place_world','set_item'):continue
        cost,reference=prior_paid.cost_and_effect(row,paid)
        score={**common,'candidate_id':paid['candidate_id'],
               'time_after_certain_resolution':owner['time']-cost,'payment_time':cost,
               'card_copy_id':game['cards'][paid['source_instance_id']]['card_copy_id']}
        comparison=priority.compare_candidates(free_score,score)
        if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':
            raise ValueError('238 paid action not dominated')
        comparisons.append({'candidate_id':paid['candidate_id'],'source_reference':reference,
                            'score':score,'comparison':comparison})
    if len(comparisons)!=2:
        raise ValueError('238 paid alternatives differ')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,
             'actor':actor,'actor_turn_index':game['round'],'round':game['round'],
             'phase':'normal_action','decision_kind':'normal_action',
             'choice_kind':'zero_cost_person_placement'}
    decision=fallback.resolve_safe_free_development([placement],context,proof['candidate_ids'])
    if 'error' in decision or decision['resolution_mode']!='safe_free_development' or \
            decision['selected_candidate']!=free['candidate_id'] or \
            decision['selected_placement']!=placement:
        raise ValueError('238 safe free development contract differs')
    decision['selected_action']=copy.deepcopy(free)
    decision['legal_candidate_details']=copy.deepcopy(details)
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    return {**base,'selected_candidate':free['candidate_id'],
            'resolution_mode':decision['resolution_mode'],
            'selected_decision':decision,'free_score':free_score,
            'paid_comparisons':comparisons,'current_turn_event_actions':history,
            'source_contracts':[107,114,116]}

def validate_result(result):
    try:
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,proof) else ['238 independent choice differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[audit_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('238 mixed choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('238 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('238: three unique passes and one free partner placement selected')
if __name__=='__main__':main()
