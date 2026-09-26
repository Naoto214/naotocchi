#!/usr/bin/env python3
"""Audit four current response windows, including egg-suppressed partner."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_replay_239 as states
import proxy_new_seed_followup_audit_213 as placement
import proxy_new_seed_next_response_audit_208 as priority
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='453e0096a35074ace9981e724246839a01506b08167f02734d15a42eba328ea8'
OUTPUT=ROOT/'data/proxy-new-seed-followup-audit-240-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_followup_audit_240.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('240 protected 239 raw/canonical differs')
    source=json.loads(raw)
    if len(source['results'])!=4 or any(states.validate_result(x) for x in source['results']):
        raise ValueError('240 source integrity differs')
    return source

def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('240 source hash differs')
    actor=ctx['priority_actor'];owner=game['players'][actor];partner=owner['board']['partner']
    extra=[]
    if game['phase']=='post_placement_response':
        proof=placement.audit_route(row)
    elif game['phase']=='response_window' and row['stop_reason_code']==\
            'unproved_next_priority_response_candidates':
        projected=copy.deepcopy(row)
        if partner is not None and game['cards'][partner]['card_id']=='P-cat_ceo':
            section=hand.source_section('74-partner-18-card-text-draft.md','P-cat_ceo')
            if owner['board']['main'] is not None or \
                    '交際を始めた時、発動する' not in section or \
                    'たまご中は元の関係を保ち、こいびとの能力を無効に' not in \
                    (ROOT/'66-relationship-start-and-romance-profile.md').read_text():
                raise ValueError('240 partner egg suppression unproved')
            extra=[{'source_instance_id':partner,'card_id':'P-cat_ceo',
                    'reason_code':'partner_ability_disabled_during_egg'}]
            on_board=projected['final_continuation_state']['game_state']['players'][actor]['board']
            on_board['partner']=None;on_board['partner_stage']=None
        proof=priority.audit_route(projected)
    else:raise ValueError('240 response boundary unclassified')
    if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('240 response candidates incomplete')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'current_phase':game['phase'],'candidate_ids':['response-pass'],
            'candidate_set_complete':True,
            'hand_conditional_exclusions':copy.deepcopy(proof['hand_conditional_exclusions']),
            'hand_other_exclusions':copy.deepcopy(proof['hand_other_exclusions']),
            'board_exclusions':extra+copy.deepcopy(proof['board_exclusions']),
            'new_events':0,'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['240 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    rows=[audit_route(r) for r in load_source()['results']]
    if len(rows)!=4 or any(validate_result(r) for r in rows):
        raise ValueError('240 response opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('240 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('240: four response windows pass-only')
if __name__=='__main__':main()
