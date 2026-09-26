#!/usr/bin/env python3
"""Extend protected histories and prove four complete six-stage turn ends."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_replay_250 as states
import proxy_new_seed_turn_end_proof_233 as baseline
import proxy_new_seed_turn_end_proof_203 as early
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='439fc7f60f61c48c4aa365cee1390cf501af17f5944b6eb5fb6364bf5085f60b'
BASELINE_RAW_SHA256='cb2dbc7dce2987f7e340500cc600650ce40c281dd8150439a82012f07b968a78'
EARLY_RAW_SHA256='a3b411c57e0c71226c8f31e442ca8c0c641ea19e6ef0d6ed52d543318c9fa2ee'
OUTPUT=ROOT/'data/proxy-new-seed-turn-end-proof-251-20260926.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_turn_end_proof_251.v1'
SOURCE_REFS={
    'turn_end_completed':'01-core-rules.md',
    'turn_start_and_egg_draw':'01-core-rules.md',
    'egg_exchange_bottom':'01-core-rules.md',
    'activate_response':'119-response-window-contract.md',
    'resolve_board_ability':'72-companion-26-card-text-draft.md#C-chicken',
    'place_partner':'74-partner-18-card-text-draft.md',
    'place_companion':'72-companion-26-card-text-draft.md',
    'normal_pass_end_request':'01-core-rules.md',
    'response_pass':'119-response-window-contract.md',
}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();old=baseline.OUTPUT.read_bytes();first=early.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(old).hexdigest()!=BASELINE_RAW_SHA256 or
            hashlib.sha256(first).hexdigest()!=EARLY_RAW_SHA256 or
            raw!=states.canonical_bytes(states.build_report()) or
            old!=baseline.canonical_bytes(baseline.build_report()) or
            first!=early.canonical_bytes(early.build_report())):
        raise ValueError('251 protected 250/233/203 raw/canonical differs')
    current=json.loads(raw);history=json.loads(old);earliest=json.loads(first)
    if (len(current['results'])!=len(history['results'])!=len(earliest['results'])!=4 or
            any(states.validate_result(x) for x in current['results']) or
            any(baseline.validate_result(x) for x in history['results']) or
            any(early.validate_result(x) for x in earliest['results'])):
        raise ValueError('251 saved state/history inventory differs')
    return current,history,earliest


def audit_route(row,old):
    path=row['path_id'];state=row['final_continuation_state']
    if old['path_id']!=path:
        raise ValueError('251 baseline path differs')
    if row['stop_reason_code']!='unproved_current_turn_end_provenance':
        if (state['game_state']['phase']!='normal_action' or
                row['stop_reason_code']!='unproved_next_priority_response_candidates' or
                len(row['new_events'])!=1 or
                row['new_events'][0]['action_type']!='response_pass'):
            raise ValueError('251 held normal route boundary differs')
        return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
                'source_game_state_sha256':row['final_game_state_sha256'],
                'source_continuation_state_sha256':row['final_continuation_state_sha256'],
                'turn_end_set_complete':False,'next_opportunity':'normal_action',
                'reported_stop_reason_code':row['stop_reason_code'],
                'stop_label_correction':'phase_is_normal_action',
                'new_events':0,'completed':False,'balance_sample_count':0}
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end':
        raise ValueError('251 current turn end boundary differs')
    seq=old['source_last_valid_event_seq'];game_sha=old['source_game_state_sha256']
    cont_sha=old['source_continuation_state_sha256']
    classified=copy.deepcopy(old['classified_events']);growth=copy.deepcopy(old['growth_trace'])
    event_counts={}
    for number in range(204 if path=='probe-01-b-first' else 234,251):
        if number==241:continue
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError('251 checkpoint history file inventory differs')
        saved=next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id']==path)
        events=saved.get('new_events',[]);shots=saved.get('new_snapshots',[])
        if events==0:events=[]
        if shots==0:shots=[]
        if not isinstance(events,list) or not isinstance(shots,list) or len(events)!=len(shots):
            raise ValueError('251 checkpoint event/snapshot inventory differs')
        event_counts[str(number)]=len(events)
        for event,snap in zip(events,shots):
            action=event['action_type']
            if action not in SOURCE_REFS or event['seq']!=seq+1 or \
                    snap['event_seq']!=event['seq'] or \
                    event['game_state_before_sha256']!=game_sha or \
                    event['continuation_state_before_sha256']!=cont_sha or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                raise ValueError('251 historical event/snapshot/hash chain differs')
            now={actor:snap['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta={actor:now[actor]-growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or snap['continuation_state']['pending_triggers'] or \
                    (action=='resolve_board_ability' and snap['continuation_state']['activation_zone']):
                raise ValueError('251 historical growth/pending state differs')
            seq=event['seq'];game_sha=snap['game_state_sha256'];cont_sha=snap['continuation_state_sha256']
            classified.append({'seq':seq,'action_type':action,
                               'source_reference':SOURCE_REFS[action], 'growth_delta':delta})
            growth.append({'event_seq':seq,'growth':now})
    if (seq,game_sha,cont_sha)!=(row['last_valid_event_seq'],
            row['final_game_state_sha256'],row['final_continuation_state_sha256']) or \
            old['growth_reach_100'] or old['active_expiring_effects'] or old['unresolved_codes']:
        raise ValueError('233 final state/history boundary differs')
    proof={'classified_events':classified,'growth_trace':growth,
           'growth_reach_100':old['growth_reach_100'],
           'active_expiring_effects':old['active_expiring_effects'],
           'unresolved_codes':old['unresolved_codes'],'source_event_seq':seq}
    stop={'path_id':path,'last_valid_event_seq':seq,'game_state_sha256':game_sha,
          'continuation_state_sha256':cont_sha,'game_state':state['game_state'],
          'continuation_state':state}
    with board.current_board_scope():result=precedent.audit_current_turn_end(stop,proof)
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or \
            not all(result['completeness_checks'].values()):
        raise ValueError('251 six-stage turn end incomplete')
    return {'path_id':path,'source_last_valid_event_seq':seq,
            'source_game_state_sha256':game_sha,
            'source_continuation_state_sha256':cont_sha,
            'source_round':state['game_state']['round'],
            'classified_events':classified,'growth_trace':growth,
            'growth_reach_100':old['growth_reach_100'],
            'active_expiring_effects':old['active_expiring_effects'],
            'unresolved_codes':old['unresolved_codes'],
            'event_counts_by_checkpoint':event_counts,
            'stage_inventory':result['stage_inventory'],
            'completeness_checks':result['completeness_checks'],
            'contract_stop_codes':result['contract_stop_codes'],
            'turn_end_set_complete':True,'new_events':0,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        current,history,earliest=load_sources()
        row=next(x for x in current['results'] if x['path_id']==result['path_id'])
        pool=earliest if result['path_id']=='probe-01-b-first' else history
        old=next(x for x in pool['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,old) else ['251 independent provenance differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    current,history,earliest=load_sources()
    rows=[audit_route(row,next(x for x in (earliest if row['path_id']=='probe-01-b-first' else history)['results'] if x['path_id']==row['path_id']))
          for row in current['results']]
    if len(rows)!=4 or sum(x['turn_end_set_complete'] for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('251 three historical six-stage ends differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'baseline_raw_sha256':BASELINE_RAW_SHA256,'early_raw_sha256':EARLY_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('233 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('251: three complete historical six-stage turn ends, one normal action held')


if __name__=='__main__':main()
