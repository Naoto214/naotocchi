#!/usr/bin/env python3
"""Select one proved mandatory turn end and three unique response passes."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_audit_327 as audits
import proxy_new_seed_mixed_replay_326 as states

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'c7ed83985614f7b3b091ba24ff25fadc8d98acf126b0b461b8d0a3383729333d'
STATE_RAW_SHA256 = '568b209863a0e53119248575bc62604c171b7c9adafc0e14490e83af3fe2eeb1'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-328-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_328.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('328 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('328 source inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('328 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if path in ('probe-02-b-first',):
        if (proof['next_opportunity'] != 'turn_end' or not proof['turn_end_set_complete'] or
                proof['contract_stop_codes'] or not all(proof['completeness_checks'].values())):
            raise ValueError('328 end proof differs')
        return {**base, 'selected_candidate': 'turn_end',
                'resolution_mode': 'mandatory_proved_end',
                'six_stage_checks': proof['completeness_checks']}
    if (path not in ('probe-01-a-first', 'probe-01-b-first', 'probe-02-a-first') or
            proof['next_opportunity'] != ('turn_end_response' if path == 'probe-01-b-first' else 'response_window') or
            proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
        raise ValueError('328 response choice differs')
    return {**base, 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['328 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('328 four choices differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'state_raw_sha256': STATE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('328 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('328: one proved end and three response passes selected')


if __name__ == '__main__':
    main()
