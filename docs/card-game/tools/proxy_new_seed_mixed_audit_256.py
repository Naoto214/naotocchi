#!/usr/bin/env python3
"""Audit three turn start responses and one turn end response."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_255 as states
import proxy_new_seed_turn_end_replay_252 as before
import proxy_new_seed_start_audit_206 as starts
import proxy_new_seed_followup_audit_213 as end
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'e2f4c7165639db9f815563300d11a9e5c127f0e4f1956ea46fc5cfb8b6411494'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-256-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_256.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes()
    old = before.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(old).hexdigest() != states.choices.audits.SOURCE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            old != before.canonical_bytes(before.build_report())):
        raise ValueError('256 saved source raw/canonical differs')
    rows, previous = json.loads(raw)['results'], json.loads(old)['results']
    if len(rows) != 4 or len(previous) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('256 source state integrity differs')
    return rows, previous


def audit_route(row, old):
    state = row['final_continuation_state']
    game = state['game_state']
    if (old['path_id'] != row['path_id'] or
            start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('256 current state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'turn_end_response':
        if row['path_id'] != 'probe-02-b-first' or row['new_events'][0]['action_type'] != 'normal_pass_end_request':
            raise ValueError('256 end response boundary differs')
        proof = end.audit_route(row)
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('256 end response incomplete')
        return {**base, 'next_opportunity': 'turn_end_response',
                **{key: proof[key] for key in ('candidate_ids', 'candidate_set_complete',
                    'hand_conditional_exclusions', 'hand_other_exclusions', 'board_exclusions')}}
    if game['phase'] != 'response_window' or row['new_events'][0]['action_type'] != 'egg_exchange_bottom':
        raise ValueError('256 start response boundary differs')
    working = copy.deepcopy(row)
    actor = game['turn_player']
    owner = game['players'][actor]
    entries = start.load_candidate_rows()
    extra = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        actions = entries[card_id]['actions']
        reason = None
        if len(actions) > 1 and any(action['action_type'] == 'place_companion' for action in actions):
            section = starts.source_section('72-companion-26-card-text-draft.md', card_id)
            if (not any(action['action_type'] == 'activate_companion_ability' and
                    action['prerequisites'].startswith('on companion board;') for action in actions) or
                    instance in owner['board']['companions'] or '捨て札' not in section):
                raise ValueError('256 companion hand source zone differs')
            reason = 'board_only_ability_source_in_hand'
            reference = '72-companion-26-card-text-draft.md#' + card_id
        elif (owner['board']['main'] is None and len(actions) == 1 and
              actions[0]['target_rule'] == 'one own main' and
              'own main exists' in actions[0]['prerequisites']):
            reference = actions[0]['source_text_reference']
            filename, section_id = reference.split('#', 1)
            section = starts.source_section(filename, card_id)
            if section_id != card_id or not any(fragment in section for fragment in
                    ('自分のメイン1枚を対象', 'メインにみにつける')):
                raise ValueError('256 own-main target text differs')
            reason = 'requires_own_main_target'
        if reason:
            extra.append({'source_instance_id': instance, 'card_id': card_id,
                          'reason_code': reason, 'source_reference': reference})
            working['final_continuation_state']['game_state']['players'][actor]['hand'].remove(instance)
    proof = starts.audit_route(working, old)
    expected = (['response-activate-ability-A-015#1', 'response-pass'] if
                row['path_id'] == 'probe-01-a-first' else ['response-pass'])
    if not proof['candidate_set_complete'] or proof['candidate_ids'] != expected:
        raise ValueError('256 start response candidate completeness differs')
    return {**base, 'next_opportunity': 'turn_start_response',
            'candidate_ids': proof['candidate_ids'], 'candidate_set_complete': True,
            'hand_candidate_ids': proof['hand_candidate_ids'],
            'hand_conditional_exclusions': extra + proof['hand_conditional_exclusions'],
            'hand_other_exclusions': proof['hand_other_exclusions'],
            'board_candidate_details': proof['board_candidate_details'],
            'board_exclusions': proof['board_exclusions']}


def validate_result(result):
    try:
        rows, old = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        previous = next(x for x in old if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, previous) else ['256 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration, IndexError) as error:
        return [str(error)]


def build_report():
    rows, previous = load_sources()
    result = [audit_route(row, next(x for x in previous if x['path_id'] == row['path_id']))
              for row in rows]
    if len(result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('256 response opportunities differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('256 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('256: one start ability/pass and three unique passes')


if __name__ == '__main__':
    main()
