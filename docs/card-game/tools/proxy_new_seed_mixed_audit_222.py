#!/usr/bin/env python3
"""Audit two turn starts, one post-placement response, and one normal action."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_egg_replay_221 as states
import proxy_new_seed_turn_end_replay_220 as prior
import proxy_new_seed_mixed_replay_218 as placement
import proxy_new_seed_start_audit_206 as starts
import proxy_new_seed_followup_audit_213 as followup
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='4d10eed053d69ad479691b290fc9cd1cb4f0a6040256debfd66a1430b6743c64'
OLD_RAW_SHA256='f115857ea938f9d74fc33acfddb44835adf20b02004ba5cf893ecb6022b13e54'
PLACEMENT_RAW_SHA256='f5ed4157ee44558b73303e08a114ad70fda40e576e290cfa18e674aa38add0fd'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-222-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_222.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();old=prior.OUTPUT.read_bytes();place=placement.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(old).hexdigest()!=OLD_RAW_SHA256 or \
            hashlib.sha256(place).hexdigest()!=PLACEMENT_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()) or \
            old!=prior.canonical_bytes(prior.build_report()) or \
            place!=placement.canonical_bytes(placement.build_report()):
        raise ValueError('222 protected source artifacts differ')
    current=json.loads(raw);earlier=json.loads(old);placed=json.loads(place)
    if len(current['results'])!=len(earlier['results'])!=len(placed['results'])!=4 or \
            any(states.validate_result(x) for x in current['results']):
        raise ValueError('222 source state integrity differs')
    return current,earlier,placed


def audit_route(row,old,place):
    state=row['final_continuation_state'];game=state['game_state']
    if old['path_id']!=row['path_id'] or place['path_id']!=row['path_id'] or \
            start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('222 source state/hash differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']=='unproved_next_turn_start_response_candidates':
        if old['stop_reason_code']!='unproved_current_egg_exchange_choice' or \
                row['source_last_valid_event_seq']!=old['last_valid_event_seq']:
            raise ValueError('222 start response source differs')
        working=copy.deepcopy(row);actor=game['turn_player'];owner=game['players'][actor]
        extra=[]
        for instance in owner['hand']:
            card_id=game['cards'][instance]['card_id']
            if card_id!='G-animal-shogi':continue
            text=starts.source_section('83-play-batch-3-card-text-draft.md',card_id)
            if '自分の捨て札のなかま1枚を対象' not in text or \
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('222 shogi target requires separate audit')
            working['final_continuation_state']['game_state']['players'][actor]['hand'].remove(instance)
            extra.append({'source_instance_id':instance,'card_id':card_id,
                          'reason_code':'requires_own_discarded_companion',
                          'source_reference':'83-play-batch-3-card-text-draft.md#'+card_id})
        proof=starts.audit_route(working,old)
        if not proof['candidate_set_complete'] or \
                len(extra)>1 or proof['candidate_ids'] not in (
                    ['response-pass'],['response-activate-ability-A-015#1','response-pass']):
            raise ValueError('222 start candidates incomplete')
        return {**base,'next_opportunity':'response_window',
                'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
                'hand_candidate_ids':proof['hand_candidate_ids'],
                'hand_conditional_exclusions':extra+proof['hand_conditional_exclusions'],
                'hand_other_exclusions':proof['hand_other_exclusions'],
                'board_candidate_details':proof['board_candidate_details'],
                'board_exclusions':proof['board_exclusions']}
    if row['stop_reason_code']=='unproved_post_placement_response_candidates':
        if place['new_events'][0]['action_type']!='place_partner' or \
                place['last_valid_event_seq']!=row['last_valid_event_seq'] or \
                (place['final_game_state_sha256'],place['final_continuation_state_sha256'])!=(
                    row['final_game_state_sha256'],row['final_continuation_state_sha256']):
            raise ValueError('222 held placement history differs')
        synthetic=copy.deepcopy(row);synthetic['new_events']=copy.deepcopy(place['new_events'])
        proof=followup.audit_route(synthetic)
        if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('222 placement response incomplete')
        return {**base,'next_opportunity':'response_window',
                'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
                'hand_conditional_exclusions':proof['hand_conditional_exclusions'],
                'hand_other_exclusions':proof['hand_other_exclusions'],
                'board_exclusions':proof['board_exclusions']}
    if row['stop_reason_code']=='unproved_current_normal_action_candidates':
        proof=normal.audit_route(row)
        if proof['candidate_ids']!=['candidate-play-main-B-001#1-birth','pass'] or \
                not proof['candidate_set_complete'] or \
                not all(proof['completeness_checks'].values()):
            raise ValueError('222 normal candidate completeness differs')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
                'legal_candidate_details':proof['legal_candidate_details'],
                'completeness_checks':proof['completeness_checks'],
                'board_exclusions':proof['board_exclusions']}
    raise ValueError('222 current opportunity unclassified')


def validate_result(result):
    try:
        current,earlier,placed=load_sources()
        row=next(x for x in current['results'] if x['path_id']==result['path_id'])
        old=next(x for x in earlier['results'] if x['path_id']==result['path_id'])
        place=next(x for x in placed['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,old,place) else ['222 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]


def build_report():
    current,earlier,placed=load_sources()
    rows=[audit_route(row,next(x for x in earlier['results'] if x['path_id']==row['path_id']),
                       next(x for x in placed['results'] if x['path_id']==row['path_id']))
          for row in current['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('222 mixed opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('222 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('222: four complete mixed opportunities')


if __name__=='__main__':main()
