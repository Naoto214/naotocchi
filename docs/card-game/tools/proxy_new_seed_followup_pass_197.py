#!/usr/bin/env python3
"""Enumerate and apply the reached second post-placement response pass."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_ability_resolution_196 as prior
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='d143bd0c95bd3eaeb9a86259d6cb18013a6a71489597adfe78f47bcbb24504ad'
OUTPUT=ROOT/'data/proxy-new-seed-followup-pass-197-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_followup_pass_197.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('197 protected source raw/replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or len(data['results'])!=4 or \
            any(prior.validate_result(x) for x in data['results']):
        raise ValueError('197 source inventory differs')
    return data


def opportunity(state):
    ctx=state['response_context'];actor=ctx['priority_actor'];game=state['game_state']
    if game['phase']!='post_placement_response' or \
            ctx['window_kind']!='after_normal_action' or \
            ctx['consecutive_passes']!=1 or ctx['chain_links'] or \
            ctx['chain_status']!='empty' or state['pending_triggers'] or state['activation_zone']:
        raise ValueError('197 post-placement second priority differs')
    projected=copy.deepcopy(state);owner=projected['game_state']['players'][actor]
    rows=start.load_candidate_rows();excluded=[];board=[]
    for instance in list(owner['hand']):
        card_id=game['cards'][instance]['card_id']
        if card_id not in rows:raise ValueError('197 hand card unregistered')
        omission=conditional.conditional_exclusion(card_id,game,actor)
        if omission:
            owner['hand'].remove(instance)
            excluded.append({'source_instance_id':instance,**omission})
    for instance in list(owner['board']['companions']):
        card_id=game['cards'][instance]['card_id']
        if card_id not in timing.TRIGGERS:raise ValueError('197 board ability timing unclassified')
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(fragment not in section for fragment in timing.TRIGGERS[card_id][1:]) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               'response_pass',ctx['turn_player']):
            raise ValueError('197 board trigger cannot be excluded')
        owner['board']['companions'].remove(instance)
        board.append({'source_instance_id':instance,'card_id':card_id,
                      'reason_code':'trigger_condition_not_met'})
    if owner['board']['partner'] or owner['board']['prepared']:
        raise ValueError('197 unclassified own partner or prepared ability')
    projected['game_state']['phase']='response_window'
    projected['response_context']['window_kind']='turn_start'
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('197 response candidates not unique')
    chance['response_context']=copy.deepcopy(ctx)
    return chance,excluded,board


def run_route(row):
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('197 source state hash differs')
    decisions=[];events=[];shots=[];ids=[];excluded=[];board=[];complete=False
    if state['game_state']['phase']=='post_placement_response':
        chance,excluded,board=opportunity(state)
        ids=chance['legal_candidate_ids'];complete=chance['candidate_set_complete']
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('197 pass decision differs')
        decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                         'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                         'event_seq':row['last_valid_event_seq']})
        after,event,snapshot=start._pass(state,state['response_context']['priority_actor'])
        if after['game_state']['phase']!='normal_action':
            raise ValueError('197 response not closed')
        normal._verify_step(state,after,[event])
        decisions=[decision];events=[event];shots=[snapshot]
        reason='unproved_current_normal_action_candidates'
    elif row['stop_reason_code'] in ('unproved_current_normal_action_candidates',
                                     'unproved_current_turn_end_provenance'):
        after=state;reason=row['stop_reason_code']
    else:raise ValueError('197 held phase unclassified')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'legal_candidate_ids':ids,'candidate_set_complete':complete,
            'hand_conditional_exclusions':excluded,'board_exclusions':board,
            'new_decisions':decisions,'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(source) or result['last_valid_event_seq']!=source['last_valid_event_seq']+len(result['new_events']):
            return ['197 independent replay differs']
        game=source['final_game_state_sha256'];cont=source['final_continuation_state_sha256']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=source['last_valid_event_seq']+1 or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['197 response event/hash/snapshot differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('197 followup pass replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':1,'new_events':1,
            'new_snapshots':1,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('197 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('197: one unique post-placement pass, four routes held')


if __name__=='__main__':main()
