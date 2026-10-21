#!/usr/bin/env python3
"""Compare one paid normal opportunity and select three unique responses."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_246 as audits
import proxy_new_seed_followup_replay_245 as states
import proxy_new_seed_normal_choice_229 as precedent

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '40b53d44ab0f18f8921bf6bc5e8b25f948d2bfe37247f18202f143aaf8cefe37'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-choice-247-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_choice_247.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('247 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('247 source inventory differs')
    return proofs, rows


def audit_route(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            proof['candidate_set_complete'] is not True):
        raise ValueError('247 source boundary differs')
    base = {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] in ('turn_end_response', 'post_placement_response'):
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('247 response not unique')
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'paid_comparisons': []}
    if proof['next_opportunity'] != 'normal_action':
        raise ValueError('247 opportunity unclassified')
    selected = precedent.audit_route(row, proof)
    if (proof['candidate_ids'] != ['candidate-place_world-A-020#1',
                                   'candidate-set_item-A-034#1', 'pass'] or
            selected['selected_candidate'] != 'pass' or
            selected['resolution_mode'] != 'priority_unique' or
            len(selected['paid_comparisons']) != 2):
        raise ValueError('247 paid comparisons differ')
    return selected


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, proof) else ['247 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    results = [audit_route(row, next(x for x in proofs if x['path_id'] == row['path_id']))
               for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('247 four choices differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('247 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('247: one normal pass, three unique responses selected')


if __name__ == '__main__':
    main()
