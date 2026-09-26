#!/usr/bin/env python3
"""Extend protected history and audit three normal actions and one turn end."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_260 as states
import proxy_new_seed_turn_end_proof_233 as baseline
import proxy_new_seed_turn_end_proof_203 as early
import proxy_new_seed_turn_end_audit_163 as board
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='85d17248bf23d57b514c236de82cc7d2e18500d207759439e36c11805acafb78'
BASELINE_RAW_SHA256='cb2dbc7dce2987f7e340500cc600650ce40c281dd8150439a82012f07b968a78'
EARLY_RAW_SHA256='a3b411c57e0c71226c8f31e442ca8c0c641ea19e6ef0d6ed52d543318c9fa2ee'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-261-20260926.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_261.v1'
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
        raise ValueError('261 protected 250/233/203 raw/canonical differs')
    current=json.loads(raw);history=json.loads(old);earliest=json.loads(first)
    if (len(current['results'])!=len(history['results'])!=len(earliest['results'])!=4 or
            any(states.validate_result(x) for x in current['results']) or
            any(baseline.validate_result(x) for x in history['results']) or
            any(early.validate_result(x) for x in earliest['results'])):
        raise ValueError('261 saved state/history inventory differs')
    return current,history,earliest


def audit_route(row,old):
    path=row['path_id'];state=row['final_continuation_state']
    if old['path_id']!=path:
        raise ValueError('261 baseline path differs')
    if state['game_state']['phase']=='normal_action':
        proof=normal.audit_route(row)
        if proof['next_opportunity']!='normal_action' or not proof['candidate_set_complete'] or \
                not all(proof['completeness_checks'].values()):
            raise ValueError('261 normal candidate set differs')
        return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
                'source_game_state_sha256':row['final_game_state_sha256'],
                'source_continuation_state_sha256':row['final_continuation_state_sha256'],
                'turn_end_set_complete':False,'next_opportunity':'normal_action',
                'candidate_ids':copy.deepcopy(proof['candidate_ids']),
                'candidate_set_complete':True,
                'legal_candidate_details':copy.deepcopy(proof['legal_candidate_details']),
                'completeness_checks':copy.deepcopy(proof['completeness_checks']),
                'board_exclusions':copy.deepcopy(proof['board_exclusions']),
                'new_events':0,'completed':False,'balance_sample_count':0}
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end':
        raise ValueError('261 current turn end boundary differs')
    seq=old['source_last_valid_event_seq'];game_sha=old['source_game_state_sha256']
    cont_sha=old['source_continuation_state_sha256']
    classified=copy.deepcopy(old['classified_events']);growth=copy.deepcopy(old['growth_trace'])
    event_counts={}
    for number in range(204,261):
        if number==241:continue
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError('261 checkpoint history file inventory differs')
        saved=next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id']==path)
        events=saved.get('new_events',[]);shots=saved.get('new_snapshots',[])
        if events==0:events=[]
        if shots==0:shots=[]
        if not isinstance(events,list) or not isinstance(shots,list) or len(events)!=len(shots):
            raise ValueError('261 checkpoint event/snapshot inventory differs')
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
                raise ValueError('261 historical event/snapshot/hash chain differs')
            now={actor:snap['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta={actor:now[actor]-growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or snap['continuation_state']['pending_triggers'] or \
                    (action=='resolve_board_ability' and snap['continuation_state']['activation_zone']):
                raise ValueError('261 historical growth/pending state differs')
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
    section=(ROOT/'74-partner-18-card-text-draft.md').read_text().split(
        '### P-cliff_goat — ',1)[1].split('\n### ',1)[0]
    if ('名前の異なるセカイへ変更した時' not in section or
            '初配置・同名上書き' not in section):
        raise ValueError('261 partner event timing differs')
    companion_text=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
        '### C-cat_friend — ',1)[1].split('\n### ',1)[0]
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in companion_text or
            '自分のターン終了時' in companion_text):
        raise ValueError('261 companion activated timing differs')
    registry=board.board.turn_end.BOARD_REGISTRY
    additions={
        'P-cliff_goat':('event_trigger_not_turn_end','74-partner-18-card-text-draft.md#P-cliff_goat'),
        'C-cat_friend':('activated_ability_not_turn_end','72-companion-26-card-text-draft.md#C-cat_friend')}
    existing={name:registry.get(name) for name in additions}
    if any(existing[name] is not None and existing[name]!=classification
           for name,classification in additions.items()):
        raise ValueError('261 board source classification conflict')
    try:
        registry.update(additions)
        with board.current_board_scope():result=precedent.audit_current_turn_end(stop,proof)
    finally:
        for name,value in existing.items():
            if value is None:registry.pop(name,None)
            else:registry[name]=value
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or \
            not all(result['completeness_checks'].values()):
        raise ValueError('261 six-stage turn end incomplete: '+repr(result['contract_stop_codes']))
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
        pool=earliest if result['path_id']=='probe-02-b-first' else history
        old=next(x for x in pool['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,old) else ['261 independent provenance differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    current,history,earliest=load_sources()
    rows=[audit_route(row,next(x for x in (earliest if row['path_id']=='probe-02-b-first' else history)['results'] if x['path_id']==row['path_id']))
          for row in current['results']]
    if len(rows)!=4 or sum(x['turn_end_set_complete'] for x in rows)!=1 or \
            any(validate_result(x) for x in rows):
        raise ValueError('261 one historical six-stage end and three normal actions differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'baseline_raw_sha256':BASELINE_RAW_SHA256,'early_raw_sha256':EARLY_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('233 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('261: one complete historical six-stage turn end, three normal actions')


if __name__=='__main__':main()
