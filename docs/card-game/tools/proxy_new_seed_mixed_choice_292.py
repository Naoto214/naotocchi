#!/usr/bin/env python3
"""Select the two unique responses and two proved ends at 291."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_291 as audits
import proxy_new_seed_mixed_replay_290 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-292-20260927.json'
SOURCE_RAW_SHA256 = '7dbf147d7e94391546f7ff1d9fcb791f2331e70d766050393e342c004b52c9da'
STATE_RAW_SHA256 = 'ae5b8beae02eedc9c11f82d5dcc9d3aea0057c1180bb36c9aaa1bd20acd5924f'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_292.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('292 protected source bytes differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('292 source candidate proof differs')
    return proofs, rows

def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (proof['path_id'],
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('292 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'turn_end':
        if (row['path_id'] not in ('probe-02-a-first', 'probe-02-b-first') or
                not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('292 end proof differs')
        return {**base, 'selected_candidate': 'turn_end', 'resolution_mode': 'mandatory_proved_end',
                'six_stage_checks': proof['completeness_checks']}
    if proof['next_opportunity'] == 'turn_end_response':
        if (row['path_id'] not in ('probe-01-a-first', 'probe-01-b-first') or
                proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
            raise ValueError('292 response not unique')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    raise ValueError('292 current opportunity differs')

def build_report():
    proofs, rows = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'state_raw_sha256': STATE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': result}

def main_cli():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('292 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('292: two unique response passes and two proved ends')

if __name__ == '__main__': main_cli()
