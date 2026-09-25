#!/usr/bin/env python3
"""Compare complete mixed opportunities from the saved 222 boundary."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_222 as audits
import proxy_new_seed_egg_replay_221 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_response_window_seeded_restart as response
import proxy_normal_decision_hardening as priority
import proxy_normal_action_candidate_completeness as candidates
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='6a477e8a2c432f95f39aeecb0d80340d674835df0ba2d384b0f08895614cc693'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-223-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_223.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('223 protected audit/state raw differs')
    proof=json.loads(raw);source=json.loads(saved)
    if len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']) or \
            any(states.validate_result(x) for x in source['results']):
        raise ValueError('223 protected candidate/state integrity differs')
    return proof,source

def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('223 source boundary or candidate completeness differs')
    state=row['final_continuation_state'];game=state['game_state'];actor=game['turn_player']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('223 source hashes differ')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,
          'balance_sample_count':0}
    if proof['next_opportunity']=='response_window':
        if proof['candidate_ids']==['response-pass']:
            if row['stop_reason_code'] not in ('unproved_post_placement_response_candidates',
                                              'unproved_next_turn_start_response_candidates'):
                raise ValueError('223 unique pass window differs')
            return {**base,'selected_candidate':'response-pass','resolution_mode':'response_unique',
                    'comparison':{'reason':'only_complete_legal_candidate'}}
        if row['stop_reason_code']!='unproved_next_turn_start_response_candidates':
            raise ValueError('223 multiple response window differs')
        current={**state,'source_event_seq':row['last_valid_event_seq'],
                 'last_event_seq':row['last_valid_event_seq'],
                 'source_game_state_sha256':row['final_game_state_sha256'],
                 'continuation_state_sha256':row['final_continuation_state_sha256']}
        chance=precedent.opportunity(current,proof)
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,
            'actor_turn_index':game['round'],'round':game['round']},chance)
        if decision['selected_candidate']!=proof['board_candidate_details'][0]['candidate_id'] or \
                decision['resolution_mode']!='response_seeded_fallback':
            raise ValueError('223 seeded board response differs')
        return {**base,'selected_candidate':decision['selected_candidate'],
                'resolution_mode':decision['resolution_mode'],'comparison':decision}
    if proof['next_opportunity']!='normal_action' or \
            proof['candidate_ids']!=['candidate-play-main-B-001#1-birth','pass'] or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('223 normal candidate set differs')
    owner=game['players'][actor];paid=next(x for x in proof['legal_candidate_details']
                                          if x['action_type']=='play_main')
    instance=paid['source_instance_id'];card=game['cards'][instance]
    if instance not in owner['hand'] or card['card_id']!='M-antlion-01' or \
            paid['candidate_variant']!='birth':
        raise ValueError('223 birth identity differs')
    birth=start.opening._main_birth_detail(instance,card,
        candidates.load_inputs()['candidate_table'],owner['board'],owner['time'])
    section=(ROOT/'55-insect-three-lines-card-text-draft.md').read_text().split(
        '## M-antlion-01 ',1)[1].split('\n## ',1)[0]
    if birth is None or birth['candidate_id']!=paid['candidate_id'] or \
            birth['payment_time']!=1 or 'しかける' not in section or \
            'そのカードをプレイするための時を1少なく' not in section:
        raise ValueError('223 certain paid birth effect differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    passed={**common,'candidate_id':'pass','time_after_certain_resolution':owner['time'],
            'payment_time':0,'card_copy_id':''}
    paid_score={**common,'candidate_id':paid['candidate_id'],
                'time_after_certain_resolution':owner['time']-birth['payment_time'],
                'payment_time':birth['payment_time'],'card_copy_id':card['card_copy_id']}
    comparison=priority.compare_candidates(passed,paid_score)
    if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':
        raise ValueError('223 normal priority differs')
    return {**base,'selected_candidate':'pass','resolution_mode':'priority_comparison',
            'comparison':comparison,'priority_scores':{'pass':passed,'paid':paid_score},
            'source_references':['107-normal-action-decision-checkpoint.md',
                                 '114-normal-decision-hardening.md',
                                 '55-insect-three-lines-card-text-draft.md#M-antlion-01']}

def validate_result(result):
    try:
        proof,source=load_sources()
        row=next(x for x in source['results'] if x['path_id']==result['path_id'])
        p=next(x for x in proof['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,p) else ['223 independent choice differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:
        return [str(error)]

def build_report():
    proof,source=load_sources()
    rows=[audit_route(row,next(x for x in proof['results'] if x['path_id']==row['path_id']))
          for row in source['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('223 four choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('223 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('223: four mixed choices audited')

if __name__=='__main__':main()
