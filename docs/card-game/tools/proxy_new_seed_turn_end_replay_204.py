#!/usr/bin/env python3
"""Complete four proved turn ends and draw the next turn's two egg cards."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_proof_203 as audits
import proxy_new_seed_end_response_replay_202 as states
import proxy_new_seed_turn_end_replay_185 as prior
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='a3b411c57e0c71226c8f31e442ca8c0c641ea19e6ef0d6ed52d543318c9fa2ee'
OUTPUT=ROOT/'data/proxy-new-seed-turn-end-replay-204-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_turn_end_replay_204.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()):
        raise ValueError('204 protected end proof/state raw differs')
    proof=json.loads(raw);source=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or source['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('204 current end proof differs')
    return proof,source


def classify_next_board(game,actor):
    board_state=game['players'][actor]['board'];instance=board_state['partner']
    if instance is None or game['cards'][instance]['card_id'] in board.PARTNER_TRIGGERS:
        return prior.classify_next_board(game,actor)
    card_id=game['cards'][instance]['card_id']
    section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
        f'### {card_id} — ',1)[1].split('\n### ',1)[0]
    if 'このこいびとと交際を始めた時、発動する' not in section or \
            board_state['partner_stage'] is None or \
            'たまご中は元の関係を保ち、こいびとの能力を無効に' not in \
            (ROOT/'66-relationship-start-and-romance-profile.md').read_text():
        raise ValueError('204 partner event-only timing unclassified')
    projected=copy.deepcopy(game)
    projected['players'][actor]['board']['partner']=None
    projected['players'][actor]['board']['partner_stage']=None
    classified=prior.classify_next_board(projected,actor)
    classified.append({'source_instance_id':instance,'card_id':card_id,
                       'trigger_kind':'event_trigger_not_turn_start',
                       'source_reference':'74-partner-18-card-text-draft.md#'+card_id})
    return classified


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or \
            not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('204 six-stage source boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    game=state['game_state'];actor=game['turn_player']
    if start._hash(state)!=state['continuation_state_sha256'] or \
            game['phase']!='turn_end' or state['return_target']!='turn_end' or \
            game['round']>=10 or any(p['growth']>=100 for p in game['players'].values()):
        raise ValueError('204 current end/victory boundary differs')
    first=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['first_player']
    next_actor='B' if actor=='A' else 'A'
    events=[];internal=[];shots=[]
    after=copy.deepcopy(state)
    after['game_state']['turn_player']=next_actor
    if actor!=first:after['game_state']['round']+=1
    after['game_state']['phase']='turn_start';after['return_target']=None
    precedent._append_transition(state,after,events,internal,'turn_end_completed',actor)
    normal._verify_step(state,after,[events[-1]])
    shots.append(prior.snapshot(after));state=after
    owner=state['game_state']['players'][next_actor]
    if not 1<=state['game_state']['round']<=10 or len(owner['deck'])<2 or \
            owner['reservations'] or state['pending_triggers'] or state['activation_zone']:
        raise ValueError('204 next turn draw source incomplete')
    board_inventory=classify_next_board(state['game_state'],next_actor)
    after=copy.deepcopy(state);player=after['game_state']['players'][next_actor]
    player['time']=after['game_state']['round']
    player['challenge_used']=False;player['person_placed']=False
    player['relationship_progressed']=False
    drawn=[player['deck'].pop(0),player['deck'].pop(0)]
    player['hand'].extend(drawn)
    after['game_state']['phase']='egg_exchange_choice'
    precedent._append_transition(state,after,events,internal,'turn_start_and_egg_draw',next_actor)
    normal._verify_step(state,after,[events[-1]])
    shots.append(prior.snapshot(after));state=after
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),
            'next_actor_board_inventory':board_inventory,'drawn_instance_ids':drawn,
            'stop_reason_code':'unproved_current_egg_exchange_choice',
            'new_decisions':[],'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+2:
            return ['204 independent next turn replay differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for index,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=row['last_valid_event_seq']+index or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['204 event/snapshot/hash chain differs']
            game=snap['game_state_sha256'];cont=snap['continuation_state_sha256']
        return [] if (game,cont)==(result['final_game_state_sha256'],
                                   result['final_continuation_state_sha256']) else ['204 final hash differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('204 four next-turn draws differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':0,'new_events':8,
            'new_snapshots':8,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('204 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('204: four next-turn transitions and two draws each')


if __name__=='__main__':main()
