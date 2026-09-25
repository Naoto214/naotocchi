#!/usr/bin/env python3
"""Complete four historically proven turn ends and next-actor egg draws."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_proof_184 as proof_source
import proxy_new_seed_end_response_replay_183 as saved
import proxy_new_seed_turn_end_audit_163 as board
import proxy_board_trigger_audit_144 as companion
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=proof_source.OUTPUT
SOURCE_RAW_SHA256='8621db1d8b7d003399ce8858ed19a8b53921ac85381bc42b962049dc2e1e7318'
SAVED_RAW_SHA256=proof_source.SOURCE_RAW_SHA256
OUTPUT=ROOT/'data/proxy-new-seed-turn-end-replay-185-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_turn_end_replay_185.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();states=saved.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(states).hexdigest()!=SAVED_RAW_SHA256:
        raise ValueError('185 protected proof or state raw differs')
    audits=json.loads(raw);result=json.loads(states)
    if audits['schema']!=proof_source.SCHEMA or result['schema']!=saved.SCHEMA or \
            len(audits['results'])!=4 or len(result['results'])!=4 or \
            any(proof_source.validate_result(x) for x in audits['results']):
        raise ValueError('185 protected turn-end proof differs')
    return audits,result


def snapshot(state):
    return {'event_seq':state['last_event_seq'],
            'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def classify_next_board(game, actor):
    board_state=game['players'][actor]['board']
    if any(board_state[key] for key in ('main','world','prepared')):
        raise ValueError('185 unproved next-actor board source')
    classifications=[]
    for instance in board_state['companions']:
        card_id=game['cards'][instance]['card_id']
        if card_id not in companion.TRIGGERS:
            raise ValueError('185 unclassified companion at start boundary')
        kind,*fragments=companion.TRIGGERS[card_id]
        text=(ROOT/'72-companion-26-card-text-draft.md').read_text()
        section=text.split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(fragment not in section for fragment in fragments):
            raise ValueError('185 companion source text differs')
        classifications.append({'source_instance_id':instance,'card_id':card_id,
                                'trigger_kind':kind,'source_reference':
                                '72-companion-26-card-text-draft.md#'+card_id})
    instance=board_state['partner']
    if instance is not None:
        card_id=game['cards'][instance]['card_id']
        if card_id not in board.PARTNER_TRIGGERS:
            raise ValueError('185 unclassified next-actor partner at start boundary')
        fragment=board.PARTNER_TRIGGERS[card_id]
        text=(ROOT/'74-partner-18-card-text-draft.md').read_text()
        section=text.split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if fragment not in section or '発動できる' not in section or \
                board_state['partner_stage'] is None:
            raise ValueError('185 partner start timing source differs')
        classifications.append({'source_instance_id':instance,'card_id':card_id,
                                'trigger_kind':'event_trigger_not_turn_start',
                                'source_reference':'74-partner-18-card-text-draft.md#'+card_id})
    return classifications


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or \
            not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('185 183/184 turn-end state/proof differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256'] or \
            state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end':
        raise ValueError('185 current continuation differs')
    game=state['game_state'];actor=game['turn_player']
    if game['round']>=10 or any(p['growth']>=100 for p in game['players'].values()):
        raise ValueError('185 unproved terminal transition')
    first=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['first_player']
    next_actor='B' if actor=='A' else 'A'
    events=[];snaps=[];internal=[]
    after=copy.deepcopy(state)
    after['game_state']['turn_player']=next_actor
    if actor!=first:after['game_state']['round']+=1
    after['game_state']['phase']='turn_start';after['return_target']=None
    precedent._append_transition(state,after,events,internal,'turn_end_completed',actor)
    normal._verify_step(state,after,[events[-1]])
    snaps.append(snapshot(after));state=after
    owner=state['game_state']['players'][next_actor]
    if state['game_state']['round'] not in (1,2,3) or len(owner['deck'])<2 or \
            owner['reservations'] or state['pending_triggers'] or state['activation_zone']:
        raise ValueError('185 next turn draw source incomplete')
    board_inventory=classify_next_board(state['game_state'],next_actor)
    after=copy.deepcopy(state)
    player=after['game_state']['players'][next_actor]
    player['time']=after['game_state']['round']
    player['challenge_used']=False
    player['person_placed']=False
    player['relationship_progressed']=False
    drawn=[player['deck'].pop(0),player['deck'].pop(0)]
    player['hand'].extend(drawn)
    after['game_state']['phase']='egg_exchange_choice'
    precedent._append_transition(state,after,events,internal,'turn_start_and_egg_draw',next_actor)
    normal._verify_step(state,after,[events[-1]])
    snaps.append(snapshot(after));state=after
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),
            'next_actor_board_inventory':board_inventory,'drawn_instance_ids':drawn,
            'stop_reason_code':'unproved_current_egg_exchange_choice',
            'new_decisions':[],'new_events':events,'new_snapshots':snaps,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        audits,states=load_sources()
        row=next(x for x in states['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in audits['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+2:
            return ['185 independent replay differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for index,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=row['last_valid_event_seq']+index or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['185 event/snapshot/hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        return [] if (game,cont)==(result['final_game_state_sha256'],
                                   result['final_continuation_state_sha256']) else ['185 final hash differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:
        return [str(error)]


def build_report():
    audits,states=load_sources()
    rows=[run_route(row,next(x for x in audits['results'] if x['path_id']==row['path_id']))
          for row in states['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('185 next turn transitions differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'states_raw_sha256':SAVED_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':0,'new_events':8,'new_snapshots':8,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('185 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('185: 4 completed turn transitions and next-turn draws, 8 events')


if __name__=='__main__':main()
