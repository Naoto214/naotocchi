#!/usr/bin/env python3
"""Close three start responses and activate one selected quick-use item."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_response_audit_169 as prior
import proxy_new_seed_start_restart_168 as states
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as hit
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='dcecada271126d6f87fda9744182fc0d1de02432c5f8fb08388c2fd33f793d1f'
OUTPUT=ROOT/'data/proxy-new-seed-next-response-restart-170-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_next_response_restart_170.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('169 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('169 opportunity proof differs')
    return data


@lru_cache(maxsize=1)
def source_states():
    raw=states.OUTPUT.read_bytes()
    if raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('168 protected replay differs')
    data=json.loads(raw)
    if any(states.validate_result(x) for x in data['results']):
        raise ValueError('168 current state/hash differs')
    return data['results']


def snapshot(state):
    return {'event_seq':state['last_event_seq'],'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def activate_quick_item(before,decision):
    action=decision['selected_action'];ctx=before['response_context'];actor=ctx['priority_actor']
    if action['candidate_family']!='hand_quick_use' or action['action_type']!='use_item' or \
            action['card_id']!='I-c_coin2' or action['base_time_cost']!=1 or \
            action['target_instance_ids']!=[] or action['candidate_variant'] is not None or \
            action['candidate_id']!=decision['selected_candidate'] or \
            start.response_id('use_item',action['source_instance_id'])!=action['candidate_id'] or \
            ctx['window_kind']!='turn_start' or ctx['chain_status']!='empty' or \
            ctx['chain_links'] or ctx['consecutive_passes']!=0 or \
            before['pending_triggers'] or before['activation_zone']:
        raise ValueError('170 empty-chain item activation boundary differs')
    section=(ROOT/'77-current-items-card-text-draft.md').read_text().split(
        '### I-c_coin2 — ',1)[1].split('\n### ',1)[0]
    if '時: 1 / 使用方法: すぐつかう' not in section or \
            '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section:
        raise ValueError('170 item source text differs')
    player=before['game_state']['players'][actor];source=action['source_instance_id']
    if source not in player['hand'] or player['time']<1 or not player['deck'] or \
            before['game_state']['cards'][source]['card_id']!=action['card_id']:
        raise ValueError('170 item source identity/time/deck differs')
    after=copy.deepcopy(before);owner=after['game_state']['players'][actor]
    owner['time']-=1;owner['hand'].remove(source)
    seq=before['last_event_seq']+1;link_id=f'response-link-{seq}-{source}'
    link={'link_id':link_id,'action_type':'use_item','actor':actor,
          'card_id':action['card_id'],'card_copy_id':action['card_copy_id'],
          'source_instance_id':source,'target_instance_ids':[],
          'candidate_variant':None,'payment':{'time':1},
          'source_references':copy.deepcopy(action['source_references'])}
    after['activation_zone'].append(link)
    transitioned=hit._turn_start_transition(before,{'kind':'activate','actor':actor,'link_id':link_id})
    response._apply_transition_result(after,transitioned)
    after['last_event_seq']=seq;after['continuation_state_sha256']=start._hash(after)
    event={'seq':seq,'action_type':'activate_response','actor':actor,
           'selected_candidate':action['candidate_id'],'source_instance_id':source,
           'candidate_variant':None,'payment':{'time':1},'target_instance_ids':[],
           'chain_link_id':link_id,
           'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    # 154 records an activated card in the chain activation zone. The normal
    # board-zone invariant applies again after the link resolves, not here.
    return after,event


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('168/169 current state boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('168 continuation hash differs')
    decisions=[]
    if proof['next_opportunity']=='response_window':
        actor=state['response_context']['priority_actor'];projected=copy.deepcopy(state)
        projected['game_state']['players'][actor]['board']['companions']=[]
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
        chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
        if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
                not chance['candidate_set_complete']:
            raise ValueError('169 next response proof differs')
        order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
        decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
            'round':state['game_state']['round']},chance)
        if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
            raise ValueError('170 second response pass not unique')
        decision['pre_game_state_sha256']=row['final_game_state_sha256']
        decision['pre_continuation_state_sha256']=row['final_continuation_state_sha256']
        decision['event_seq']=row['last_valid_event_seq']
        after,event,_=start._pass(state,actor)
        normal._verify_step(state,after,[event]);decisions=[decision]
        reason='unproved_current_normal_action_candidates'
    else:
        if proof['next_opportunity']!='selected_quick_item_activation':
            raise ValueError('170 unclassified current opportunity')
        decision=row['new_decisions'][-1]
        if decision['selected_candidate']!=proof['candidate_ids'][0]:
            raise ValueError('169 selected item differs')
        after,event=activate_quick_item(state,decision)
        reason='unproved_current_chain_response_or_resolution'
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':decisions,
            'new_events':[event],'new_snapshots':[snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        row=next(x for x in source_states() if x['path_id']==result['path_id'])
        proof=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['170 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['170 event/snapshot hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[run_route(row,proof) for row,proof in zip(source_states(),load_source()['results'])]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('170 response restart differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in rows),
            'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('170 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('170: 3 second passes and 1 empty-chain item activation')


if __name__=='__main__':main()
