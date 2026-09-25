#!/usr/bin/env python3
"""Reconstruct the public event history at all four new-seed turn ends."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_end_response_restart_161 as prior
import proxy_new_seed_turn_end_history_150 as precedent
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='3e06ea7472d549d17e1df2c289077adcc04df655a0dfd3bbd7c360e225e2eab2'
OUTPUT=ROOT/'data/proxy-new-seed-turn-end-history-162-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_turn_end_history_162.v1'

# Immutable artifacts are read independently; audit-only checkpoints have no
# transitions and are already checked by the 161 replay chain.
HISTORY=(
 ('proxy-independent-seed-probe-20260924.json','1a497209d56f605e474f136777c06a3260b731417ca7940bc361f72850457a6c'),
 ('proxy-start-response-138-20260924.json','4066a8307eeaeb7b11a473cbbdeba576cfcd2a0335b697ea1b24a7c02d52622c'),
 ('proxy-new-seed-normal-restart-141-20260924.json','5870424513be6d04660ab6bd0cf7f3fdac23fbb327216dc3d89056c933f7fcbb'),
 ('proxy-hit-blow-response-142-20260924.json','162f4de66bc0352b80e215f48a6651d00019c2897904c78d50023deda885b64b'),
 ('proxy-new-seed-response-restart-145-20260925.json','724f12b4bd38dc11bb2d4d672abf5cd753fca8daa110697e4f89499f087a9a8d'),
 ('proxy-new-seed-normal-restart-147-20260925.json','a61cde34884118abf5abf399cbc54e724970c981c87508802aec3b9662b3b0f8'),
 ('proxy-new-seed-response-restart-148-20260925.json','09f5dbbfad0329e35a9ee0b3bd64695c4b5f5ad2520cd8c9cda913faa6635d16'),
 ('proxy-new-seed-turn-end-restart-151-20260925.json','6055e248720f77734a5c4c35301deac91bfcccf5902a9b118bef6fb631d77bf5'),
 ('proxy-new-seed-egg-restart-152-20260925.json','69efab337597641c17ed027d1e67287399b5a622ca0d7fe301a3179a75eb3328'),
 ('proxy-new-seed-start-response-153-20260925.json','c6b84fe96db4075a8eaef71aab59fc007c2a7389ea5021451052bbcf1076dfd8'),
 ('proxy-new-seed-item-chain-154-20260925.json','18af9dafa10b699a28991c856381b98c1288e8999a9ff7f359aad6688b1f0843'),
 ('proxy-new-seed-chain-resolution-155-20260925.json','ad284fa608b04c8834894d232e9740930a8a8889d469366f980ef89dd7f9a2e9'),
 ('proxy-new-seed-normal-restart-157-20260925.json','733193d93553e8e83b055b8e1ac34d33101ba5d1ffae12222092846113932ab9'),
 ('proxy-new-seed-response-restart-158-20260925.json','57e2daa5f2f8f3f25e4f90ec989684c9f780bbd85973893d18a8151e3cb8b842'),
 ('proxy-new-seed-normal-restart-160-20260925.json','5737267da095d2d56690f7a07f9da0cb32a89f614d396d8e3014ef33416a2ed0'),
 ('proxy-new-seed-end-response-restart-161-20260925.json',SOURCE_RAW_SHA256),
)
PASSIVE={'turn_start_and_egg_draw','egg_exchange_bottom','response_pass',
         'normal_pass_end_request','turn_end_completed','place_companion','place_partner'}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def histories():
    result=[]
    for name,sha in HISTORY:
        raw=(ROOT/'data'/name).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('historical raw SHA differs: '+name)
        result.append(json.loads(raw))
    return result


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('161 protected replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('161 hash chain differs')
    return data


def route(report,path):
    rows=[x for x in report['results'] if x['path_id']==path]
    if len(rows)!=1:raise ValueError('missing or duplicate historical route')
    return rows[0]


def audit_route(source):
    path=source['path_id']; history=histories()
    opening=route(history[0],path);start.verify_source_route(opening)
    initial=opening['snapshots'];events=list(opening['events']);growth=[]
    if [s['seq'] for s in initial]!=[0,1,2] or [e['seq'] for e in events]!=[1,2]:
        raise ValueError('opening event sequence differs')
    game_sha=initial[0]['state_sha256'];cont_sha=None
    for i,snap in enumerate(initial):
        game=snap['state'];sha=start.opening._stop_state_sha256(game)
        if snap['state_sha256']!=sha or (i and (events[i-1]['state_before_sha256']!=game_sha or
                events[i-1]['state_after_sha256']!=sha)):
            raise ValueError('opening state hash chain differs')
        game_sha=sha
        growth.append({'event_seq':i,'growth':{a:game['players'][a]['growth'] for a in 'AB'}})
    classified=[]
    for index,report in enumerate(history[1:],1):
        matching=[x for x in report['results'] if x['path_id']==path]
        if not matching:
            if index==1 or index==len(history)-1:raise ValueError('missing required historical route')
            continue
        if len(matching)!=1:raise ValueError('duplicate historical route')
        row=matching[0]
        changes=row['events'] if index==1 else row.get('new_events',[])
        snaps=row['snapshots'] if index==1 else row.get('new_snapshots',[])
        if index==1:
            if snaps[0]['event_seq']!=2 or snaps[0]['game_state_sha256']!=game_sha:
                raise ValueError('138 opening handover differs')
            cont_sha=snaps[0]['continuation_state_sha256'];snaps=snaps[1:]
        if len(changes)!=len(snaps):raise ValueError('historical event/snapshot count differs')
        for event,snap in zip(changes,snaps):
            seq=len(events)+1
            if event['seq']!=seq or snap['event_seq']!=seq or \
                event['game_state_before_sha256']!=game_sha or \
                event['continuation_state_before_sha256']!=cont_sha or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                raise ValueError('historical dual SHA/seq chain differs')
            game=snap['game_state'];continuation=snap['continuation_state'];kind=event['action_type']
            if any(game['players'][a]['reservations'] for a in 'AB') or continuation['pending_triggers']:
                raise ValueError('historical reservation or pending trigger needs proof')
            before=growth[-1]['growth'];after={a:game['players'][a]['growth'] for a in 'AB'}
            if kind in PASSIVE:
                if before!=after:raise ValueError('passive event changed growth')
                if kind=='place_companion':
                    card=game['cards'][event['source_instance_id']]['card_id']
                    if card not in ('C-chicken','C-bat'):raise ValueError('companion source differs')
                if kind=='place_partner':
                    card=game['cards'][event['source_instance_id']]['card_id']
                    if card not in ('P-anglerfish','P-cliff_goat'):raise ValueError('partner source differs')
                reference='01-core-rules.md' if kind.startswith(('turn_','egg_')) else '119-response-window-contract.md'
            elif kind=='activate_response':
                if before!=after or not continuation['activation_zone']:
                    raise ValueError('response activation source differs')
                reference='119-response-window-contract.md'
            elif kind in ('resolve_play','resolve_item'):
                added=event['result']['growth_added'];actor=event['actor']
                if after[actor]!=before[actor]+added or any(after[a]!=before[a] for a in 'AB' if a!=actor):
                    raise ValueError('resolved growth differs')
                if kind=='resolve_play' and added not in (0,5) or \
                        kind=='resolve_item' and added!=0:
                    raise ValueError('unproved response outcome')
                reference='142-hit-blow-start-response-restart.md' if index==3 else '155-new-seed-chain-resolution.md'
            else:raise ValueError('unclassified historical event: '+kind)
            classified.append({'seq':seq,'action_type':kind,'source_reference':reference,
                               'growth_delta':{a:after[a]-before[a] for a in 'AB'}})
            growth.append({'event_seq':seq,'growth':after});events.append(event)
            game_sha=snap['game_state_sha256'];cont_sha=snap['continuation_state_sha256']
    if len(events)!=source['last_valid_event_seq'] or game_sha!=source['final_game_state_sha256'] or \
            cont_sha!=source['final_continuation_state_sha256'] or \
            source['final_continuation_state']['game_state']['phase']!='turn_end' or \
            source['final_continuation_state']['activation_zone']:
        raise ValueError('current turn-end history boundary differs')
    if any(value>=100 for row in growth for value in row['growth'].values()):
        raise ValueError('historical victory threshold reached')
    return {'path_id':path,'source_last_valid_event_seq':len(events),
            'source_game_state_sha256':game_sha,'source_continuation_state_sha256':cont_sha,
            'classified_events':classified,'growth_trace':growth,'growth_reach_100':[],
            'active_expiring_effects':[],'unresolved_codes':[],
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:return [] if result==audit_route(route(load_source(),result['path_id'])) else ['162 historical replay differs']
    except (ValueError,KeyError,TypeError,IndexError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('162 historical proof differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('162 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('162: 4 historical event/growth proofs, 0 events')


if __name__=='__main__':main()
