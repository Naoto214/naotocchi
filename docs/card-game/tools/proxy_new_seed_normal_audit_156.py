#!/usr/bin/env python3
"""Audit four current normal actions, including board partner response timing."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_chain_resolution_155 as prior
import proxy_new_seed_response_restart_148 as held
import proxy_new_seed_normal_trigger_audit_146 as normal_audit
import proxy_new_seed_normal_restart_147 as placement
import proxy_board_response_134 as board_response

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'ad284fa608b04c8834894d232e9740930a8a8889d469366f980ef89dd7f9a2e9'
HELD_RAW_SHA256 = '09f5dbbfad0329e35a9ee0b3bd64695c4b5f5ad2520cd8c9cda913faa6635d16'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-audit-156-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_audit_156.v1'
PARTNER_ABILITY = {'kind': 'response_triggered',
    'source_text_reference': '74-partner-18-card-text-draft.md#P-anglerfish',
    'placement_action': 'place_partner', 'placement_growth_delta': 0,
    'placement_duration': 'none', 'response_candidate_family': 'triggered_ability',
    'response_timing': 'own_challenge_in_deepsea', 'independent_normal_action': False}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('155 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('155 source hash chain differs')
    historic = held.OUTPUT.read_bytes()
    if hashlib.sha256(historic).hexdigest() != HELD_RAW_SHA256 or \
            historic != held.canonical_bytes(held.build_report()):
        raise ValueError('148 held 02-A raw or replay differs')
    held_rows = json.loads(historic)['results']
    if any(held.validate_result(x) for x in held_rows):
        raise ValueError('148 held source hash chain differs')
    result = list(data['results'])
    retained = next(x for x in held_rows if x['path_id'] == 'probe-02-a-first')
    if any(x['path_id'] == retained['path_id'] for x in result):
        raise ValueError('156 held path duplicated')
    result.append(retained)
    return result


@contextmanager
def partner_response_scope(table):
    registry = board_response.RESPONSE_BOARD
    old_ability = registry.get('P-anglerfish')
    old_classify = board_response.classify_response_triggered
    old_unit = board_response._response_unit
    text = (ROOT / '74-partner-18-card-text-draft.md').read_text()
    section = text.split('### P-anglerfish — ', 1)[1].split('\n### ', 1)[0]
    if not all(fragment in section for fragment in ('1ターンに1回',
            '自分のメインが自分からちょうせんする時', '自分のセカイが「しんかい」である場合',
            '発動できる')):
        raise ValueError('156 partner trigger text differs')
    row = next(x for x in table['cards'] if x['card_id'] == 'P-anglerfish')
    if row['card_type'] != 'partner' or [(x['action_type'], x['timing']) for x in row['actions']] != \
            [('place_partner','normal_action_opportunity')] or \
            '条件を満たす能力' not in (ROOT / '06-action-chain-checkpoint.md').read_text() or \
            'triggered_ability' not in (ROOT / '119-response-window-contract.md').read_text():
        raise ValueError('156 partner response family contract differs')
    if old_ability is not None and old_ability != PARTNER_ABILITY:
        raise ValueError('156 partner registry conflicts')
    def classify(card_id, candidate_table):
        if card_id == 'P-anglerfish':
            if candidate_table != table: raise ValueError('156 partner candidate table differs')
            return copy.deepcopy(PARTNER_ABILITY)
        return old_classify(card_id, candidate_table)
    def response_unit(view, original):
        card_id = original['card_id']
        if card_id != 'P-anglerfish': return old_unit(view, original)
        template = original['template']
        expected = {'timing': 'response_window', 'source_text_reference':
                    registry[card_id]['source_text_reference']}
        if template != expected or original['source_instance_id'] != \
                view['players'][view['actor']]['board']['partner']:
            raise ValueError('156 board partner response source differs')
        unit = {key: copy.deepcopy(value) for key, value in original.items() if key != 'template'}
        unit.update({'reason_codes': ['timing_not_normal_action'],
                     'disposition': 'excluded', 'candidate_id': None,
                     'evidence': {'phase': view['phase'], 'template.timing': template['timing']},
                     'source_references': [template['source_text_reference'],
                                           '06-action-chain-checkpoint.md']})
        return unit
    registry['P-anglerfish'] = copy.deepcopy(PARTNER_ABILITY)
    board_response.classify_response_triggered = classify
    board_response._response_unit = response_unit
    try:
        with placement.partner_placement_scope():
            yield
    finally:
        board_response._response_unit = old_unit
        board_response.classify_response_triggered = old_classify
        if old_ability is None: registry.pop('P-anglerfish', None)
        else: registry['P-anglerfish'] = old_ability


def audit_route(row):
    table = normal_audit.normal.candidate.load_inputs()['candidate_table']
    with partner_response_scope(table):
        result = normal_audit.audit_route(row)
    if not result['candidate_set_complete'] or not all(result['completeness_checks'].values()):
        raise ValueError('156 current normal candidate set incomplete')
    return result


def validate_result(row):
    try:
        source = next(x for x in load_sources() if x['path_id'] == row['path_id'])
        return [] if row == audit_route(source) else ['156 independent normal audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [audit_route(x) for x in load_sources()]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('156 current normal candidates differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'held_148_raw_sha256': HELD_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('156 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('156: 4 complete normal candidate audits, 0 events')


if __name__ == '__main__': main()
