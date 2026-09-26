#!/usr/bin/env python3
"""Choose two mandatory exchanges, one paid comparison and one unique pass."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_270 as audits
import proxy_new_seed_mixed_replay_269 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_choice_audit_211 as normal

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '4122f073927991027253ab232d54d23bf56b609eeb37f34fca0b83edb9e15c9b'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-271-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_271.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, previous = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(previous).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            previous != states.canonical_bytes(states.build_report())):
        raise ValueError('271 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(previous)['results']
    if len(proofs) != len(rows) or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('271 source inventory differs')
    return rows, proofs


def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('271 choice boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        decision = egg.run_route(row)['new_decisions'][0]
        if (decision['resolution_mode'] != 'seeded_fallback' or
                decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('271 mandatory seeded choice differs')
        return {**base, 'selected_candidate': decision['selected_candidate'],
                'resolution_mode': decision['resolution_mode'], 'selected_decision': decision}
    if proof['next_opportunity'] == 'normal_action':
        result = normal.audit_route(row, proof)
        if (result['selected_candidate'] != 'pass' or result['resolution_mode'] != 'priority_unique' or
                len(result['comparison_evidence']['paid_actions']) != 2):
            raise ValueError('271 paid normal comparison differs')
        return {**base, 'selected_candidate': 'pass', 'resolution_mode': result['resolution_mode'],
                'comparison_evidence': result['comparison_evidence']}
    if proof['next_opportunity'] != 'response_window' or proof['candidate_ids'] != ['response-pass']:
        raise ValueError('271 chain response not unique')
    return {**base, 'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique',
            'comparison_evidence': {'reason': 'only_complete_legal_candidate'}}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['271 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('271 four choices differ')
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
            raise SystemExit('271 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('271: two seeded eggs, paid-action pass and unique chain pass')


if __name__ == '__main__':
    main()
