#!/usr/bin/env python3
"""Audit three next priorities and the selected on-board ability boundary."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_choice_188 as states
import proxy_new_seed_start_audit_166 as previous
import proxy_board_ability_id_167 as identifiers
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='9a0d802123ced60267920dfa7d9148e6a85a98752f5c8b5918dc51f589cda73e'
OUTPUT=ROOT/'data/proxy-new-seed-followup-opportunity-189-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_followup_opportunity_189.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256:
        raise ValueError('189 protected 188 raw differs')
    report=json.loads(raw)
    if report['schema']!=states.SCHEMA or len(report['results'])!=4 or \
            any(states.validate_result(x) for x in report['results']):
        raise ValueError('189 source state/choice differs')
    return report


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    actor=ctx['priority_actor'];owner=game['players'][actor];board_state=owner['board']
    base={'path_id':row['path_id'],
          'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if ctx['window_kind']!='turn_start' or game['phase']!='response_window' or \
            state['pending_triggers'] or state['activation_zone'] or \
            board_state['main'] is not None or board_state['world'] is not None or \
            board_state['prepared']:
        raise ValueError('189 current response boundary differs')
    if row['stop_reason_code']=='unproved_selected_board_ability_activation':
        decision=row['new_decisions'][0];action=decision['selected_action']
        instance=action['source_instance_id'];card_id=game['cards'][instance]['card_id']
        text=(ROOT/'72-companion-26-card-text-draft.md').read_text()
        section=text.split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if action['candidate_family']!='triggered_ability' or \
                action['action_type']!='activate_board_ability' or \
                instance not in board_state['companions'] or \
                identifiers.board_ability_response_id(instance,1)!=decision['selected_candidate'] or \
                not timing.matches(card_id,'turn_start',actor,ctx['turn_player'],'turn_start',actor) or \
                '自分のターン開始時に発動できる' not in section or \
                '山札上1枚を公開する' not in section or \
                decision['event_seq']!=row['last_valid_event_seq'] or \
                len(decision['legal_candidate_ids'])!=2 or \
                not owner['deck'] or ctx['chain_status']!='empty' or \
                ctx['chain_links'] or ctx['consecutive_passes']!=0:
            raise ValueError('189 selected on-board ability boundary incomplete')
        return {**base,'next_opportunity':'selected_board_ability_activation',
                'candidate_ids':[decision['selected_candidate']],
                'candidate_set_complete':True,'source_instance_id':instance,
                'source_reference':'72-companion-26-card-text-draft.md#'+card_id,
                'effect_resolution':'after_chain_closure',
                'public_top_card_preinspection':False}
    if row['stop_reason_code']!='unproved_next_priority_response_candidates' or \
            len(row['new_events'])!=1 or row['new_events'][0]['action_type']!='response_pass' or \
            ctx['consecutive_passes']!=1 or ctx['origin_event_seq']>=row['last_valid_event_seq']:
        raise ValueError('189 next response priority differs')
    projected=copy.deepcopy(state);removed=[];excluded=[]
    rows=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('189 missing hand candidate source')
        action=next((x for x in entry['actions'] if x['action_type'] in
                     ('use_play','use_item','use_event')),None)
        if action is None or owner['time']<action['base_time_cost']:
            continue
        exclusion=previous.conditional_exclusion(card_id,game,actor)
        if exclusion is not None:
            removed.append({'source_instance_id':instance,**exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in board_state['companions']:
        card_id=game['cards'][instance]['card_id']
        _,*fragments=timing.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(x not in section for x in fragments) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
            raise ValueError('189 companion next priority response not excluded')
        excluded.append({'source_instance_id':instance,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions']=[]
    partner=board_state['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if card_id not in board.PARTNER_TRIGGERS or \
                board.PARTNER_TRIGGERS[card_id] not in section or \
                row['new_events'][0]['action_type']!='response_pass':
            raise ValueError('189 partner next priority response not excluded')
        excluded.append({'source_instance_id':partner,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('189 next response candidate incomplete')
    return {**base,'next_opportunity':'response_window','candidate_ids':chance['legal_candidate_ids'],
            'candidate_set_complete':True,'board_exclusions':excluded,
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates']}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['189 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('189 current response audits differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('189 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('189: 3 unique next passes and 1 selected board ability activation')


if __name__=='__main__':main()
