#!/usr/bin/env python3
"""Checkpoint 142: resolve the selected start response through a recorded chain."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_restart_141 as prior
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as seeded
import proxy_response_window_contract as response


ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='5870424513be6d04660ab6bd0cf7f3fdac23fbb327216dc3d89056c933f7fcbb'
OUTPUT=ROOT/'data/proxy-hit-blow-response-142-20260924.json'
SCHEMA='naotocchi.card_game.proxy_hit_blow_response.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256:
        raise ValueError('141 protected raw SHA differs')
    return copy.deepcopy(_verified_source(raw))


@lru_cache(maxsize=1)
def _verified_source(raw):
    if raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('141 protected raw or independent replay differs')
    report=json.loads(raw)
    if report['schema']!=prior.SCHEMA or report['planned']!=4:
        raise ValueError('141 protected report shape differs')
    if any(prior.validate_result(row) for row in report['results']):
        raise ValueError('141 protected event/hash link differs')
    return report


def opening_state_and_choice(row):
    sources={x['path_id']:x for x in prior.prior.load_source()['results']}
    base=sources[row['path_id']]
    if base['last_valid_event_seq']!=2 or base['stop_reason_code']!='unproved_start_quick_use_activation_resolution' or \
            row['source_last_valid_event_seq']!=2 or row['final_continuation_state']!=base['final_continuation_state'] or \
            row['final_game_state_sha256']!=base['final_game_state_sha256'] or \
            row['final_continuation_state_sha256']!=base['final_continuation_state_sha256'] or row['new_events']:
        raise ValueError('selected start response source differs')
    decision=base['decisions'][-1]
    state=copy.deepcopy(base['final_continuation_state'])
    state.update({'source_event_seq':2,'last_event_seq':2,
                  'source_game_state_sha256':base['final_game_state_sha256'],
                  'continuation_state_sha256':base['final_continuation_state_sha256']})
    if decision['selected_candidate']=='response-pass' or decision['pre_game_state_sha256']!=base['final_game_state_sha256'] or \
            decision['pre_continuation_state_sha256']!=base['final_continuation_state_sha256'] or \
            start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('138 declaration decision boundary differs')
    actor=state['response_context']['priority_actor'];rows=start.load_candidate_rows()
    opportunity=start.enumerate_opportunity(state,actor,rows)
    original=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])
    independent=seeded.resolve_response_choice({'order_id':original['order_id'],
                                                  'actor_turn_index':1,'round':1},opportunity)
    for key in ('selected_candidate','selected_action','legal_candidate_ids','resolution_mode','seed_proof'):
        if decision.get(key)!=independent.get(key):
            raise ValueError('138 response selection changed')
    return state,decision


def _turn_start_transition(before, action):
    if before['response_context']['window_kind']!='turn_start' or \
            before['response_context']['source_phase']!='response_window' or \
            before['response_context']['phase']!='response_window' or \
            before['game_state']['phase']!='response_window' or before['return_target'] not in \
            ('normal_action_opportunity',None):
        raise ValueError('start response window provenance differs')
    # 119's published transition domain contains only after_normal_action.
    # Reuse its shared priority/chain proof with a temporary projection; the
    # persisted response_context.window_kind remains turn_start throughout.
    projected=seeded._response_transition_context(before)
    projected['window_kind']='after_normal_action'
    transitioned=response.transition_response_window(projected,action)
    if response.validate_response_transition(projected,action,transitioned):
        raise ValueError('119 projected priority/chain transition differs')
    return transitioned


def activate(before, decision):
    action=decision['selected_action'];ctx=before['response_context'];actor=ctx['priority_actor']
    rows=start.load_candidate_rows();opportunity=start.enumerate_opportunity(before,actor,rows)
    if not opportunity['candidate_set_complete'] or action not in opportunity['legal_candidate_details'] or \
            action['candidate_id']!=decision['selected_candidate'] or action['action_type']!='use_play' or \
            action['card_id']!='G-hit-blow' or action['target_instance_ids']!=[]:
        raise ValueError('selected quick-use candidate identity differs')
    variant=action['candidate_variant'];source=action['source_instance_id']
    if variant not in start.VARIANTS or start.response_id('use_play',source,variant=variant,
          registered_variants=list(start.VARIANTS))!=action['candidate_id']:
        raise ValueError('registered declaration or response ID differs')
    player=before['game_state']['players'][actor]
    if source not in player['hand'] or before['game_state']['cards'][source] != {
            'card_id':action['card_id'],'card_copy_id':action['card_copy_id'],
            'initial_instance_id':source} or not player['deck']:
        raise ValueError('source hand/card or nonempty deck proof differs')
    cost=action['base_time_cost']
    if type(cost)!=int or cost!=1 or player['time']<cost or ctx['chain_links'] or before['activation_zone']:
        raise ValueError('activation cost or chain status differs')
    after=copy.deepcopy(before);owner=after['game_state']['players'][actor]
    owner['time']-=cost;owner['hand'].remove(source)
    seq=before['last_event_seq']+1;link_id=f'response-link-{seq}-{source}'
    link={'link_id':link_id,'action_type':action['action_type'],'actor':actor,
          'card_id':action['card_id'],'card_copy_id':action['card_copy_id'],
          'source_instance_id':source,'target_instance_ids':[],
          'candidate_variant':variant,'payment':{'time':cost},
          'source_references':copy.deepcopy(action['source_references'])}
    after['activation_zone'].append(link)
    action_transition={'kind':'activate','actor':actor,'link_id':link_id}
    transitioned=_turn_start_transition(before,action_transition)
    seeded._apply_transition_result(after,transitioned)
    after['last_event_seq']=seq;after['continuation_state_sha256']=start._hash(after)
    event={'seq':seq,'action_type':'activate_response','actor':actor,
           'selected_candidate':action['candidate_id'],'source_instance_id':source,
           'candidate_variant':variant,'payment':{'time':cost},'target_instance_ids':[],
           'chain_link_id':link_id,'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    return after,event


def apply_hit_blow_effect(state, link):
    if (link['action_type'],link['card_id'])!=('use_play','G-hit-blow') or \
            link['candidate_variant'] not in start.VARIANTS or link['target_instance_ids']!=[] or \
            link['payment']!={'time':1}:
        raise ValueError('unsupported play resolution link')
    actor=link['actor'];player=state['game_state']['players'][actor]
    if not player['deck'] or link not in state['activation_zone']:
        raise ValueError('resolution source or deck missing')
    table=start.load_candidate_rows()
    revealed=player['deck'].pop(0)
    card=state['game_state']['cards'][revealed]
    registered=table.get(card['card_id'])
    if registered is None or registered['card_type'] not in start.VARIANTS:
        raise ValueError('revealed card category unregistered')
    matched=registered['card_type']==link['candidate_variant']
    if matched:
        player['hand'].append(revealed);player['growth']+=5;drawn=revealed
    else:
        player['deck'].append(revealed)
        drawn=player['deck'].pop(0)
        player['hand'].append(drawn)
    state['activation_zone'].remove(link)
    player['discard'].append(link['source_instance_id'])
    return {'declared_type':link['candidate_variant'],'revealed_instance_id':revealed,
            'revealed_card_type':registered['card_type'],'declaration_matched':matched,
            'drawn_instance_id':drawn,'growth_added':5 if matched else 0,
            'source_destination':'discard'}


def _snapshot(state):
    return {'event_seq':state['last_event_seq'],'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def resolve_link(before):
    if before['response_context']['chain_status']!='resolving' or \
            len(before['response_context']['chain_links'])!=1 or len(before['activation_zone'])!=1 or \
            before['pending_triggers']:
        raise ValueError('unproved chain resolution shape')
    link=copy.deepcopy(before['activation_zone'][0]);link_id=link['link_id']
    if before['response_context']['chain_links']!=[link_id]:
        raise ValueError('reverse chain resolution order differs')
    after=copy.deepcopy(before)
    result=apply_hit_blow_effect(after,link)
    after['response_context']['chain_links'].remove(link_id)
    after['response_context']['chain_status']='empty'
    after['response_context']['consecutive_passes']=0
    after['return_target']='normal_action_opportunity'
    after['game_state']['phase']='normal_action'
    after['last_event_seq']+=1
    after['continuation_state_sha256']=start._hash(after)
    event={'seq':after['last_event_seq'],'action_type':'resolve_play','actor':link['actor'],
           'source_instance_id':link['source_instance_id'],'chain_link_id':link_id,
           'candidate_variant':link['candidate_variant'],'payment':copy.deepcopy(link['payment']),
           'result':result,'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    return after,event


def _append(state,events,snapshots,event):
    events.append(copy.deepcopy(event));snapshots.append(_snapshot(state))


def pass_start_chain(before, decision):
    if decision['selected_candidate']!='response-pass' or \
            decision['selected_action']['action_type']!='response_pass':
        raise ValueError('unproved response pass detail')
    actor=decision['actor']
    transitioned=_turn_start_transition(before,{'kind':'response_pass','actor':actor})
    after=copy.deepcopy(before)
    seeded._apply_transition_result(after,transitioned)
    after['last_event_seq']+=1
    after['continuation_state_sha256']=start._hash(after)
    event={'seq':after['last_event_seq'],'action_type':'response_pass','actor':actor,
           'selected_candidate':'response-pass',
           'game_state_before_sha256':start.opening._stop_state_sha256(before['game_state']),
           'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
           'continuation_state_before_sha256':before['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    return after,event


def run_route(row):
    source=load_source()
    originals={x['path_id']:x for x in source['results']}
    if row['path_id'] not in originals or row!=originals[row['path_id']]:
        raise ValueError('141 source replay differs')
    events=[];snapshots=[];decisions=[];reason=row['stop_reason_code']
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if reason=='unproved_start_quick_use_activation_resolution':
        state,choice=opening_state_and_choice(row)
        state,event=activate(state,choice);_append(state,events,snapshots,event)
        original=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])
        while state['response_context']['chain_status']=='building':
            actor=state['response_context']['priority_actor']
            opportunity=start.enumerate_opportunity(state,actor,start.load_candidate_rows())
            if opportunity['legal_candidate_ids']!=['response-pass']:
                raise ValueError('unexpected quick-use choice requires separate proof')
            decision=seeded.resolve_response_choice({'order_id':original['order_id'],
                'actor_turn_index':1,'round':1},opportunity)
            if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
                raise ValueError('response pass was not uniquely proved')
            decision['pre_game_state_sha256']=start.opening._stop_state_sha256(state['game_state'])
            decision['pre_continuation_state_sha256']=state['continuation_state_sha256']
            decision['event_seq']=state['last_event_seq']
            decisions.append(decision)
            state,event=pass_start_chain(state,decision)
            _append(state,events,snapshots,event)
        state,event=resolve_link(state);_append(state,events,snapshots,event)
        reason='unproved_post_resolution_normal_action_candidates'
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),'stop_reason_code':reason,
            'new_decisions':decisions,'new_events':events,'new_snapshots':snapshots,
            'completed':False,'balance_sample_count':0}


def validate_result(row):
    try:
        source=load_source()
        origin=next(x for x in source['results'] if x['path_id']==row['path_id'])
        if row!=run_route(origin) or len(row['new_events'])!=len(row['new_snapshots']) or \
                row['last_valid_event_seq']!=origin['last_valid_event_seq']+len(row['new_events']):
            return ['142 independent route replay or event count differs']
        game=origin['final_game_state_sha256'];cont=origin['final_continuation_state_sha256']
        for offset,(event,snapshot) in enumerate(zip(row['new_events'],row['new_snapshots']),1):
            if event['seq']!=origin['last_valid_event_seq']+offset or \
                    event['game_state_before_sha256']!=game or event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snapshot['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snapshot['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snapshot['game_state'])!=snapshot['game_state_sha256'] or \
                    start.canonical_sha256(snapshot['continuation_state'])!=snapshot['continuation_state_sha256']:
                return ['142 event/snapshot hash link differs']
            game,cont=event['game_state_after_sha256'],event['continuation_state_after_sha256']
        if game!=row['final_game_state_sha256'] or cont!=row['final_continuation_state_sha256']:
            return ['142 terminal hash differs']
        return []
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def build_report():
    source=load_source()
    results=[run_route(row) for row in source['results']]
    if any(validate_result(row) for row in results):raise ValueError('142 independent replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in results),
            'new_events':sum(len(x['new_events']) for x in results),
            'new_snapshots':sum(len(x['new_snapshots']) for x in results),
            'independent_balance_sample_count':0,'results':results}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('142 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('142: 4 planned, 4 response events, 0 completed')


if __name__=='__main__':main()
