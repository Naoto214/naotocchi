#!/usr/bin/env python3
"""Resolve four fully audited start response choices without card-copy branches."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_opportunity_audit_187 as audit
import proxy_new_seed_egg_exchange_replay_186 as states
import proxy_new_seed_start_restart_168 as precedent
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response
import proxy_response_window_contract as contract
import proxy_normal_action_seeded_restart as normal

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audit.OUTPUT
SOURCE_RAW_SHA256='7adeff4311e83203fd481dcda734d84091de2a71a036d7f064c462724442fa73'
OUTPUT=ROOT/'data/proxy-new-seed-start-choice-188-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_choice_188.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();original=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(original).hexdigest()!=audit.SOURCE_RAW_SHA256:
        raise ValueError('188 protected 187/186 raw differs')
    proof=json.loads(raw);saved=json.loads(original)
    if proof['schema']!=audit.SCHEMA or saved['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(saved['results'])!=4 or \
            any(audit.validate_result(x) for x in proof['results']):
        raise ValueError('188 full opportunity proof differs')
    return proof,saved


def opportunity(state,proof):
    ctx=state['response_context'];actor=ctx['priority_actor'];game=state['game_state']
    if not proof['candidate_set_complete'] or actor!=game['turn_player'] or \
            ctx['window_kind']!='turn_start':
        raise ValueError('188 first response proof incomplete')
    projected=copy.deepcopy(state)
    for exclusion in proof['hand_conditional_exclusions']:
        instance=exclusion['source_instance_id']
        if instance not in projected['game_state']['players'][actor]['hand']:
            raise ValueError('188 conditional hand identity differs')
        projected['game_state']['players'][actor]['hand'].remove(instance)
    projected['game_state']['players'][actor]['board']['companions']=[]
    partner=projected['game_state']['players'][actor]['board']['partner']
    if partner is not None:
        if not any(x['source_instance_id']==partner for x in proof['board_exclusions']):
            raise ValueError('188 partner response proof missing')
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    if chance['legal_candidate_ids']!=proof['hand_candidate_ids'] or \
            chance['excluded_candidates']!=proof['hand_other_exclusions']:
        raise ValueError('188 hand response proof differs')
    additions=[]
    for detail in proof['board_candidate_details']:
        instance=detail['source_instance_id']
        if instance not in game['players'][actor]['board']['companions'] or \
                game['cards'][instance]['card_id']!=detail['card_id']:
            raise ValueError('188 board response identity differs')
        additions.append({**detail,'card_copy_id':game['cards'][instance]['card_copy_id'],
                          'target_instance_ids':[],'candidate_variant':None,
                          'base_time_cost':0})
    chance['legal_candidate_details']=sorted(chance['legal_candidate_details']+additions,
                                            key=lambda x:x['candidate_id'])
    chance['legal_candidate_ids']=[x['candidate_id'] for x in chance['legal_candidate_details']]
    chance['board_exclusions']=copy.deepcopy(proof['board_exclusions'])
    chance['hand_conditional_exclusions']=copy.deepcopy(proof['hand_conditional_exclusions'])
    chance['inspected_information']=contract._information_snapshot(game,actor)
    chance['source_references']=sorted({ref for x in chance['legal_candidate_details']
                                       for ref in x.get('source_references',[])})
    if chance['legal_candidate_ids']!=proof['candidate_ids']:
        raise ValueError('188 complete response ID set differs')
    return chance


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('188 saved state/audit boundary differs')
    state=precedent.current(row);chance=opportunity(state,proof)
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
        'round':state['game_state']['round']},chance)
    decision['pre_game_state_sha256']=row['final_game_state_sha256']
    decision['pre_continuation_state_sha256']=row['final_continuation_state_sha256']
    decision['event_seq']=row['last_valid_event_seq']
    events=[];snaps=[]
    if decision['selected_candidate']=='response-pass':
        after,event,_=start._pass(state,decision['actor'])
        normal._verify_step(state,after,[event])
        events=[event];snaps=[precedent.snapshot(after)];state=after
        reason='unproved_next_priority_response_candidates'
    elif decision['selected_action']['candidate_family']=='triggered_ability':
        reason='unproved_selected_board_ability_activation'
    else:
        reason='unproved_selected_quick_use_activation'
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),
            'stop_reason_code':reason,'new_decisions':[decision],
            'new_events':events,'new_snapshots':snaps,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['188 independent choice differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=row['last_valid_event_seq']+1 or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['188 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('188 start choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,
            'new_events':sum(len(x['new_events']) for x in rows),
            'new_snapshots':sum(len(x['new_snapshots']) for x in rows),
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('188 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('188: 4 complete response choices, '+str(json.loads(raw)['new_events'])+' applied passes')


if __name__=='__main__':main()
