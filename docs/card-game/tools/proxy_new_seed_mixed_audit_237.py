#!/usr/bin/env python3
"""Audit three start responses and one normal action after egg exchanges."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_egg_replay_236 as states
import proxy_new_seed_mixed_replay_234 as previous
import proxy_new_seed_start_audit_206 as starts
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='62c02ddff63ba86ff0aae4554cc8db00557ebd9faa0e6f37f824b0470ade54d9'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-237-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_237.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();old=previous.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(old).hexdigest()!=states.audits.SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()) or \
            old!=previous.canonical_bytes(previous.build_report()):
        raise ValueError('237 protected 236/234 source differs')
    rows=json.loads(raw)['results'];prior=json.loads(old)['results']
    if len(rows)!=len(prior)!=4 or any(states.validate_result(x) for x in rows):
        raise ValueError('237 source inventory differs')
    return rows,prior

def audit_route(row,old):
    state=row['final_continuation_state'];game=state['game_state']
    if old['path_id']!=row['path_id'] or \
            start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('237 state/hash boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if row['stop_reason_code']=='unproved_current_normal_action_candidates':
        proof=normal.audit_route(row)
        if proof['next_opportunity']!='normal_action' or \
                not proof['candidate_set_complete'] or \
                not all(proof['completeness_checks'].values()):
            raise ValueError('237 normal action incomplete')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
                'legal_candidate_details':proof['legal_candidate_details'],
                'completeness_checks':proof['completeness_checks'],
                'board_exclusions':proof['board_exclusions']}
    if row['stop_reason_code']!='unproved_next_turn_start_response_candidates' or \
            old['stop_reason_code']!='unproved_current_egg_exchange_choice' or \
            game['phase']!='response_window':
        raise ValueError('237 start response boundary differs')
    working=copy.deepcopy(row);actor=game['turn_player'];owner=game['players'][actor]
    extra=[];entries=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];actions=entries[card_id]['actions']
        if len(actions)>1 and any(x['action_type']=='place_companion' for x in actions):
            if not any(x['action_type']=='activate_companion_ability' and
                       x['prerequisites'].startswith('on companion board;') for x in actions):
                raise ValueError('237 companion source-zone boundary differs')
            section=starts.source_section('72-companion-26-card-text-draft.md',card_id)
            if '捨て札' not in section or instance in owner['board']['companions']:
                raise ValueError('237 hand companion ability zone differs')
            extra.append({'source_instance_id':instance,'card_id':card_id,
                          'reason_code':'board_only_ability_source_in_hand',
                          'source_reference':'72-companion-26-card-text-draft.md#'+card_id})
        elif owner['board']['main'] is None and len(actions)==1 and \
                actions[0]['action_type'] in ('use_play','use_item','use_event') and \
                actions[0]['target_rule']=='one own main' and \
                'own main exists' in actions[0]['prerequisites']:
            ref=actions[0]['source_text_reference'];filename,section_id=ref.split('#',1)
            if section_id!=card_id or '自分のメイン1枚を対象' not in starts.source_section(filename,card_id):
                raise ValueError('237 own-main target source text differs')
            extra.append({'source_instance_id':instance,'card_id':card_id,
                          'reason_code':'requires_own_main_target',
                          'source_reference':ref})
        elif card_id=='G-animal-shogi':
            section=starts.source_section('83-play-batch-3-card-text-draft.md',card_id)
            if '自分の捨て札のなかま1枚を対象' not in section or \
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('237 shogi discarded companion target differs')
            extra.append({'source_instance_id':instance,'card_id':card_id,
                          'reason_code':'requires_own_discarded_companion',
                          'source_reference':'83-play-batch-3-card-text-draft.md#'+card_id})
        if extra and extra[-1]['source_instance_id']==instance:
            working['final_continuation_state']['game_state']['players'][actor]['hand'].remove(instance)
    proof=starts.audit_route(working,old)
    if not proof['candidate_set_complete'] or \
            proof['candidate_ids']!=['response-pass']:
        raise ValueError('237 start response candidate set differs')
    return {**base,'next_opportunity':'response_window',
            'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
            'hand_candidate_ids':proof['hand_candidate_ids'],
            'hand_conditional_exclusions':extra+proof['hand_conditional_exclusions'],
            'hand_other_exclusions':proof['hand_other_exclusions'],
            'board_candidate_details':proof['board_candidate_details'],
            'board_exclusions':proof['board_exclusions']}

def validate_result(result):
    try:
        rows,old=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        prior=next(x for x in old if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,prior) else ['237 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    rows,old=load_sources()
    result=[audit_route(row,next(x for x in old if x['path_id']==row['path_id'])) for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('237 mixed opportunity differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('237 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('237: three start responses and one normal action complete')
if __name__=='__main__':main()
