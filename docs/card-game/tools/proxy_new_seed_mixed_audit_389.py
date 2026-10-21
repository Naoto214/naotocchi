#!/usr/bin/env python3
"""Audit two responses and two normal actions at the immutable 366 boundary."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_replay_388 as states
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
import proxy_new_seed_board_partner_audit_179 as normal

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '3c3d5c70ff1b38c740a6278866e15f7d2fd8ec6b2bc0eec2fa53160901018974'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-389-20260929.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_389.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256:
        raise ValueError('389 protected 366 replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4:
        raise ValueError('389 saved state/event inventory differs')
    return rows

def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path, actor = row['path_id'], ctx['priority_actor']
    expected = {'probe-01-a-first': ('response_window','turn_start','A','A','empty',0,0),
        'probe-01-b-first': ('turn_end_response','after_normal_action','A','B','empty',1,0),
        'probe-02-b-first': ('post_placement_response','after_normal_action','A','A','empty',0,0),
        'probe-02-a-first': ('response_window','turn_start','A','A','empty',0,0)}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['turn_player'], ctx['chain_status'],
             ctx['consecutive_passes'], len(state['activation_zone'])) != expected[path] or
            state['pending_triggers']):
        raise ValueError('389 response boundary differs')
    owner = game['players'][actor]
    board = owner['board']
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('389 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'E-boss':
            section = hand.source_section('91-event-21-card-text-draft.md', card_id)
            if (board['main'] is not None or
                    'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section):
                raise ValueError('389 boss opponent-turn condition differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn',
                         'source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 animal shogi target differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('389 own main target text differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id':instance, **exclusion})
    excluded = []
    board_candidates = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('389 box text differs')
            reason = 'no_ability'
        elif card_id == 'C-chicken' and path == 'probe-01-a-first':
            trigger=timing.TRIGGERS.get(card_id)
            if (not owner['deck'] or trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                    row['new_events'][0]['action_type']!='egg_exchange_bottom' or
                    ctx['origin_event_seq']!=row['last_valid_event_seq'] or
                    not timing.matches(card_id,'turn_start',actor,ctx['turn_player'],'turn_start',actor)):
                raise ValueError('389 chicken start trigger differs')
            board_candidates.append({'candidate_id':'response-activate-ability-'+instance,
                'candidate_family':'triggered_ability','action_type':'activate_board_ability',
                'source_instance_id':instance,'card_id':card_id,
                'source_references':['72-companion-26-card-text-draft.md#'+card_id]})
            reason=None
        elif card_id in ('C-bat','C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('389 board trigger text differs')
            if timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                              row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
                raise ValueError('389 board trigger unexpectedly met')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('389 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        if reason:excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
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
            raise ValueError('389 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id':partner,'card_id':card_id,'reason_code':reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected,actor,entries)
    ids = sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in board_candidates])
    expected_ids=['response-activate-ability-A-015#1','response-pass'] if path=='probe-01-a-first' else ['response-pass']
    if ids != expected_ids or len(ids)!=len(set(ids)) or not chance['candidate_set_complete']:
        raise ValueError('389 response candidates require further proof: ' + repr(ids))
    return {'next_opportunity':game['phase'],'candidate_ids':ids,'candidate_set_complete':True,
            'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':excluded,'board_candidate_details':board_candidates}

def audit_route(row):
    state = row['final_continuation_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(state['game_state']) != row['final_game_state_sha256']):
        raise ValueError('389 source state/hash differs')
    base = {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'new_events':0,'completed':False,'balance_sample_count':0}
    return {**base,**audit_response(row)}

def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4:
        raise ValueError('389 route inventory differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':results}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('389 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('389: four response windows audited')

if __name__ == '__main__':
    main()
