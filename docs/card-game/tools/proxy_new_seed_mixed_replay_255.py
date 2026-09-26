#!/usr/bin/env python3
"""Apply four saved choices while preserving source state and provenance."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_254 as choices
import proxy_new_seed_mixed_audit_253 as audits
import proxy_new_seed_turn_end_replay_252 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_mixed_replay_224 as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '582a33588e3f506b842a5dd25dbc4587ce3992e38aade48a4e8887435e890d95'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-255-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_255.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes()
    audit_raw = audits.OUTPUT.read_bytes()
    state_raw = states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audit_raw).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(state_raw).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audit_raw != audits.canonical_bytes(audits.build_report()) or
            state_raw != states.canonical_bytes(states.build_report())):
        raise ValueError('255 protected choice/audit/state raw differs')
    selected = json.loads(raw)['results']
    inventory = json.loads(audit_raw)['results']
    source = json.loads(state_raw)['results']
    if (len(selected) != 4 or len(inventory) != 4 or len(source) != 4 or
            any(choices.validate_result(x) for x in selected)):
        raise ValueError('255 selected source integrity differs')
    return selected, inventory, source


def run_route(row, selection, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            selection['path_id'], selection['source_last_valid_event_seq'],
            selection['source_game_state_sha256'], selection['source_continuation_state_sha256']) or \
            selection['candidate_ids'] != proof['candidate_ids']:
        raise ValueError('255 chosen candidate/state boundary differs')
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        result = egg.run_route(row)
        if (result['new_decisions'][0] != selection['selected_decision'] or
                result['new_decisions'][0]['selected_candidate'] != selection['selected_candidate']):
            raise ValueError('255 egg seed selection differs')
        return result
    if (proof['next_opportunity'] != 'normal_action' or
            proof['stop_label_correction'] != 'phase_is_normal_action' or
            selection['selected_candidate'] != 'pass'):
        raise ValueError('255 normal pass proof differs')
    corrected = copy.deepcopy(row)
    corrected['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    return normal.run_route(corrected, selection, proof)


def validate_result(result):
    try:
        choices_saved, inventory, source = load_sources()
        row = next(x for x in source if x['path_id'] == result['path_id'])
        decision = next(x for x in choices_saved if x['path_id'] == result['path_id'])
        proof = next(x for x in inventory if x['path_id'] == result['path_id'])
        if (result != run_route(row, decision, proof) or
                result['last_valid_event_seq'] != row['last_valid_event_seq'] + len(result['new_events']) or
                len(result['new_events']) != 1 or len(result['new_snapshots']) != 1):
            return ['255 independent replay differs']
        before_game = row['final_game_state_sha256']
        before_state = row['final_continuation_state_sha256']
        for event, snap in zip(result['new_events'], result['new_snapshots']):
            if (event['game_state_before_sha256'] != before_game or
                    event['continuation_state_before_sha256'] != before_state or
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']):
                return ['255 event/snapshot/hash differs']
            before_game = event['game_state_after_sha256']
            before_state = event['continuation_state_after_sha256']
        return [] if (before_game, before_state) == (
            result['final_game_state_sha256'], result['final_continuation_state_sha256']) else [
                '255 final state/hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    selected, inventory, source = load_sources()
    results = [run_route(row,
                next(x for x in selected if x['path_id'] == row['path_id']),
                next(x for x in inventory if x['path_id'] == row['path_id']))
               for row in source]
    if (len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or
            any(validate_result(x) for x in results)):
        raise ValueError('255 four saved choices replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': 4, 'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('255 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('255: three egg exchanges and normal pass applied')


if __name__ == '__main__':
    main()
