#!/usr/bin/env python3
"""Audit three next response priorities and one post-item normal opportunity."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_current_restart_176 as prior
import proxy_new_seed_next_restart_174 as origins
import proxy_new_seed_response_restart_158 as response_audit
import proxy_new_seed_normal_trigger_audit_146 as normal_audit
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'fa24f30a0cfe5f688337ccf41be4fdd084494fa39a9da5cd0dedb8b09ad42480'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-audit-177-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_audit_177.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('176 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('176 source state/hash differs')
    return result


def origin_for(row):
    ctx = row['final_continuation_state']['response_context']
    origin_seq = ctx['origin_event_seq']
    recent = [x for x in row['new_events'] if x['seq'] == origin_seq]
    if recent: return recent[0]
    raw = origins.OUTPUT.read_bytes()
    if raw != origins.canonical_bytes(origins.build_report()):
        raise ValueError('174 protected origin replay differs')
    earlier = next(x for x in json.loads(raw)['results'] if x['path_id'] == row['path_id'])
    event = next(x for x in earlier['new_events'] if x['seq'] == origin_seq)
    if origin_seq >= row['last_valid_event_seq']:
        raise ValueError('177 prior origin ordering differs')
    return event


def audit_route(row):
    state = row['final_continuation_state']; game = state['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['stop_reason_code'] == 'unproved_post_resolution_normal_action_candidates':
        audit = normal_audit.audit_route(row)
        if game['phase'] != 'normal_action' or not audit['candidate_set_complete'] or \
                not all(audit['completeness_checks'].values()):
            raise ValueError('177 post-item normal candidates incomplete')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': audit['candidate_ids'], 'candidate_set_complete': True,
                'legal_candidate_details': audit['legal_candidate_details'],
                'completeness_checks': audit['completeness_checks'],
                'board_response_exclusions': audit['board_response_exclusions']}
    if row['stop_reason_code'] not in ('unproved_turn_end_response_candidates',
                                      'unproved_next_priority_response_candidates'):
        raise ValueError('177 unclassified current opportunity')
    current = copy.deepcopy(state)
    current.update({'source_event_seq': row['last_valid_event_seq'],
                    'last_event_seq': row['last_valid_event_seq'],
                    'source_game_state_sha256': row['final_game_state_sha256'],
                    'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(current) != current['continuation_state_sha256']:
        raise ValueError('177 source continuation hash differs')
    origin = origin_for(row)
    opportunity = response_audit.opportunity(current, origin)
    if opportunity['legal_candidate_ids'] != ['response-pass'] or \
            not opportunity['candidate_set_complete']:
        raise ValueError('177 next response pass not uniquely proved')
    return {**base, 'next_opportunity': 'response_window',
            'candidate_ids': opportunity['legal_candidate_ids'],
            'candidate_set_complete': True, 'origin_event_seq': origin['seq'],
            'board_exclusions': opportunity['board_exclusions'],
            'hand_exclusions': opportunity['excluded_candidates']}


def validate_result(result):
    try:
        original = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(original) else ['177 independent current audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(x) for x in load_source()['results']]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('177 followup audit differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('177 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('177: 3 unique response passes and 1 unique normal pass')


if __name__ == '__main__': main()
