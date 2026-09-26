#!/usr/bin/env python3
"""Replay one normal pass and three response passes at the proven boundary."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_choice_247 as choices
import proxy_new_seed_followup_audit_246 as audits
import proxy_new_seed_followup_replay_245 as states
import proxy_new_seed_followup_replay_214 as response
import proxy_new_seed_normal_replay_230 as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '1380d211b4828ab033d3a10dcd55bf834ea15b87c9a55d5b2e0688518703f052'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-replay-248-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_replay_248.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, inventory, saved = SOURCE.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(inventory).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            inventory != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('248 protected choice/audit/state differs')
    proofs = json.loads(raw)['results']
    audited = json.loads(inventory)['results']
    rows = json.loads(saved)['results']
    if (len(proofs) != 4 or len(audited) != 4 or len(rows) != 4 or
            any(choices.validate_result(x) for x in proofs)):
        raise ValueError('248 four source opportunities differ')
    return proofs, audited, rows


def run_route(row, proof, audit):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            proof['candidate_ids'] != audit['candidate_ids']):
        raise ValueError('248 source state/choice boundary differs')
    if proof['selected_candidate'] == 'pass':
        if audit['next_opportunity'] != 'normal_action' or proof['resolution_mode'] != 'priority_unique':
            raise ValueError('248 normal pass not proved')
        result = normal.run_route(row, proof, audit)
        if result['new_events'][0]['action_type'] != 'normal_pass_end_request':
            raise ValueError('248 normal pass event differs')
    else:
        if (proof['selected_candidate'] != 'response-pass' or
                audit['next_opportunity'] not in ('turn_end_response', 'post_placement_response') or
                audit['candidate_ids'] != ['response-pass']):
            raise ValueError('248 response pass not unique')
        result = response.run_route(row, audit)
        if result['new_events'][0]['action_type'] != 'response_pass':
            raise ValueError('248 response event differs')
    if result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
        raise ValueError('248 one event boundary differs')
    return result


def validate_result(result):
    try:
        proofs, audited, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        audit = next(x for x in audited if x['path_id'] == result['path_id'])
        if result != run_route(row, proof, audit):
            return ['248 independent replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != row['last_valid_event_seq'] + 1 or
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != result['final_game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != result['final_continuation_state_sha256']):
            return ['248 event/snapshot/hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, audited, rows = load_sources()
    results = [run_route(row, next(x for x in proofs if x['path_id'] == row['path_id']),
                         next(x for x in audited if x['path_id'] == row['path_id']))
               for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('248 four replays differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('248 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('248: four selected passes replayed')


if __name__ == '__main__':
    main()
