#!/usr/bin/env python3
"""Apply checkpoint 295 selections with chained event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_295 as choices
import proxy_new_seed_mixed_audit_294 as audits
import proxy_new_seed_mixed_replay_293 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '4a18dd61315bc5791a6d8b356899d978bb83d3ab10fe1d68046cd9b60826f990'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-296-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_296.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('296 protected choice/audit/state differ')
    return (json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results'])

def classify_next_board(game, actor):
    owner = game['players'][actor]
    companions = owner['board']['companions']
    cats = [x for x in companions if game['cards'][x]['card_id'] == 'C-cat_friend']
    if not cats:
        return ORIGINAL_CLASSIFY(game, actor)
    if len(cats) != 1:
        raise ValueError('296 next board companion inventory differs')
    section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
        '### C-cat_friend — ', 1)[1].split('\n### ', 1)[0]
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン開始時' in section):
        raise ValueError('296 cat friend activation timing differs')
    projected = copy.deepcopy(game)
    projected['players'][actor]['board']['companions'].remove(cats[0])
    classified = ORIGINAL_CLASSIFY(projected, actor)
    classified.append({'source_instance_id': cats[0], 'card_id': 'C-cat_friend',
                       'trigger_kind': 'activated_ability_not_turn_start',
                       'source_reference': '72-companion-26-card-text-draft.md#C-cat_friend'})
    return classified

ORIGINAL_CLASSIFY = end.classify_next_board

def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('296 selected state boundary differs')
    if selected['selected_candidate'] == 'turn_end':
        if not proof['turn_end_set_complete'] or selected['resolution_mode'] != 'mandatory_proved_end':
            raise ValueError('296 end proof differs')
        original = end.classify_next_board
        try:
            end.classify_next_board = classify_next_board
            result = end.run_route(row, proof)
        finally:
            end.classify_next_board = original
        if len(result['new_events']) != 2:
            raise ValueError('296 end and next draw differs')
        return result
    if (selected['resolution_mode'] != 'seeded_fallback' or
            proof['next_opportunity'] != 'mandatory_egg_exchange' or
            not proof['candidate_set_complete'] or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('296 mandatory egg selection differs')
    result = egg.run_route(row)
    decision = result['new_decisions'][0]
    if (decision != selected['selected_decision'] or
            decision['selected_candidate'] != selected['selected_candidate'] or
            len(result['new_events']) != 1 or
            result['new_events'][0]['action_type'] != 'egg_exchange_bottom'):
        raise ValueError('296 seeded egg replay differs')
    return result

def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, choice, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events']):
            return ['296 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['296 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['296 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]

def build_report():
    rows, selected, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(result) != 4 or sum(len(x['new_events']) for x in result) != 6 or any(validate_result(x) for x in result):
        raise ValueError('296 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 2,
            'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': result}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('296 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('296: two seeded eggs and two proved end/draw pairs')

if __name__ == '__main__': main()
