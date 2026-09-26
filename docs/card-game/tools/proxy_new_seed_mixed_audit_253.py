#!/usr/bin/env python3
"""Audit three mandatory egg exchanges and one reached normal action."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_turn_end_replay_252 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='0356ccf307e697fe78c15a53105fcefc9696b011615bebca339f07a804f50bda'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-253-20260926.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_253.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('253 protected 234 raw/canonical differs')
    source=json.loads(raw)
    if len(source['results'])!=4 or any(states.validate_result(x) for x in source['results']):
        raise ValueError('253 source state integrity differs')
    return source

def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];actor=game['turn_player']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('253 source state/hash differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if game['phase']=='normal_action':
        if row['path_id']!='probe-02-b-first' or \
                row['stop_reason_code']!='unproved_next_priority_response_candidates':
            raise ValueError('253 protected stop label discrepancy differs')
        corrected=copy.deepcopy(row)
        corrected['stop_reason_code']='unproved_current_normal_action_candidates'
        proof=normal.audit_route(corrected)
        if proof['next_opportunity']!='normal_action' or \
                not proof['candidate_set_complete'] or \
                not all(proof['completeness_checks'].values()):
            raise ValueError('253 normal opportunity incomplete')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':copy.deepcopy(proof['candidate_ids']),
                'candidate_set_complete':True,
                'legal_candidate_details':copy.deepcopy(proof['legal_candidate_details']),
                'completeness_checks':copy.deepcopy(proof['completeness_checks']),
                'board_exclusions':copy.deepcopy(proof['board_exclusions']),
                'reported_stop_reason_code':row['stop_reason_code'],
                'stop_label_correction':'phase_is_normal_action'}
    owner=game['players'][actor]
    if row['stop_reason_code']!='unproved_current_egg_exchange_choice' or \
            game['phase']!='egg_exchange_choice' or not 1<=game['round']<=10 or \
            len(owner['hand'])<2 or owner['reservations'] or \
            state['activation_zone'] or state['pending_triggers']:
        raise ValueError('253 mandatory egg boundary differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    hand=[{'card_copy_id':game['cards'][instance]['card_copy_id'],
           'card_id':game['cards'][instance]['card_id'],'initial_instance_id':instance}
          for instance in owner['hand']]
    decision=opening.build_mandatory_choice_decision({'order_id':order},actor,
        game['round'],game['round'],hand)
    if fallback.validate_seeded_resolution(decision) or \
            len(decision['legal_candidates'])!=len(owner['hand']) or \
            decision['seeded_fallback_candidates']!=decision['legal_candidates'] or \
            {x['initial_instance_id'] for x in decision['legal_candidate_details']}!=set(owner['hand']):
        raise ValueError('253 mandatory candidate completeness differs')
    return {**base,'next_opportunity':'mandatory_egg_exchange',
            'candidate_ids':copy.deepcopy(decision['legal_candidates']),
            'candidate_set_complete':True,
            'legal_candidate_details':copy.deepcopy(decision['legal_candidate_details']),
            'resolution_mode':decision['resolution_mode']}

def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['253 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(x['next_opportunity']=='mandatory_egg_exchange' for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('253 mixed opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('253 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('253: three egg exchanges and one normal opportunity complete')
if __name__=='__main__':main()
