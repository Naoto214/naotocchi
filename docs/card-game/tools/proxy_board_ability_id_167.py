#!/usr/bin/env python3
"""Bind reached single board-trigger candidates to the approved response ID."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_audit_166 as prior

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='68d4b8a7861cc7142d775260ecb9fd6f649d5595985c9c6ac9ad7725104442e7'
OUTPUT=ROOT/'data/proxy-board-ability-id-167-20260925.json'
SCHEMA='naotocchi.card_game.proxy_board_ability_id_167.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


def board_ability_response_id(source_instance_id,eligible_abilities):
    if not isinstance(source_instance_id,str) or not source_instance_id or \
            any(c.isspace() for c in source_instance_id) or \
            type(eligible_abilities) is not int or eligible_abilities!=1:
        raise ValueError('board ability response ID requires one eligible ability per source')
    return f'response-activate-ability-{source_instance_id}'


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('166 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(row) for row in data['results']):
        raise ValueError('166 opportunity proof differs')
    return data


def audit_route(source):
    legal=source['board_legal_without_id'];hand=source['hand_candidate_ids']
    if not source['hand_candidate_set_complete'] or len(hand)!=len(set(hand)) or \
            source['candidate_set_complete']!=(not legal):
        raise ValueError('167 source candidate family differs')
    grouped={}
    for ability in legal:
        if ability['candidate_family']!='triggered_ability':
            raise ValueError('167 unclassified ability family')
        instance=ability['source_instance_id'];grouped.setdefault(instance,[]).append(ability)
    board=[]
    for instance,abilities in grouped.items():
        identifier=board_ability_response_id(instance,len(abilities))
        board.append({'candidate_id':identifier,'candidate_family':'triggered_ability',
                      'action_type':'activate_board_ability','source_instance_id':instance,
                      'card_id':abilities[0]['card_id'],
                      'source_references':[abilities[0]['source_reference']]})
    ids=sorted(hand+[entry['candidate_id'] for entry in board])
    if len(ids)!=len(set(ids)) or any(x.startswith('candidate-') for x in ids):
        raise ValueError('167 response ID namespace collision')
    return {'path_id':source['path_id'],
            'source_last_valid_event_seq':source['source_last_valid_event_seq'],
            'source_game_state_sha256':source['source_game_state_sha256'],
            'source_continuation_state_sha256':source['source_continuation_state_sha256'],
            'candidate_ids':ids,'board_candidate_details':sorted(board,key=lambda x:x['candidate_id']),
            'hand_candidate_ids':hand,'candidate_set_complete':True,
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(row):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==row['path_id'])
        return [] if row==audit_route(source) else ['167 independent ID replay differs']
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(row) for row in rows):
        raise ValueError('167 response namespace audit differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('167 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('167: approved general board ability response ID; 4 complete opportunities')


if __name__=='__main__':main()
