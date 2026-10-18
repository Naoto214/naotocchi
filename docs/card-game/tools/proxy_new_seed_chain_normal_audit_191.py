#!/usr/bin/env python3
"""Audit three current normal choices and the active ability chain response."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_ability_activation_190 as states
import proxy_new_seed_normal_trigger_audit_146 as normal
import proxy_new_seed_normal_audit_156 as anglerfish
import proxy_new_seed_board_partner_audit_179 as cliff_goat
import proxy_new_seed_start_audit_166 as conditional
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='857225c24003132f803b48fe9a9ce9c115e9f57b24c5293c254acc21f889bd46'
OUTPUT=ROOT/'data/proxy-new-seed-chain-normal-audit-191-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_chain_normal_audit_191.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256:
        raise ValueError('191 protected 190 raw differs')
    data=json.loads(raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            any(states.validate_result(x) for x in data['results']):
        raise ValueError('191 saved state/hash differs')
    return data


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state']
    base={'path_id':row['path_id'],
          'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']=='unproved_current_normal_action_candidates':
        if game['phase']!='normal_action' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('191 normal action boundary differs')
        actor=game['turn_player'];partner=game['players'][actor]['board']['partner']
        card_id=game['cards'][partner]['card_id'] if partner else None
        if card_id=='P-cliff_goat':a=cliff_goat.audit_route(row)
        elif card_id=='P-anglerfish':a=anglerfish.audit_route(row)
        elif card_id is None:a=normal.audit_route(row)
        else:raise ValueError('191 unclassified normal board partner')
        if not a['candidate_set_complete'] or \
                not all(a['completeness_checks'].values()):
            raise ValueError('191 normal candidate completeness differs')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':a['candidate_ids'],'candidate_set_complete':True,
                'legal_candidate_details':a['legal_candidate_details'],
                'completeness_checks':a['completeness_checks'],
                'board_exclusions':a.get('board_exclusions',a.get('board_response_exclusions'))}
    if row['stop_reason_code']!='unproved_current_chain_response_or_resolution':
        raise ValueError('191 current opportunity unclassified')
    ctx=state['response_context'];actor=ctx['priority_actor'];owner=game['players'][actor]
    links=state['activation_zone']
    if game['phase']!='response_window' or ctx['window_kind']!='turn_start' or \
            ctx['chain_status']!='building' or ctx['consecutive_passes']!=0 or \
            len(links)!=1 or ctx['chain_links']!=[links[0]['link_id']] or \
            links[0].get('source_zone')!='board' or links[0]['actor']!=actor or \
            links[0]['source_instance_id'] not in owner['board']['companions'] or \
            state['pending_triggers']:
        raise ValueError('191 active board link boundary differs')
    projected=copy.deepcopy(state);removed=[]
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=start.load_candidate_rows().get(card_id)
        if entry is None:raise ValueError('191 missing hand candidate source')
        action=next((x for x in entry['actions'] if x['action_type'] in
                     ('use_play','use_item','use_event')),None)
        if action is None or owner['time']<action['base_time_cost']:continue
        exclusion=conditional.conditional_exclusion(card_id,game,actor)
        if exclusion:
            removed.append({'source_instance_id':instance,**exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    # The existing chain contains this source's once-per-turn ability.
    if owner['board']['companions']!=[links[0]['source_instance_id']] or \
            game['cards'][links[0]['source_instance_id']]['card_id']!='C-chicken':
        raise ValueError('191 currently active companion inventory differs')
    projected['game_state']['players'][actor]['board']['companions']=[]
    chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    if chance['legal_candidate_ids']!=['response-pass'] or \
            not chance['candidate_set_complete']:
        raise ValueError('191 chain response candidate incomplete')
    return {**base,'next_opportunity':'response_window',
            'candidate_ids':['response-pass'],'candidate_set_complete':True,
            'active_link_id':links[0]['link_id'],
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':[{'source_instance_id':links[0]['source_instance_id'],
                                 'card_id':links[0]['card_id'],
                                 'reason_code':'ability_already_active_this_turn'}]}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['191 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('191 chain/normal opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('191 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('191: 3 complete normal actions and 1 unique chain response pass')


if __name__=='__main__':main()
