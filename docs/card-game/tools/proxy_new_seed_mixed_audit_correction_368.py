#!/usr/bin/env python3
"""Correct the 367 projected-board partner candidate against the original state."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_audit_367 as prior
import proxy_new_seed_mixed_replay_366 as states
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_action_candidate_completeness as candidates

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-correction-368-20260929.json'
PRIOR_SHA = '49fd52d914a5c491ceafb2d2471ba61a536e5b276d9673d6b1ec3a0117a692f0'
STATE_SHA = '4e34c2df05979c9625720f22eb031003cc3d0db30e6d43cd1e4ee51f394ce2fc'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_correction_368.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

def build_report():
    raw, saved = prior.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != PRIOR_SHA or hashlib.sha256(saved).hexdigest() != STATE_SHA or
            raw != prior.canonical_bytes(prior.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('368 protected source differs')
    earlier = json.loads(raw)['results']
    rows = {x['path_id']: x for x in json.loads(saved)['results']}
    if len(earlier) != 4 or len(rows) != 4:
        raise ValueError('368 four paths differ')
    corrected = []
    for original in earlier:
        result = copy.deepcopy(original)
        if result['path_id'] == 'probe-02-a-first':
            state = rows[result['path_id']]['final_continuation_state']
            game = state['game_state']
            owner = game['players'][game['turn_player']]
            partner = owner['board']['partner']
            candidate = result['legal_candidate_details'][0]
            source = candidate['source_instance_id']
            if (game['turn_player'] != 'A' or partner is None or
                    game['cards'][partner]['card_id'] != 'P-anglerfish' or
                    game['phase'] != 'normal_action' or owner['person_placed'] or
                    source not in owner['hand'] or candidate['card_id'] != 'P-desert_scorpion' or
                    candidate['action_type'] != 'place_partner' or
                    [x['action_type'] for x in result['legal_candidate_details']] !=
                    ['place_partner', 'play_main', 'pass'] or
                    not result['candidate_set_complete'] or
                    not all(result['completeness_checks'].values()) or
                    opening._placement_for_card(source, game['cards'][source],
                                                candidates.load_inputs()['candidate_table'], owner['board']) is not None):
                raise ValueError('368 occupied partner slot proof differs')
            if opening._placement_for_card(source, game['cards'][source],
                    candidates.load_inputs()['candidate_table'], {**owner['board'], 'partner': None}) is None:
                raise ValueError('368 eligible card template differs')
            result['candidate_ids'] = result['candidate_ids'][1:]
            result['legal_candidate_details'] = result['legal_candidate_details'][1:]
            result['corrected_exclusion'] = {
                'candidate_id': candidate['candidate_id'], 'source_instance_id': source,
                'occupied_by': partner, 'reason_code': 'partner_slot_occupied',
                'source_contracts': [107, 114, 116]}
        corrected.append(result)
    return {'schema': SCHEMA, 'prior_raw_sha256': PRIOR_SHA, 'state_raw_sha256': STATE_SHA,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': corrected}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('368 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('368: occupied partner slot corrected; source 367 unchanged')

if __name__ == '__main__':
    main()
