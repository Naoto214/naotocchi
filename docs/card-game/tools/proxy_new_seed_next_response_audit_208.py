#!/usr/bin/env python3
"""Audit three next priority passes and one selected board ability."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_choice_207 as states
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_followup_opportunity_189 as ability
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as partner
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='bd373e7c1d01e1c2aa701c9d8942ee451c20839aa6c1d6237ffac1e6026ffdd8'
OUTPUT=ROOT/'data/proxy-new-seed-next-response-audit-208-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_next_response_audit_208.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('208 protected 207 raw/replay differs')
    source=json.loads(raw)
    if source['schema']!=states.SCHEMA or len(source['results'])!=4 or \
            any(states.validate_result(x) for x in source['results']):
        raise ValueError('208 source state/decision differs')
    return source


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    actor=ctx['priority_actor'];owner=game['players'][actor];on_board=owner['board']
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if ctx['window_kind']!='turn_start' or game['phase']!='response_window' or \
            state['pending_triggers'] or state['activation_zone'] or \
            on_board['main'] is not None or on_board['world'] is not None or on_board['prepared']:
        raise ValueError('208 next response boundary differs')
    if row['stop_reason_code']=='unproved_selected_board_ability_activation':
        prior=ability.audit_route(row)
        if prior['next_opportunity']!='selected_board_ability_activation' or \
                prior['public_top_card_preinspection']:
            raise ValueError('208 selected board ability proof differs')
        return {**base,'next_opportunity':prior['next_opportunity'],
                'candidate_ids':prior['candidate_ids'],
                'candidate_set_complete':True,
                'source_instance_id':prior['source_instance_id'],
                'effect_resolution':'after_chain_closure',
                'public_top_card_preinspection':False}
    if row['stop_reason_code']!='unproved_next_priority_response_candidates' or \
            len(row['new_events'])!=1 or row['new_events'][0]['action_type']!='response_pass' or \
            ctx['consecutive_passes']!=1 or ctx['origin_event_seq']>=row['last_valid_event_seq']:
        raise ValueError('208 next response priority differs')
    projected=copy.deepcopy(state);removed=[];excluded=[];rows=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('208 missing hand candidate registration')
        omission=hand.extra_hand_exclusion(card_id,entry,game,actor)
        if omission is None and card_id=='G-animal-shogi':
            text=hand.source_section('83-play-batch-3-card-text-draft.md',card_id)
            if '自分の捨て札のなかま1枚を対象' not in text or \
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('208 animal shogi target requires separate proof')
            omission={'card_id':card_id,'reason_code':'requires_own_discarded_companion',
                      'source_reference':'83-play-batch-3-card-text-draft.md#'+card_id}
        if omission is None:
            action=next((a for a in entry['actions'] if a['action_type'] in
                         ('use_play','use_item','use_event')),None)
            if action is not None and owner['time']>=action['base_time_cost']:
                omission=conditional.conditional_exclusion(card_id,game,actor)
        if omission:
            removed.append({'source_instance_id':instance,**omission})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in on_board['companions']:
        card_id=game['cards'][instance]['card_id']
        section=hand.source_section('72-companion-26-card-text-draft.md',card_id)
        if card_id not in timing.TRIGGERS or \
                any(fragment not in section for fragment in timing.TRIGGERS[card_id][1:]) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
            raise ValueError('208 next priority board ability not excluded')
        excluded.append({'source_instance_id':instance,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions']=[]
    person=on_board['partner']
    if person is not None:
        card_id=game['cards'][person]['card_id']
        section=hand.source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id not in partner.PARTNER_TRIGGERS or \
                partner.PARTNER_TRIGGERS[card_id] not in section:
            raise ValueError('208 partner next priority timing unclassified')
        excluded.append({'source_instance_id':person,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('208 next priority pass not unique')
    return {**base,'next_opportunity':'response_window',
            'candidate_ids':chance['legal_candidate_ids'],
            'candidate_set_complete':True,'board_exclusions':excluded,
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates']}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['208 independent next audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('208 next priorities or ability proof differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('208 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('208: three unique next passes, one board ability activation boundary')


if __name__=='__main__':main()
