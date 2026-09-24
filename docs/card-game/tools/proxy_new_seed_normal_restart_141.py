#!/usr/bin/env python3
"""Checkpoint 141: one proven R1 normal action from protected new-seed states."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_new_seed_normal_audit_140 as prior
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_action_extension as extension
import proxy_safe_placement_mixed_131 as mixed
import proxy_normal_action_seeded_restart as normal
import proxy_normal_decision_hardening as hardening
import proxy_start_response_138 as start


ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '8b3f70735771f6279948cd1cfea98a097532f2d31965b38635ca8e4ca0128618'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-restart-141-20260924.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_restart.v1'
CHICKEN_TEXT = ('72-companion-26-card-text-draft.md#C-chicken',
                'future_turn_start_optional_no_placement_effect')


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def source_sha():
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def load_source():
    if source_sha() != SOURCE_RAW_SHA256:
        raise ValueError('140 source raw SHA differs')
    result = json.loads(SOURCE.read_bytes())
    if canonical_bytes(prior.build_report()) != SOURCE.read_bytes() or result['schema'] != prior.SCHEMA:
        raise ValueError('140 independently regenerated report differs')
    for row in result['results']:
        verify_route(row)
    return result


def _original_rows():
    return {x['path_id']: x for x in start.load_source()['results']}


def _source_rows():
    return {x['path_id']: x for x in prior.load_source()['results']}


def verify_route(row):
    origin = _source_rows().get(row['path_id'])
    if origin is None or row['source_game_state_sha256'] != origin['final_game_state_sha256'] or \
            row['source_continuation_state_sha256'] != origin['final_continuation_state_sha256'] or \
            row['source_last_valid_event_seq'] != origin['last_valid_event_seq'] or \
            row['independent_balance_sample_count'] != 0 or row['new_events'] != 0:
        raise ValueError('140 route state/hash boundary differs')
    table = prior.candidate.load_inputs()['candidate_table']
    fresh = prior.audit_normal_action(origin, table) if origin['stop_phase'] == 'normal_action' else None
    if row['normal_action_candidate_audit'] != fresh:
        raise ValueError('140 independent normal candidate audit differs')


@contextmanager
def placement_text_scope():
    text = (ROOT / CHICKEN_TEXT[0].split('#')[0]).read_text()
    if '### C-chicken ' not in text or '自分のターン開始時に発動できる' not in text or \
            '後から登場して同じ開始へ遡らない' not in text:
        raise ValueError('C-chicken placement versus future start trigger differs')
    registry = extension.PLACEMENT_TEXT
    original = registry.get('C-chicken')
    if original is not None and original != CHICKEN_TEXT:
        raise ValueError('placement classification conflict')
    with mixed.placement_scope():
        try:
            registry['C-chicken'] = CHICKEN_TEXT
            yield
        finally:
            if original is None:
                registry.pop('C-chicken', None)
            else:
                registry['C-chicken'] = original


def _current(row):
    current = copy.deepcopy(row['final_continuation_state'])
    current.update({'source_event_seq':row['last_valid_event_seq'],
                    'last_event_seq':row['last_valid_event_seq'],
                    'source_game_state_sha256':row['final_game_state_sha256'],
                    'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(current) != current['continuation_state_sha256']:
        raise ValueError('138 source continuation hash differs')
    return current


def _scores(current, audit, table):
    game = current['game_state']; actor = game['turn_player']; owner = game['players'][actor]
    if game['round'] != 1 or game['phase'] != 'normal_action' or owner['time'] != 1 or \
            owner['person_placed'] or owner['board']['main'] or \
            any(p['growth'] >= 100 or p['reservations'] for p in game['players'].values()) or \
            current['pending_triggers'] or current['activation_zone']:
        raise ValueError('107/114 R1 safe comparison preconditions differ')
    placements = []; scores = {}; uncertainty = {}
    with placement_text_scope():
        for detail in audit['legal_candidate_details']:
            cid = detail['candidate_id']; action = detail['action_type']; cost = 0
            if action in ('place_companion', 'place_partner'):
                source = detail['source_instance_id']; card = game['cards'][source]
                placement = opening._placement_for_card(source, card, table, owner['board'])
                if placement is None or placement['candidate_id'] != cid or card['card_id'] not in extension.PLACEMENT_TEXT:
                    raise ValueError('116 placement source/safety unproved')
                placements.append(placement)
            elif action != 'pass':
                cost, effect = mixed._paid_cost(detail, game, owner, table)
                if effect is not None:
                    uncertainty[cid] = {'source_card_id':detail['card_id'], **effect,
                                        'certain_growth_difference':0}
            scores[cid] = {'candidate_id':cid, 'avoid_loss_or_abort':0,
                           'maintain_or_prevent_100':0, 'certain_growth_difference':0,
                           'time_after_certain_resolution':owner['time'] - cost,
                           'payment_time':cost, 'consumed_card_count':0,
                           'card_copy_id':detail.get('source_instance_id') or '',
                           'value_comparison_to':{}}
    if set(scores) != set(audit['legal_candidate_ids']) or 'pass' not in scores:
        raise ValueError('complete legal candidate scores differ')
    pairwise = {cid:hardening.compare_candidates(scores['pass'], score)
                for cid, score in scores.items() if cid != 'pass' and score['payment_time'] > 0}
    if any(value['winner'] != 'left' or value['decided_at'] != 'time_after_certain_resolution'
           for value in pairwise.values()):
        raise ValueError('107/114 paid comparison not proved')
    return placements, scores, uncertainty, pairwise


def choose(row, audit, table):
    current = _current(row)
    placements, scores, uncertainty, pairwise = _scores(current, audit, table)
    actor = current['game_state']['turn_player']; order = _original_rows()[row['path_id']]['order_id']
    if placements:
        context = {'contract_version':fallback.CONTRACT_VERSION,'order_id':order,
                   'actor':actor,'actor_turn_index':current['game_state']['round'],
                   'round':current['game_state']['round'],'phase':'normal_action',
                   'decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
        decision = fallback.resolve_safe_free_development(placements, context,
                                                         audit['legal_candidate_ids'])
        if 'error' in decision or (decision['resolution_mode'] == 'seeded_fallback' and
                                   fallback.validate_seeded_resolution(decision)):
            raise ValueError('116 safe placement and seed proof differs')
    else:
        if len(pairwise) != len(scores) - 1:
            raise ValueError('unclassified non-placement choice')
        decision = {'decision_kind':'normal_action','resolution_mode':'priority_unique',
                    'strategic_unresolved':False,'reason_code':'time_balance',
                    'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
                    'candidate_set_complete':True,'selected_candidate':'pass',
                    'runner_up_candidates':[x for x in audit['legal_candidate_ids'] if x != 'pass'],
                    'seed_context':None,'seed_proof':None}
    decision['selected_action'] = copy.deepcopy(next(x for x in audit['legal_candidate_details']
                                            if x['candidate_id'] == decision['selected_candidate']))
    decision['legal_candidate_details'] = copy.deepcopy(audit['legal_candidate_details'])
    decision['priority_basis'] = {'source_contracts':[107,114,116], 'scores':scores,
                                  'paid_vs_pass':pairwise,'conditional_uncertainty':uncertainty}
    decision['pre_game_state_sha256'] = row['final_game_state_sha256']
    decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
    decision['event_seq'] = row['last_valid_event_seq']
    return decision


def run_route(row, audited):
    verify_route(audited)
    if row['path_id'] != audited['path_id']:
        raise ValueError('138/140 route mapping differs')
    table = prior.candidate.load_inputs()['candidate_table']
    audit = audited['normal_action_candidate_audit']
    current = _current(row)
    decisions = []; events = []; snapshots = []
    reason = row['stop_reason_code']
    if audit is not None:
        if not audit['candidate_set_complete'] or not all(audit['completeness_checks'].values()):
            raise ValueError('140 incomplete current candidate audit')
        decision = choose(row, audit, table)
        if decision['selected_action']['action_type'] in ('place_companion','place_partner'):
            with placement_text_scope():
                after, generated = extension._apply_placement(current, decision)
        elif decision['selected_candidate'] == 'pass':
            after, generated = normal.transition(current, decision, {'candidate_table':table})
        else:
            raise ValueError('unsupported selected normal action')
        normal._verify_step(current, after, generated)
        decisions.append(decision)
        events = [{k:copy.deepcopy(v) for k,v in event.items() if k != '_snapshot_after'}
                  for event in generated]
        snapshots.append({'event_seq':after['last_event_seq'],
                          'game_state':copy.deepcopy(after['game_state']),
                          'game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
                          'continuation_state':start._payload(after),
                          'continuation_state_sha256':after['continuation_state_sha256']})
        reason = 'unproved_next_response_candidates'
        current = after
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':current['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(current['game_state']),
            'final_continuation_state_sha256':current['continuation_state_sha256'],
            'final_continuation_state':start._payload(current),
            'stop_reason_code':reason,'new_decisions':decisions,'new_events':events,
            'new_snapshots':snapshots,'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        source = load_source()
        index = [x['path_id'] for x in source['results']].index(result['path_id'])
        expected = run_route(prior.load_source()['results'][index], source['results'][index])
        if canonical_bytes(expected) != canonical_bytes(result):
            return ['141 route independent replay differs']
        last_game = result['source_game_state_sha256']
        last_cont = result['source_continuation_state_sha256']
        for offset,(event,snapshot) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq'] != result['source_last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != last_game or \
                    event['continuation_state_before_sha256'] != last_cont or \
                    event['game_state_after_sha256'] != snapshot['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snapshot['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snapshot['game_state']) != snapshot['game_state_sha256'] or \
                    start.canonical_sha256(snapshot['continuation_state']) != snapshot['continuation_state_sha256']:
                return ['141 event/snapshot state hash chain differs']
            last_game, last_cont = event['game_state_after_sha256'], event['continuation_state_after_sha256']
        return []
    except (ValueError,KeyError,TypeError) as error:
        return [str(error)]


def build_report():
    source = load_source(); rows = prior.load_source()['results']
    results = [run_route(row, audited) for row,audited in zip(rows,source['results'])]
    if any(validate_result(row) for row in results):
        raise ValueError('141 independent replay or hash differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':len(results),'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in results),
            'new_events':sum(len(x['new_events']) for x in results),
            'new_snapshots':sum(len(x['new_snapshots']) for x in results),
            'independent_balance_sample_count':0,'results':results}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('141 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('141: 4 planned, 3 new normal actions, 0 completed')


if __name__=='__main__':main()
