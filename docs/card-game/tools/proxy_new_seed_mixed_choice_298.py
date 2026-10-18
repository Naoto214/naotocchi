#!/usr/bin/env python3
"""Select the two seeded egg exchanges and two unique start passes at 297."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_297 as audits
import proxy_new_seed_mixed_replay_296 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
import proxy_new_seed_egg_replay_205 as egg_choice

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-298-20260927.json'
SOURCE_RAW_SHA256 = 'b4fbf1fb0137ce457610e155f2604951a1c4f02c382f15f298408888e869034b'
STATE_RAW_SHA256 = '3b72563c841199c2364be3622402fceee03fb6d47c4b671cb035fc82694ceb72'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_298.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('298 protected source bytes differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('298 source candidate proof differs')
    return proofs, rows

def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (proof['path_id'],
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('298 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'response_window':
        if (row['path_id'] not in ('probe-02-a-first', 'probe-02-b-first') or
                proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
            raise ValueError('298 response not unique')
        return {**base, 'candidate_ids': ['response-pass'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        if (row['path_id'] not in ('probe-01-a-first', 'probe-01-b-first') or
                not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback'):
            raise ValueError('298 mandatory choice incomplete')
        decision = egg_choice.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['resolution_mode'] != proof['resolution_mode'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('298 mandatory seed differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    raise ValueError('298 current opportunity differs')

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
            raise SystemExit('298 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('298: two seeded eggs and two unique passes')

if __name__ == '__main__': main_cli()
