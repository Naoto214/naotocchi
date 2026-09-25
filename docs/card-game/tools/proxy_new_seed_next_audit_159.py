#!/usr/bin/env python3
"""Audit current normal actions and held turn end after response closure."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_response_restart_158 as prior
import proxy_new_seed_normal_audit_156 as normal
import proxy_board_response_134 as board_response

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '57e2daa5f2f8f3f25e4f90ec989684c9f780bbd85973893d18a8151e3cb8b842'
OUTPUT = ROOT / 'data/proxy-new-seed-next-audit-159-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_next_audit_159.v1'
CLIFF = {**normal.PARTNER_ABILITY,
         'source_text_reference':'74-partner-18-card-text-draft.md#P-cliff_goat',
         'response_timing':'different_world_change'}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('158 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('158 protected state/hash chain differs')
    return data


@contextmanager
def cliff_response_scope(table):
    registry=board_response.RESPONSE_BOARD
    old=registry.get('P-cliff_goat')
    classify_original=board_response.classify_response_triggered
    unit_original=board_response._response_unit
    section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
        '### P-cliff_goat — ',1)[1].split('\n### ',1)[0]
    if not all(fragment in section for fragment in ('1ターンに1回',
            '自分が名前の異なるセカイへ変更した時','発動できる')):
        raise ValueError('159 cliff goat source text differs')
    card=next(x for x in table['cards'] if x['card_id']=='P-cliff_goat')
    if card['card_type']!='partner' or [(x['action_type'],x['timing']) for x in card['actions']]!=[
            ('place_partner','normal_action_opportunity')] or \
            '条件を満たす能力' not in (ROOT/'06-action-chain-checkpoint.md').read_text() or \
            'triggered_ability' not in (ROOT/'119-response-window-contract.md').read_text():
        raise ValueError('159 partner response contract differs')
    if old is not None and old!=CLIFF:raise ValueError('159 partner classification conflicts')
    def classify(card_id,candidate_table):
        if card_id=='P-cliff_goat':
            if candidate_table!=table:raise ValueError('159 candidate table differs')
            return copy.deepcopy(CLIFF)
        return classify_original(card_id,candidate_table)
    def response_unit(view,source):
        if source['card_id']!='P-cliff_goat':return unit_original(view,source)
        template=source['template'];instance=source['source_instance_id']
        if template!={'timing':'response_window','source_text_reference':CLIFF['source_text_reference']} or \
                instance!=view['players'][view['actor']]['board']['partner']:
            raise ValueError('159 partner board source differs')
        unit={k:copy.deepcopy(v) for k,v in source.items() if k!='template'}
        unit.update({'reason_codes':['timing_not_normal_action'],'disposition':'excluded',
                     'candidate_id':None,'evidence':{'phase':view['phase'],
                     'template.timing':template['timing']},
                     'source_references':[template['source_text_reference'],
                                          '06-action-chain-checkpoint.md']})
        return unit
    registry['P-cliff_goat']=copy.deepcopy(CLIFF)
    board_response.classify_response_triggered=classify
    board_response._response_unit=response_unit
    try:yield
    finally:
        board_response._response_unit=unit_original
        board_response.classify_response_triggered=classify_original
        if old is None:registry.pop('P-cliff_goat',None)
        else:registry['P-cliff_goat']=old


def audit_route(row):
    game=row['final_continuation_state']['game_state']
    if game['phase']=='turn_end':
        if row['stop_reason_code']!='unproved_current_turn_end_provenance':
            raise ValueError('159 unclassified turn-end state')
        return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
                'source_game_state_sha256':row['final_game_state_sha256'],
                'source_continuation_state_sha256':row['final_continuation_state_sha256'],
                'next_opportunity':'turn_end','candidate_set_complete':False,
                'candidate_ids':[],'new_events':0}
    table=normal.normal_audit.normal.candidate.load_inputs()['candidate_table']
    with cliff_response_scope(table):
        result=normal.audit_route(row)
    if not result['candidate_set_complete'] or not all(result['completeness_checks'].values()):
        raise ValueError('159 current normal candidates incomplete')
    return {**result,'next_opportunity':'normal_action'}


def validate_result(result):
    try:
        original=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(original) else ['159 independent current audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('159 current opportunity replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('159 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('159: 3 complete normal audits, 1 held turn-end, 0 events')


if __name__=='__main__':main()
