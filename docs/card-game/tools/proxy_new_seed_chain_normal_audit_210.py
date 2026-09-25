#!/usr/bin/env python3
"""Audit three current normal actions and the active ability chain response."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_ability_activation_209 as states
import proxy_new_seed_chain_normal_audit_191 as earlier
import proxy_new_seed_normal_trigger_audit_146 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_ability_id_167 as identifiers
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='391bd1d194978fd91b6f6d1820140e6c2458d9a62cb15db23a8f68d16744b29b'
OUTPUT=ROOT/'data/proxy-new-seed-chain-normal-audit-210-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_chain_normal_audit_210.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('210 protected 209 raw/replay differs')
    data=json.loads(raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            any(states.validate_result(x) for x in data['results']):
        raise ValueError('210 saved source state differs')
    return data


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state']
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']=='unproved_current_normal_action_candidates':
        if game['phase']!='normal_action' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('210 normal action boundary differs')
        actor=game['turn_player'];person=game['players'][actor]['board']['partner']
        card_id=game['cards'][person]['card_id'] if person else None
        prior=earlier.audit_route(row) if card_id=='P-cliff_goat' else normal.audit_route(row)
        if not prior['candidate_set_complete'] or \
                not all(prior['completeness_checks'].values()):
            raise ValueError('210 normal candidate completeness differs')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':copy.deepcopy(prior['candidate_ids']),
                'candidate_set_complete':True,
                'legal_candidate_details':copy.deepcopy(prior['legal_candidate_details']),
                'completeness_checks':copy.deepcopy(prior['completeness_checks']),
                'board_exclusions':copy.deepcopy(prior.get('board_exclusions',
                                                          prior.get('board_response_exclusions')))}
    if row['stop_reason_code']!='unproved_current_chain_response_candidates':
        raise ValueError('210 current opportunity unclassified')
    ctx=state['response_context'];actor=ctx['priority_actor'];owner=game['players'][actor]
    links=state['activation_zone']
    if game['phase']!='response_window' or ctx['window_kind']!='turn_start' or \
            ctx['chain_status']!='building' or ctx['consecutive_passes']!=0 or \
            len(links)!=1 or ctx['chain_links']!=[links[0]['link_id']] or \
            links[0].get('source_zone')!='board' or links[0]['actor']!=actor or \
            links[0]['source_instance_id'] not in owner['board']['companions'] or \
            state['pending_triggers']:
        raise ValueError('210 active board ability link differs')
    active=links[0];instance=active['source_instance_id'];card_id=active['card_id']
    origin=row['new_events'][0]
    if card_id!='C-chicken' or origin['action_type']!='activate_response' or \
            origin['source_instance_id']!=instance or \
            origin['chain_link_id']!=active['link_id'] or \
            origin['selected_candidate']!=identifiers.board_ability_response_id(instance,1):
        raise ValueError('210 currently active once-per-turn source differs')
    projected=copy.deepcopy(state);removed=[];rows=start.load_candidate_rows()
    for hand_instance in owner['hand']:
        held_id=game['cards'][hand_instance]['card_id'];entry=rows.get(held_id)
        if entry is None:raise ValueError('210 missing hand candidate table')
        omission=hand.extra_hand_exclusion(held_id,entry,game,actor)
        if omission is None:
            action=next((a for a in entry['actions'] if a['action_type'] in
                         ('use_play','use_item','use_event')),None)
            if action is not None and owner['time']>=action['base_time_cost']:
                omission=conditional.conditional_exclusion(held_id,game,actor)
        if omission:
            removed.append({'source_instance_id':hand_instance,**omission})
            projected['game_state']['players'][actor]['hand'].remove(hand_instance)
    if owner['board']['companions']!=[instance]:
        raise ValueError('210 other board companion unclassified')
    projected['game_state']['players'][actor]['board']['companions']=[]
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or \
            not chance['candidate_set_complete']:
        raise ValueError('210 chain response candidate incomplete')
    return {**base,'next_opportunity':'response_window',
            'candidate_ids':['response-pass'],'candidate_set_complete':True,
            'active_link_id':active['link_id'],
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':[{'source_instance_id':instance,'card_id':card_id,
                                 'reason_code':'ability_already_active_this_turn'}]}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['210 independent opportunity audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(x['next_opportunity']=='normal_action' for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('210 chain/normal opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('210 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('210: three complete normal choices and one unique chain pass')


if __name__=='__main__':main()
