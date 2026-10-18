#!/usr/bin/env python3
"""Audit one normal action, one response, and hold two provenance entries."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_ability_resolution_215 as states
import proxy_new_seed_normal_trigger_audit_146 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_new_seed_turn_end_audit_163 as partner
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='87fc9c11756d1101544b107784a9a304b27fd7a33f2bd8290c178546f0bd53a8'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-216-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_216.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('216 protected source raw/replay differs')
    data=json.loads(raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            any(states.validate_result(x) for x in data['results']):
        raise ValueError('216 saved source differs')
    return data


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];phase=game['phase']
    if start.opening._stop_state_sha256(game)!=row['final_game_state_sha256'] or \
            start.canonical_sha256(state)!=row['final_continuation_state_sha256']:
        raise ValueError('216 source state/hash differs')
    base={'path_id':row['path_id'], 'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']=='unproved_current_normal_action_candidates':
        if phase!='normal_action':raise ValueError('216 normal phase differs')
        proof=normal.audit_route(row)
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('216 normal candidates incomplete')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':copy.deepcopy(proof['candidate_ids']),
                'candidate_set_complete':True,
                'legal_candidate_details':copy.deepcopy(proof['legal_candidate_details']),
                'completeness_checks':copy.deepcopy(proof['completeness_checks']),
                'board_exclusions':copy.deepcopy(proof['board_response_exclusions'])}
    if row['stop_reason_code']=='unproved_current_turn_end_provenance':
        if phase!='turn_end' or state['return_target']!='turn_end':
            raise ValueError('216 end provenance boundary differs')
        return {**base,'next_opportunity':'turn_end_provenance',
                'candidate_ids':[],'candidate_set_complete':False}
    if row['stop_reason_code']!='unproved_next_priority_response_candidates' or \
            phase!='post_placement_response':
        raise ValueError('216 opportunity unclassified')
    ctx=state['response_context'];actor=ctx['priority_actor'];owner=game['players'][actor]
    if ctx['window_kind']!='after_normal_action' or ctx['consecutive_passes']!=1 or \
            ctx['chain_links'] or ctx['chain_status']!='empty' or \
            state['pending_triggers'] or state['activation_zone'] or \
            owner['board']['main'] is not None or owner['board']['world'] is not None or \
            owner['board']['prepared']:
        raise ValueError('216 second placement response boundary differs')
    projected=copy.deepcopy(state);removed=[];rows=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('216 missing hand registration')
        omission=hand.extra_hand_exclusion(card_id,entry,game,actor)
        if omission is None and card_id=='G-animal-shogi':
            section=hand.source_section('83-play-batch-3-card-text-draft.md',card_id)
            if '自分の捨て札のなかま1枚を対象' not in section or \
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('216 animal shogi target unclassified')
            omission={'card_id':card_id,'reason_code':'requires_own_discarded_companion',
                      'source_reference':'83-play-batch-3-card-text-draft.md#'+card_id}
        if omission is None:
            action=next((x for x in entry['actions'] if x['action_type'] in
                         ('use_play','use_item','use_event')),None)
            if action is not None and owner['time']>=action['base_time_cost']:
                omission=conditional.conditional_exclusion(card_id,game,actor)
        if omission:
            removed.append({'source_instance_id':instance,**omission})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    if owner['board']['companions']:
        raise ValueError('216 companion response unclassified')
    person=owner['board']['partner']
    if person is None or game['cards'][person]['card_id']!='P-anglerfish':
        raise ValueError('216 partner response source differs')
    section=hand.source_section('74-partner-18-card-text-draft.md','P-anglerfish')
    if partner.PARTNER_TRIGGERS['P-anglerfish'] not in section or \
            owner['board']['main'] is not None or owner['board']['world'] is not None:
        raise ValueError('216 partner trigger cannot be excluded')
    projected['game_state']['players'][actor]['board']['partner']=None
    projected['game_state']['players'][actor]['board']['partner_stage']=None
    projected['game_state']['phase']='response_window'
    projected['response_context']['window_kind']='turn_start'
    chance=start.enumerate_opportunity(projected,actor,rows)
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('216 response candidates not complete')
    return {**base,'next_opportunity':'response_window',
            'candidate_ids':['response-pass'],'candidate_set_complete':True,
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':[{'source_instance_id':person,'card_id':'P-anglerfish',
                                 'reason_code':'challenge_trigger_condition_not_met'}]}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['216 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sorted(x['next_opportunity'] for x in rows)!=[
            'normal_action','response_window','turn_end_provenance','turn_end_provenance'] or \
            any(validate_result(x) for x in rows):
        raise ValueError('216 mixed opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('216 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('216: one normal complete, one response pass, two held turn ends')


if __name__=='__main__':main()
