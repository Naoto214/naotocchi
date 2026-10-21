#!/usr/bin/env python3
"""Audit a normal action and three response windows at 363."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_replay_363 as states
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
import proxy_new_seed_board_partner_audit_179 as normal
import proxy_new_seed_mixed_audit_343 as first_date
import proxy_new_seed_mixed_audit_337 as baseline_a
import proxy_new_seed_mixed_audit_291 as baseline_b
import proxy_new_seed_mixed_audit_294 as baseline_refs
import proxy_new_seed_turn_end_proof_203 as terminal_baseline
import proxy_new_seed_turn_end_audit_163 as board_end
import proxy_turn_end_provenance_restart as precedent

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '0930f90356ddef5007d7392aee104753807d1f9c27a94eb875d514a879334b18'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-364-20260929.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_364.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('364 protected 348 replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('364 saved state/event inventory differs')
    return rows

def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path, actor = row['path_id'], ctx['priority_actor']
    if path=='probe-01-b-first':
        if (game['phase']!='response_window' or ctx['window_kind']!='turn_start' or
                actor!='A' or ctx['turn_player']!='A' or ctx['consecutive_passes']!=0 or
                row['new_events'][0]['action_type']!='egg_exchange_bottom'):
            raise ValueError('364 first date opportunity boundary differs')
        proof=first_date.audit_response({**row,'path_id':'probe-01-a-first'})
        if proof['candidate_ids']!=['response-activate-ability-A-015#1','response-pass',
                                   'response-use-event-A-040#1-target-A-017#1']:
            raise ValueError('364 first date opportunity differs')
        return proof
    expected = {'probe-01-b-first': ('response_window','turn_start','A','A','empty',0,0),
                'probe-02-a-first': ('response_window','turn_start','B','A','empty',1,0),
                'probe-02-b-first': ('response_window','turn_start','B','A','empty',1,0)}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['turn_player'], ctx['chain_status'],
             ctx['consecutive_passes'], len(state['activation_zone'])) != expected[path] or
            state['pending_triggers']):
        raise ValueError('364 response boundary differs')
    owner = game['players'][actor]
    board = owner['board']
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('364 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('364 animal shogi target differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('364 own main target text differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id':instance, **exclusion})
    excluded = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('364 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('364 box text differs')
            reason = 'no_ability'
        elif card_id in ('C-bat','C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('364 board trigger text differs')
            if timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                              row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
                raise ValueError('364 board trigger unexpectedly met')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('364 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section and board['world'] is None:
            reason = 'different_world_replacement_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('364 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id':partner,'card_id':card_id,'reason_code':reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected,actor,entries)
    ids = chance['legal_candidate_ids']
    if ids != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('364 response candidates require further proof: ' + repr(ids))
    return {'next_opportunity':game['phase'],'candidate_ids':ids,'candidate_set_complete':True,
            'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':excluded}

def audit_route(row):
    state = row['final_continuation_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(state['game_state']) != row['final_game_state_sha256']):
        raise ValueError('364 source state/hash differs')
    base = {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'new_events':0,'completed':False,'balance_sample_count':0}
    if row['path_id']=='probe-01-a-first':
        if state['game_state']['phase']!='normal_action' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('364 normal action boundary differs')
        proof=normal.audit_route(row)
        if proof['next_opportunity']!='normal_action' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('364 normal action inventory incomplete')
        return {**base,**{key:proof[key] for key in ('next_opportunity','candidate_ids','candidate_set_complete',
                'legal_candidate_details','completeness_checks','board_exclusions')}}
    if row['path_id'] in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
        return {**base,**audit_response(row)}
    raise ValueError('364 path differs')

def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4:
        raise ValueError('364 route inventory differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':results}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('364 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('364: one normal action and three response windows audited')

if __name__ == '__main__':
    main()
