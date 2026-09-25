#!/usr/bin/env python3
"""Apply mandatory seeded egg exchange at the reached next turns."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_replay_204 as states
import proxy_new_seed_egg_restart_165 as prior
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='48f37c0cfb33d176f18ff5d6e3710fcf7cbe47d20f26c258b0386a95ea263980'
OUTPUT=ROOT/'data/proxy-new-seed-egg-replay-205-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_egg_replay_205.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('205 protected next-turn raw/replay differs')
    source=json.loads(raw)
    if source['schema']!=states.SCHEMA or len(source['results'])!=4 or \
            any(states.validate_result(x) for x in source['results']):
        raise ValueError('205 source state/hash chain differs')
    return source


def run_route(row):
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    game=state['game_state'];actor=game['turn_player'];player=game['players'][actor]
    if start._hash(state)!=state['continuation_state_sha256'] or \
            game['phase']!='egg_exchange_choice' or not 1<=game['round']<=10 or \
            len(player['hand'])<2 or player['reservations'] or \
            state['activation_zone'] or state['pending_triggers']:
        raise ValueError('205 mandatory egg choice boundary differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    hand=[{'card_copy_id':game['cards'][instance]['card_copy_id'],
           'card_id':game['cards'][instance]['card_id'],'initial_instance_id':instance}
          for instance in player['hand']]
    decision=opening.build_mandatory_choice_decision({'order_id':order},actor,
        game['round'],game['round'],hand)
    errors=fallback.validate_seeded_resolution(decision)
    if errors or len(decision['legal_candidates'])!=len(player['hand']) or \
            decision['seeded_fallback_candidates']!=decision['legal_candidates']:
        raise ValueError('205 mandatory 116 seed proof differs: '+str(errors))
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    chosen=decision['selected_action']['initial_instance_id']
    after=copy.deepcopy(state);target=after['game_state']['players'][actor]
    target['hand'].remove(chosen);target['deck'].append(chosen)
    after['game_state']['phase']='response_window'
    ctx=after['response_context']
    ctx.update({'source_phase':'response_window','phase':'response_window',
                'window_kind':'turn_start','origin_event_seq':state['last_event_seq']+1,
                'turn_player':actor,'priority_actor':actor,'chain_status':'empty',
                'chain_links':[],'consecutive_passes':0,
                'response_opportunity_index':1,'decision_kind':'response_action',
                'choice_kind':'reaction_or_pass'})
    after['return_target']='normal_action_opportunity'
    events=[];internal=[]
    precedent._append_transition(state,after,events,internal,'egg_exchange_bottom',
                                 actor,decision['selected_candidate'])
    normal._verify_step(state,after,events)
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':'unproved_next_turn_start_response_candidates',
            'new_decisions':[decision],'new_events':events,
            'new_snapshots':[prior.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        original=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(original) or \
                result['last_valid_event_seq']!=original['last_valid_event_seq']+1:
            return ['205 independent seeded egg replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=original['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=original['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['205 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(row) for row in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('205 four seeded egg exchanges differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('205 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('205: four seeded egg exchanges; zero independent balance samples')


if __name__=='__main__':main()
