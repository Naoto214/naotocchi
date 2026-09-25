#!/usr/bin/env python3
"""Prove current free development, paid item/pass, and chain pass choices."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_chain_normal_audit_191 as audits
import proxy_new_seed_ability_activation_190 as states
import proxy_new_seed_normal_restart_157 as free_choice
import proxy_normal_decision_hardening as priority
import proxy_normal_action_candidate_completeness as candidates

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='f6c89e4fafb932a9e31662851e1a40869846b1dcb3db3bdcbd477ee5cb32b68e'
OUTPUT=ROOT/'data/proxy-new-seed-current-choices-192-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_current_choices_192.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256:
        raise ValueError('192 protected audit/state raw differs')
    proof=json.loads(raw);original=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or original['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(original['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('192 current candidate proof differs')
    return proof,original


def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('192 source state/audit boundary differs')
    game=row['final_continuation_state']['game_state'];actor=game['turn_player']
    base={'path_id':row['path_id'],
          'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
          'new_events':0,'completed':False,'balance_sample_count':0}
    if proof['next_opportunity']=='response_window':
        if proof['candidate_ids']!=['response-pass'] or \
                game['phase']!='response_window' or \
                row['final_continuation_state']['response_context']['chain_status']!='building':
            raise ValueError('192 chain pass proof differs')
        return {**base,'next_opportunity':'response_window',
                'selected_candidate':'response-pass','resolution_mode':'response_unique',
                'selected_decision':None,'comparison_evidence':None}
    if proof['next_opportunity']!='normal_action' or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('192 normal choice proof incomplete')
    families={x['action_type'] for x in proof['legal_candidate_details']}
    if families=={'place_partner','play_main','pass'}:
        decision=free_choice.decide(row,proof)
        if decision['resolution_mode']!='safe_free_development' or \
                decision['selected_action']['action_type']!='place_partner':
            raise ValueError('192 safe free placement choice differs')
        return {**base,'next_opportunity':'normal_action',
                'selected_candidate':decision['selected_candidate'],
                'resolution_mode':decision['resolution_mode'],
                'selected_decision':decision,
                'comparison_evidence':decision['paid_birth_comparison']}
    if families!={'attach_item','pass'} or len(proof['candidate_ids'])!=2:
        raise ValueError('192 unclassified normal comparison')
    attach=next(x for x in proof['legal_candidate_details'] if x['action_type']=='attach_item')
    owner=game['players'][actor];source=attach['source_instance_id']
    card_id=game['cards'][source]['card_id']
    table=candidates.load_inputs()['candidate_table']
    entry=next(x for x in table['cards'] if x['card_id']==card_id)
    template=next(x for x in entry['actions'] if x['action_type']=='attach_item')
    section=(ROOT/'77-current-items-card-text-draft.md').read_text().split(
        f'### {card_id} — ',1)[1].split('\n### ',1)[0]
    if card_id!='I-bowtie' or template['base_time_cost']!=2 or \
            '自分のターン開始時、手札が2枚以下の場合' not in section or \
            owner['time']<2 or len(owner['hand'])<=2 or \
            game['phase']!='normal_action' or source not in owner['hand']:
        raise ValueError('192 item current effect/time proof differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,
            'value_comparison_to':{}}
    passing={**common,'candidate_id':'pass',
             'time_after_certain_resolution':owner['time'],
             'payment_time':0,'card_copy_id':''}
    paid={**common,'candidate_id':attach['candidate_id'],
          'time_after_certain_resolution':owner['time']-template['base_time_cost'],
          'payment_time':template['base_time_cost'],
          'card_copy_id':game['cards'][source]['card_copy_id']}
    comparison=priority.compare_candidates(passing,paid)
    if comparison['winner']!='left' or \
            comparison['decided_at']!='time_after_certain_resolution':
        raise ValueError('192 107/114 time comparison differs')
    return {**base,'next_opportunity':'normal_action',
            'selected_candidate':'pass','resolution_mode':'priority_unique',
            'selected_decision':None,
            'comparison_evidence':{'source_contracts':[107,114],
                                   'pass':passing,'attach_item':paid,
                                   'paid_vs_pass':comparison}}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,proof) else ['192 independent choice differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[audit_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('192 current choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('192 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('192: 1 free placement, 2 time-priority normal passes, 1 chain pass')


if __name__=='__main__':main()
