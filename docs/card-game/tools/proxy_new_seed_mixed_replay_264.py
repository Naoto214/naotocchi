#!/usr/bin/env python3
"""Apply two normal passes, a free companion placement and an egg exchange."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_263 as choices
import proxy_new_seed_mixed_replay_262 as states
import proxy_new_seed_mixed_audit_261 as audits
import proxy_new_seed_followup_replay_245 as normal_replay
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '920ba3614654c8bdee7401834113cea60e672c7f42bee7039b8777bcad5daa54'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-264-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_264.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved, prior = SOURCE.read_bytes(), states.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != choices.AUDIT_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            saved != states.canonical_bytes(states.build_report()) or
            prior != audits.canonical_bytes(audits.build_report())):
        raise ValueError('264 protected choice/state/audit differs')
    selection, rows, proofs = (json.loads(x)['results'] for x in (raw, saved, prior))
    if len(selection) != len(rows) != len(proofs) != 4 or \
            any(choices.validate_result(x) for x in selection):
        raise ValueError('264 protected inventory differs')
    return selection, rows, proofs


def run_route(row, selection, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            selection['path_id'], selection['source_last_valid_event_seq'],
            selection['source_game_state_sha256'], selection['source_continuation_state_sha256']):
        raise ValueError('264 selected/state boundary differs')
    if proof['turn_end_set_complete']:
        result = egg_replay.run_route(row)
        if result['new_decisions'][0] != selection['selected_decision']:
            raise ValueError('264 seeded egg differs')
        return result
    translated = copy.deepcopy(selection)
    translated['selected_decision'] = (selection['comparison_evidence'].get('selected_decision')
                                       if selection['selected_candidate'] != 'pass' else None)
    if selection['selected_candidate'] == 'pass':
        evidence = selection['comparison_evidence']
        translated['paid_comparisons'] = (evidence['paid_comparisons'] if
                                          'paid_comparisons' in evidence else
                                          evidence['comparison_evidence']['paid_actions'])
    result = normal_replay.run_route(row, translated, proof)
    if result['new_decisions'][0]['selected_candidate'] != selection['selected_candidate']:
        raise ValueError('264 normal replay choice differs')
    return result


def validate_result(result):
    try:
        selected, rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        selection = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(row, selection, proof) or \
                result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['264 independent replay differs']
        event, snap = result['new_events'][0], result['new_snapshots'][0]
        if (event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != snap['game_state_sha256'] or
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or
                start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256'] or
                (snap['game_state_sha256'], snap['continuation_state_sha256']) != (
                    result['final_game_state_sha256'], result['final_continuation_state_sha256'])):
            return ['264 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration, IndexError) as error:
        return [str(error)]


def build_report():
    selected, rows, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id']))
              for row in rows]
    if len(result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('264 mixed replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('264 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('264: two normal passes, free companion, mandatory egg applied')


if __name__ == '__main__':
    main()
