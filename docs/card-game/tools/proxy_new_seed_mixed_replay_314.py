#!/usr/bin/env python3
"""Replay two normal passes, proved end/draw and seeded egg exchange."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

# Numbered provenance modules import predecessors; preserve the full chain.
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_choice_313 as choices
import proxy_new_seed_mixed_audit_312 as audits
import proxy_new_seed_mixed_replay_311 as states
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_egg_replay_205 as egg
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'ad7e1bf5d85385403d0b86f94c197b55e985faa3742de1f1558582a8d9c4afb5'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-314-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_314.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('314 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('314 selected state boundary differs')
    path = row['path_id']
    if path in ('probe-01-a-first', 'probe-02-a-first'):
        if (selected['selected_candidate'] != 'pass' or
                selected['resolution_mode'] != 'priority_unique' or
                selected['candidate_ids'] != proof['candidate_ids'] or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                proof['next_opportunity'] != 'normal_action'):
            raise ValueError('314 normal selection differs')
        result = normal_pass.run_route(row, selected, proof)
        if (len(result['new_events']) != 1 or
                result['new_events'][0]['action_type'] != 'normal_pass_end_request' or
                result['final_continuation_state']['game_state']['phase'] != 'turn_end_response'):
            raise ValueError('314 normal pass transition differs')
        return result
    if path == 'probe-01-b-first':
        if (selected['selected_candidate'] != 'turn_end' or
                selected['resolution_mode'] != 'mandatory_proved_end' or
                proof['completeness_checks'] != selected['six_stage_checks']):
            raise ValueError('314 proved end choice differs')
        result = end.run_route(row, proof)
        if (len(result['new_events']) != 2 or
                [x['action_type'] for x in result['new_events']] !=
                ['turn_end_completed', 'turn_start_and_egg_draw']):
            raise ValueError('314 end/draw differs')
        return result
    if path == 'probe-02-b-first':
        if (selected['resolution_mode'] != 'seeded_fallback' or
                proof['next_opportunity'] != 'mandatory_egg_exchange' or
                not proof['candidate_set_complete'] or
                selected['candidate_ids'] != proof['candidate_ids']):
            raise ValueError('314 seeded egg choice differs')
        result = egg.run_route(row)
        decision = result['new_decisions'][0]
        if (decision != selected['selected_decision'] or
                decision['selected_candidate'] != selected['selected_candidate'] or
                len(result['new_events']) != 1 or
                result['new_events'][0]['action_type'] != 'egg_exchange_bottom'):
            raise ValueError('314 seeded egg replay differs')
        return result
    raise ValueError('314 unknown path')


def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if (result != run_route(source, choice, proof) or
                result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events'])):
            return ['314 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['314 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['314 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 5 or any(validate_result(x) for x in results):
        raise ValueError('314 four paths/five transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in results),
            'new_events': 5, 'new_snapshots': 5,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('314 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('314: two normal passes, proved end/draw and seeded egg exchange')


if __name__ == '__main__':
    main()
