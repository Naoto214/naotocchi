#!/usr/bin/env python3
"""Compare two reached paid normal actions to passing under priority rules."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_audit_198 as audits
import proxy_new_seed_followup_pass_197 as states
import proxy_new_seed_turn_end_replay_185 as turn_start
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='b73d57575a7d9cc041b42472cebf1b6b5674c0867a65c70433cc7ba7d2409f98'
OUTPUT=ROOT/'data/proxy-new-seed-normal-choice-199-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_choice_199.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('199 protected audit/state raw differs')
    proof=json.loads(raw);source=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or source['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('199 normal proof/source state differs')
    return proof,source


def no_card_play_since_turn_start(row,actor):
    raw=turn_start.OUTPUT.read_bytes()
    if raw!=turn_start.canonical_bytes(turn_start.build_report()):
        raise ValueError('199 protected previous turn start differs')
    old=next(x for x in json.loads(raw)['results'] if x['path_id']==row['path_id'])
    initial=old['new_events'][-1]
    if initial['action_type']!='turn_start_and_egg_draw' or initial['actor']!=actor:
        raise ValueError('199 current actor start history differs')
    seq=old['last_valid_event_seq']
    game=old['final_game_state_sha256'];cont=old['final_continuation_state_sha256']
    events=[]
    for number in range(186,198):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError('199 saved checkpoint history missing')
        current=next(x for x in json.loads(files[0].read_bytes())['results']
                     if x['path_id']==row['path_id'])
        batch=current.get('new_events',[])
        if batch==0:batch=[]
        if not isinstance(batch,list):raise ValueError('199 history event inventory differs')
        for event in batch:
            if event['seq']!=seq+1 or event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont:
                raise ValueError('199 current turn history chain differs')
            seq=event['seq'];game=event['game_state_after_sha256']
            cont=event['continuation_state_after_sha256'];events.append(event)
    if seq!=row['last_valid_event_seq'] or game!=row['final_game_state_sha256'] or \
            cont!=row['final_continuation_state_sha256'] or \
            any(event['action_type'] not in ('egg_exchange_bottom','response_pass',
                                            'activate_response','resolve_board_ability')
                for event in events):
        raise ValueError('199 no-card-play since turn start not proved')
    return {'source_event_seq':initial['seq'], 'classified_events':len(events),
            'cards_played':0}


def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('199 saved normal state/audit boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if proof['next_opportunity']=='turn_end_provenance':
        return {**base,'selected_candidate':None,'comparison':None,
                'next_opportunity':'turn_end_provenance','candidate_ids':[]}
    if proof['next_opportunity']!='normal_action' or not proof['candidate_set_complete'] or \
            not all(proof['completeness_checks'].values()) or \
            len(proof['legal_candidate_details'])!=2:
        raise ValueError('199 paid normal choice boundary differs')
    game=row['final_continuation_state']['game_state'];actor=game['turn_player']
    owner=game['players'][actor]
    paid=next(x for x in proof['legal_candidate_details'] if x['action_type']!='pass')
    if {x['action_type'] for x in proof['legal_candidate_details']} not in \
            ({'play_main','pass'},{'place_world','pass'}) or \
            paid['source_instance_id'] not in owner['hand'] or \
            owner['board']['main'] is not None or owner['board']['world'] is not None:
        raise ValueError('199 unclassified paid action or board')
    card_id=paid['card_id'];registered=start.load_candidate_rows()[card_id]
    if paid['action_type']=='play_main':
        section=(ROOT/'55-insect-three-lines-card-text-draft.md').read_text().split(
            f'## {card_id} ',1)[1].split('\n## ',1)[0]
        if card_id!='M-antlion-01' or paid['candidate_variant']!='birth' or \
                'しかける' not in section or 'そのカードをプレイするための時を1少なく' not in section:
            raise ValueError('199 main certain effect differs')
        table=candidates.load_inputs()['candidate_table']
        birth=start.opening._main_birth_detail(paid['source_instance_id'],
            game['cards'][paid['source_instance_id']],table,owner['board'],owner['time'])
        if birth is None or birth['candidate_id']!=paid['candidate_id']:
            raise ValueError('199 paid birth detail differs')
        cost=birth['payment_time']
    else:
        section=(ROOT/'89-world-13-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        template=next(x for x in registered['actions'] if x['action_type']=='place_world')
        if card_id!='W-city' or paid['candidate_variant']!='empty_world_slot' or \
                '合計が2枚になった時' not in section or \
                'このカード自身を出した場合も数える' not in section:
            raise ValueError('199 world certain effect differs')
        no_card_play_since_turn_start(row,actor)
        cost=template['base_time_cost']
    if not isinstance(cost,int) or cost<=0 or owner['time']<cost:
        raise ValueError('199 paid time proof differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    passed={**common,'candidate_id':'pass','time_after_certain_resolution':owner['time'],
            'payment_time':0,'card_copy_id':''}
    paid_score={**common,'candidate_id':paid['candidate_id'],
                'time_after_certain_resolution':owner['time']-cost,'payment_time':cost,
                'card_copy_id':game['cards'][paid['source_instance_id']]['card_copy_id']}
    comparison=priority.compare_candidates(passed,paid_score)
    if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':
        raise ValueError('199 priority paid/pass comparison differs')
    return {**base,'selected_candidate':'pass','comparison':comparison,
            'priority_scores':{'pass':passed,'paid':paid_score},
            'next_opportunity':'selected_normal_pass',
            'candidate_ids':copy.deepcopy(proof['candidate_ids'])}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,proof) else ['199 independent priority proof differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[audit_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(x['selected_candidate']=='pass' for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('199 two paid normal choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('199 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('199: two paid actions lose to normal pass on certain time')


if __name__=='__main__':main()
