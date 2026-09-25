#!/usr/bin/env python3
"""Close fully proved post-placement and end-request response windows."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_restart_157 as prior
import proxy_new_seed_response_restart_148 as precedent
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '733193d93553e8e83b055b8e1ac34d33101ba5d1ffae12222092846113932ab9'
OUTPUT = ROOT / 'data/proxy-new-seed-response-restart-158-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_response_restart_158.v1'
PARTNER_CONDITION = {'P-cliff_goat': '自分が名前の異なるセカイへ変更した時',
                     'P-anglerfish': '自分のメインが自分からちょうせんする時'}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('157 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('157 state/hash chain differs')
    return data


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('157 continuation source SHA differs')
    return state


def snapshot(state):
    return {'event_seq':state['last_event_seq'], 'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def opportunity(state, origin):
    ctx = state['response_context']; actor = ctx['priority_actor']; game = state['game_state']
    if ctx['window_kind'] != 'after_normal_action' or ctx['phase'] != 'response_window' or \
            state['pending_triggers'] or state['activation_zone'] or ctx['chain_links']:
        raise ValueError('158 current response boundary differs')
    board = game['players'][actor]['board']
    if board['prepared'] or board['main'] is not None or board['world'] is not None:
        raise ValueError('158 unproved board response source')
    projected = copy.deepcopy(state); exclusions = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        _, *fragments = timing.TRIGGERS[card_id]
        section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if any(fragment not in section for fragment in fragments) or \
                origin['seq'] != ctx['origin_event_seq'] or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               origin['action_type'],origin['actor']):
            raise ValueError('158 companion response timing not excluded')
        exclusions.append({'source_instance_id':instance,'card_id':card_id,
                           'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions'] = []
    instance = board['partner']
    if instance is not None:
        card_id = game['cards'][instance]['card_id']; condition = PARTNER_CONDITION[card_id]
        section = (ROOT / '74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if condition not in section or '発動できる' not in section or \
                origin['seq'] != ctx['origin_event_seq'] or \
                origin['action_type'] not in ('place_partner','response_pass'):
            raise ValueError('158 partner response timing not excluded')
        # A placement or response-pass event cannot be a challenge or world change.
        exclusions.append({'source_instance_id':instance,'card_id':card_id,
                           'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    opportunity = start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    opportunity['response_context'] = copy.deepcopy(ctx)
    opportunity['board_exclusions'] = exclusions
    if opportunity['legal_candidate_ids'] != ['response-pass'] or not opportunity['candidate_set_complete']:
        raise ValueError('158 response candidate not uniquely proved')
    return opportunity


def run_route(row):
    state = current(row); decisions=[];events=[];snaps=[]
    if state['game_state']['phase'] not in ('post_placement_response','turn_end_response'):
        raise ValueError('158 unclassified response phase')
    order = next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    original_end = state['return_target']=='turn_end'
    if original_end != (state['game_state']['phase']=='turn_end_response'):
        raise ValueError('158 response return target differs')
    for index in range(1 if original_end else 2):
        origin = row['new_events'][-1]
        chance = opportunity(state,origin)
        decision = response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('158 response pass not unique')
        decision['pre_game_state_sha256']=start.opening._stop_state_sha256(state['game_state'])
        decision['pre_continuation_state_sha256']=state['continuation_state_sha256']
        decision['event_seq']=state['last_event_seq']
        after,event=response.apply_response_pass(state,decision)
        if original_end:
            if state['response_context']['consecutive_passes']!=1 or \
                    after['response_context']['consecutive_passes']!=2:
                raise ValueError('158 end-request closing priority differs')
            after['game_state']['phase']='turn_end';after['return_target']='turn_end'
            after['continuation_state_sha256']=start._hash(after)
            event['game_state_after_sha256']=start.opening._stop_state_sha256(after['game_state'])
            event['continuation_state_after_sha256']=after['continuation_state_sha256']
            event['result']['return_target']='turn_end'
        event.pop('_snapshot_after',None)
        normal._verify_step(state,after,[event])
        decisions.append(decision);events.append(event);snaps.append(snapshot(after));state=after
    reason = 'unproved_current_turn_end_provenance' if original_end else \
             'unproved_post_response_normal_action_candidates'
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state), 'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':events,'new_snapshots':snaps,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(source) or result['last_valid_event_seq']!= \
                source['last_valid_event_seq']+len(result['new_events']):
            return ['158 independent replay differs']
        game=source['final_game_state_sha256'];cont=source['final_continuation_state_sha256']
        for offset,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=source['last_valid_event_seq']+offset or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['158 event/snapshot hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        if game!=result['final_game_state_sha256'] or cont!=result['final_continuation_state_sha256']:
            return ['158 final hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('158 independent response replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in rows),
            'new_events':sum(len(x['new_events']) for x in rows),
            'new_snapshots':sum(len(x['new_snapshots']) for x in rows),
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('158 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('158: 4 current response windows, 7 passes, 0 completed')


if __name__=='__main__':main()
