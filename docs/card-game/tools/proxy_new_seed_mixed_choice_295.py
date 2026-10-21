#!/usr/bin/env python3
"""Select the two seeded egg exchanges and two proved ends at 294."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_294 as audits
import proxy_new_seed_mixed_replay_293 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
import proxy_new_seed_egg_replay_205 as egg_choice

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-295-20260927.json'
SOURCE_RAW_SHA256 = '1fd378057081f46579bbfbce81fb0adc83d919766fe62977e58787dfbd0ed3ef'
STATE_RAW_SHA256 = '230a7bdb9a9fde02a242025ecea458327d16168b6f4a411b41d1d2452f67b094'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_295.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('295 protected source bytes differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('295 source candidate proof differs')
    return proofs, rows

def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (proof['path_id'],
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('295 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'turn_end':
        if (row['path_id'] not in ('probe-01-a-first', 'probe-01-b-first') or
                not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('295 end proof differs')
        return {**base, 'selected_candidate': 'turn_end', 'resolution_mode': 'mandatory_proved_end',
                'six_stage_checks': proof['completeness_checks']}
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        if (row['path_id'] not in ('probe-02-a-first', 'probe-02-b-first') or
                not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback'):
            raise ValueError('295 mandatory choice incomplete')
        decision = egg_choice.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['resolution_mode'] != proof['resolution_mode'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('295 mandatory seed differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    raise ValueError('295 current opportunity differs')

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
            raise SystemExit('295 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('295: two seeded egg exchanges and two proved ends')

if __name__ == '__main__': main_cli()
