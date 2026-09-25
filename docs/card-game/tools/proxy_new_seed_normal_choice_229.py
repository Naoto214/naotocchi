#!/usr/bin/env python3
"""Compare all reached paid normal actions against pass under 107/114."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_normal_audit_228 as audits
import proxy_new_seed_current_replay_227 as states
import proxy_normal_decision_hardening as priority
import proxy_normal_action_candidate_completeness as candidates
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='c723ff04102f243ecc534c6c3961acd6949112857428a2b313e74556e58d6a9b'
OUTPUT=ROOT/'data/proxy-new-seed-normal-choice-229-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_choice_229.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('229 protected audit/state raw differs')
    proofs=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(rows)!=4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('229 protected candidate inventory differs')
    return proofs,rows

def cost_and_effect(row,action):
    game=row['final_continuation_state']['game_state'];actor=game['turn_player']
    owner=game['players'][actor];instance=action['source_instance_id']
    if instance not in owner['hand'] or game['cards'][instance]['card_id']!=action['card_id']:
        raise ValueError('229 paid card source differs')
    card=action['card_id'];kind=action['action_type']
    if kind=='play_main':
        if action['candidate_variant']!='birth' or owner['board']['main'] is not None:
            raise ValueError('229 birth stage differs')
        birth=start.opening._main_birth_detail(instance,game['cards'][instance],
            candidates.load_inputs()['candidate_table'],owner['board'],owner['time'])
        if birth is None or birth['candidate_id']!=action['candidate_id']:
            raise ValueError('229 paid birth detail differs')
        cost=birth['payment_time']
        if card=='M-antlion-01':
            section=(ROOT/'55-insect-three-lines-card-text-draft.md').read_text().split(
                '## M-antlion-01 ',1)[1].split('\n## ',1)[0]
            if 'しかける' not in section or 'そのカードをプレイするための時を1少なく' not in section:
                raise ValueError('229 antlion future cost condition differs')
            ref='55-insect-three-lines-card-text-draft.md#M-antlion-01'
        elif card=='M-beetle-01':
            section=(ROOT/'31-beetle-stagbeetle-card-master-migration.md').read_text().split(
                '## M-beetle-01\n',1)[1].split('\n## ',1)[0]
            if '手札1枚を山札の一番下に置く。その後1枚引く' not in section:
                raise ValueError('229 beetle optional hand cycle differs')
            ref='31-beetle-stagbeetle-card-master-migration.md#M-beetle-01'
        else:raise ValueError('229 main effect unclassified')
    elif kind in ('place_world','set_item','attach_item'):
        entry=start.load_candidate_rows()[card]
        template=next(a for a in entry['actions'] if a['action_type']==kind)
        cost=template['base_time_cost']
        if kind=='place_world' and card=='W-city':
            section=(ROOT/'89-world-13-card-text-draft.md').read_text().split(
                '### W-city — ',1)[1].split('\n### ',1)[0]
            if owner['board']['world'] is not None or '合計が2枚になった時' not in section or \
                    '山札上1枚を見て' not in section:
                raise ValueError('229 world optional deck inspection differs')
            ref='89-world-13-card-text-draft.md#W-city'
        elif kind=='set_item' and card=='I-poop1':
            section=(ROOT/'77-current-items-card-text-draft.md').read_text().split(
                '### I-poop1 — ',1)[1].split('\n### ',1)[0]
            if owner['board']['main'] is not None or \
                    '相手がメインを除去する効果を発動した時' not in section:
                raise ValueError('229 item later response condition differs')
            ref='77-current-items-card-text-draft.md#I-poop1'
        elif kind=='attach_item' and card=='I-bowtie':
            section=(ROOT/'77-current-items-card-text-draft.md').read_text().split(
                '### I-bowtie — ',1)[1].split('\n### ',1)[0]
            if len(owner['hand'])<=2 or \
                    '自分のターン開始時、手札が2枚以下の場合' not in section:
                raise ValueError('229 bowtie start condition differs')
            ref='77-current-items-card-text-draft.md#I-bowtie'
        else:raise ValueError('229 paid permanent effect unclassified')
    else:raise ValueError('229 paid action unclassified')
    if not isinstance(cost,int) or cost<=0 or owner['time']<cost:
        raise ValueError('229 paid time differs')
    return cost,ref

def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('229 saved boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,
          'balance_sample_count':0}
    if proof['next_opportunity']=='response_window':
        if proof['candidate_ids']!=['response-pass']:
            raise ValueError('229 response not unique')
        return {**base,'selected_candidate':'response-pass',
                'resolution_mode':'response_unique','paid_comparisons':[]}
    if proof['next_opportunity']!='normal_action' or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('229 normal candidate completeness differs')
    game=row['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
    details=proof['legal_candidate_details']
    if [x['candidate_id'] for x in details]!=proof['candidate_ids'] or \
            sum(x['action_type']=='pass' for x in details)!=1:
        raise ValueError('229 normal candidate details differ')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    passed={**common,'candidate_id':'pass','time_after_certain_resolution':owner['time'],
            'payment_time':0,'card_copy_id':''}
    comparisons=[]
    for detail in details:
        if detail['action_type']=='pass':continue
        cost,reference=cost_and_effect(row,detail)
        score={**common,'candidate_id':detail['candidate_id'],
               'time_after_certain_resolution':owner['time']-cost,'payment_time':cost,
               'card_copy_id':game['cards'][detail['source_instance_id']]['card_copy_id']}
        comparison=priority.compare_candidates(passed,score)
        if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':
            raise ValueError('229 normal priority differs')
        comparisons.append({'candidate_id':detail['candidate_id'],'source_reference':reference,
                            'score':score,'comparison':comparison})
    if len(comparisons)!=len(details)-1:
        raise ValueError('229 paid candidate inventory differs')
    return {**base,'selected_candidate':'pass','resolution_mode':'priority_unique',
            'pass_score':passed,'paid_comparisons':comparisons,'source_contracts':[107,114]}

def validate_result(result):
    try:
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,proof) else ['229 independent choice differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[audit_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or sum(x['selected_candidate']=='pass' for x in result)!=3 or \
            any(validate_result(x) for x in result):
        raise ValueError('229 choice set differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('229 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('229: three normal passes and one response pass selected')
if __name__=='__main__':main()
