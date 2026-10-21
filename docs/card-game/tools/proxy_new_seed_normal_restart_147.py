#!/usr/bin/env python3
"""Resume proved normal decisions without extending the card rules."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_trigger_audit_146 as audit
import proxy_new_seed_response_restart_145 as prior
import proxy_new_seed_normal_restart_141 as precedent
import proxy_start_response_138 as start
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_extension as extension
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as hardening


ROOT = Path(__file__).resolve().parents[1]
SOURCE = audit.OUTPUT
SOURCE_RAW_SHA256 = 'd21dff526e1c699ee8fb3ccb2717355421c8a0d2bdccc78e37ba42d6869213da'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-restart-147-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_restart.v1'
PARTNERS = {
    'P-cliff_goat': ('自分が名前の異なるセカイへ変更した時', 'future_world_change_only'),
    'P-anglerfish': ('自分のメインが自分からちょうせんする時', 'future_challenge_only'),
}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != audit.canonical_bytes(audit.build_report()):
        raise ValueError('146 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != audit.SCHEMA or any(audit.validate_result(row) for row in report['results']):
        raise ValueError('146 current candidate audit differs')
    return report


@lru_cache(maxsize=1)
def source_states():
    raw = prior.OUTPUT.read_bytes()
    if raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('145 protected independent replay differs')
    report = json.loads(raw)
    if any(prior.validate_result(row) for row in report['results']):
        raise ValueError('145 protected state/event chain differs')
    return report


@contextmanager
def partner_placement_scope():
    registry = extension.PLACEMENT_TEXT
    old = {card_id: registry.get(card_id) for card_id in PARTNERS}
    with precedent.placement_text_scope():
        try:
            body = (ROOT / '74-partner-18-card-text-draft.md').read_text()
            for card_id, (condition, classification) in PARTNERS.items():
                section = body.split(f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
                if condition not in section or '発動できる' not in section:
                    raise ValueError('future partner trigger placement text differs')
                evidence = (f'74-partner-18-card-text-draft.md#{card_id}', classification)
                if old[card_id] is not None and old[card_id] != evidence:
                    raise ValueError('partner placement classification conflicts')
                registry[card_id] = evidence
            yield
        finally:
            for card_id, entry in old.items():
                if entry is None: registry.pop(card_id, None)
                else: registry[card_id] = entry


def state_from(row):
    current = copy.deepcopy(row['final_continuation_state'])
    current.update({'source_event_seq': row['last_valid_event_seq'],
                    'last_event_seq': row['last_valid_event_seq'],
                    'source_game_state_sha256': row['final_game_state_sha256'],
                    'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(current) != current['continuation_state_sha256']:
        raise ValueError('145 continuation source hash differs')
    return current


def choose(row, proof):
    game = row['final_continuation_state']['game_state']; actor = game['turn_player']
    owner = game['players'][actor]; ids = proof['candidate_ids']
    details = proof['legal_candidate_details']
    table = audit.normal.candidate.load_inputs()['candidate_table']
    if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()) or \
            game['phase'] != 'normal_action' or owner['board']['main'] is not None or \
            any(p['growth'] >= 100 for p in game['players'].values()):
        raise ValueError('107/114 current decision entry differs')
    if ids == ['pass']:
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'only_legal_normal_action', 'strategic_unresolved': False,
                    'legal_candidates': ids, 'candidate_set_complete': True,
                    'selected_candidate': 'pass', 'runner_up_candidates': [],
                    'seed_context': None, 'seed_proof': None}
    elif len(ids) == 2 and 'pass' in ids:
        paid = next(x for x in details if x['candidate_id'] != 'pass')
        if paid['action_type'] != 'play_main' or paid['candidate_variant'] != 'birth' or \
                normal.BIRTH_TEXT_EVIDENCE.get(paid['card_id'], (None,))[0] != 'continuous_only':
            raise ValueError('paid birth has unproved immediate effect')
        source = paid['source_instance_id']
        birth = precedent.opening._main_birth_detail(source, game['cards'][source], table,
                                                       owner['board'], owner['time'])
        if birth is None or birth['candidate_id'] != paid['candidate_id']:
            raise ValueError('birth paid action differs')
        scores = {}
        for detail in details:
            cost = birth['payment_time'] if detail['candidate_id'] != 'pass' else 0
            scores[detail['candidate_id']] = {'candidate_id': detail['candidate_id'],
                'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
                'certain_growth_difference': 0, 'time_after_certain_resolution': owner['time'] - cost,
                'payment_time': cost, 'consumed_card_count': 0,
                'card_copy_id': detail.get('source_instance_id') or '', 'value_comparison_to': {}}
        comparison = hardening.compare_candidates(scores['pass'], scores[paid['candidate_id']])
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('paid birth versus pass is not decided by 107/114 time')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': ids, 'candidate_set_complete': True,
                    'selected_candidate': 'pass', 'runner_up_candidates': [paid['candidate_id']],
                    'seed_context': None, 'seed_proof': None,
                    'priority_basis': {'source_contracts': [107, 114], 'scores': scores,
                                       'paid_vs_pass': comparison}}
    else:
        if set(x['action_type'] for x in details) != {'pass', 'place_partner'} or \
                owner['person_placed'] or owner['time'] != 0 or len(ids) != 4:
            raise ValueError('unproved free person placement comparison')
        placements = []
        with partner_placement_scope():
            for detail in details:
                if detail['action_type'] == 'pass': continue
                source = detail['source_instance_id']; card = game['cards'][source]
                placement = precedent.opening._placement_for_card(source, card, table, owner['board'])
                if placement is None or placement['candidate_id'] != detail['candidate_id'] or \
                        card['card_id'] not in extension.PLACEMENT_TEXT:
                    raise ValueError('116 safe partner placement differs')
                placements.append(placement)
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
                   'actor': actor, 'actor_turn_index': game['round'], 'round': game['round'],
                   'phase': 'normal_action', 'decision_kind': 'normal_action',
                   'choice_kind': 'zero_cost_person_placement'}
        decision = fallback.resolve_safe_free_development(placements, context, ids)
        if 'error' in decision or fallback.validate_seeded_resolution(decision):
            raise ValueError('116 three safe partner placements proof differs')
    decision['selected_action'] = copy.deepcopy(next(x for x in details
                                         if x['candidate_id'] == decision['selected_candidate']))
    decision['legal_candidate_details'] = copy.deepcopy(details)
    decision['pre_game_state_sha256'] = row['final_game_state_sha256']
    decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
    decision['event_seq'] = row['last_valid_event_seq']
    return decision


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(row, proof):
    if row['path_id'] != proof['path_id'] or row['final_game_state_sha256'] != \
            proof['source_game_state_sha256'] or row['final_continuation_state_sha256'] != \
            proof['source_continuation_state_sha256'] or row['last_valid_event_seq'] != \
            proof['source_last_valid_event_seq']:
        raise ValueError('146/145 source boundary differs')
    state = state_from(row); decisions = []; events = []; snapshots = []
    if proof['candidate_set_complete']:
        decision = choose(row, proof)
        if decision['selected_candidate'] == 'pass':
            after, generated = normal.transition(state, decision, {'candidate_table':
                                              audit.normal.candidate.load_inputs()['candidate_table']})
        else:
            with partner_placement_scope():
                after, generated = extension._apply_placement(state, decision)
        normal._verify_step(state, after, generated)
        decisions.append(decision)
        events = [{k: copy.deepcopy(v) for k, v in event.items() if k != '_snapshot_after'}
                  for event in generated]
        state = after; snapshots.append(snapshot(after))
        reason = 'unproved_next_response_candidates'
    else:
        if proof['missing_contract'] != 'turn_end_provenance':
            raise ValueError('unclassified 146 incomplete opportunity')
        reason = row['stop_reason_code']
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        source = source_states()['results']; proofs = load_source()['results']
        index = next(i for i, x in enumerate(source) if x['path_id'] == result['path_id'])
        original = source[index]
        if result != run_route(original, proofs[index]) or result['last_valid_event_seq'] != \
                original['last_valid_event_seq'] + len(result['new_events']):
            return ['147 independent replay differs']
        game = original['final_game_state_sha256']; cont = original['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != original['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['147 event/snapshot hash chain differs']
            game, cont = event['game_state_after_sha256'], event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['147 final state hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x, proof) for x, proof in zip(source_states()['results'], load_source()['results'])]
    if any(validate_result(x) for x in rows): raise ValueError('147 replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in rows),
            'new_events': sum(len(x['new_events']) for x in rows),
            'new_snapshots': sum(len(x['new_snapshots']) for x in rows),
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('147 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('147: 3 normal decisions, 3 events, 0 completed')


if __name__ == '__main__': main()
