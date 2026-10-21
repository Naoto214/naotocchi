#!/usr/bin/env python3
"""Audit the four opportunities reached after the saved boundary correction."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_boundary_225 as boundary
import proxy_new_seed_mixed_replay_224 as states
import proxy_new_seed_followup_audit_213 as followup
import proxy_new_seed_next_response_audit_208 as next_response
import proxy_new_seed_followup_opportunity_189 as activation
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=boundary.OUTPUT
SOURCE_RAW_SHA256='8563a9890cafd46aff65c30940538d59453e599d16be0c36a1b9191a29edfda8'
OUTPUT=ROOT/'data/proxy-new-seed-current-audit-226-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_current_audit_226.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=boundary.SOURCE_RAW_SHA256 or \
            raw!=boundary.canonical_bytes(boundary.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('226 protected boundary/replay differs')
    proofs=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(rows)!=4 or any(boundary.validate_result(x) for x in proofs):
        raise ValueError('226 boundary integrity differs')
    return proofs,rows

def next_post_placement(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    if game['phase']!='post_placement_response' or ctx['window_kind']!='after_normal_action' or \
            ctx['consecutive_passes']!=1 or row['new_events'][0]['action_type']!='response_pass' or \
            state['pending_triggers'] or state['activation_zone']:
        raise ValueError('226 next placement response boundary differs')
    actor=ctx['priority_actor'];owner=game['players'][actor]
    projected=copy.deepcopy(state);removed=[];excluded=[];rows=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=rows.get(card_id)
        if entry is None:raise ValueError('226 registration missing')
        omission=hand.extra_hand_exclusion(card_id,entry,game,actor)
        if omission is None:
            action=next((x for x in entry['actions'] if x['action_type'] in
                         ('use_play','use_item','use_event')),None)
            if action is not None and owner['time']>=action['base_time_cost']:
                omission=conditional.conditional_exclusion(card_id,game,actor)
        if omission:
            removed.append({'source_instance_id':instance,**omission})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in owner['board']['companions']:
        card_id=game['cards'][instance]['card_id']
        section=hand.source_section('72-companion-26-card-text-draft.md',card_id)
        if card_id not in timing.TRIGGERS or \
                any(fragment not in section for fragment in timing.TRIGGERS[card_id][1:]) or \
                timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                               row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
            raise ValueError('226 companion response exclusion unproved')
        excluded.append({'source_instance_id':instance,'card_id':card_id,
                         'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
    partner=owner['board']['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        section=hand.source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id!='P-cat_ceo' or '交際を始めた時、発動する' not in section or \
                'たまご中は元の関係を保ち、こいびとの能力を無効に' not in \
                (ROOT/'66-relationship-start-and-romance-profile.md').read_text() or \
                owner['board']['main'] is not None:
            raise ValueError('226 partner response exclusion unproved')
        excluded.append({'source_instance_id':partner,'card_id':card_id,
                         'reason_code':'partner_ability_disabled_during_egg'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    projected['game_state']['phase']='response_window'
    projected['response_context']['window_kind']='turn_start'
    chance=start.enumerate_opportunity(projected,actor,rows)
    if not chance['candidate_set_complete'] or chance['legal_candidate_ids']!=['response-pass']:
        raise ValueError('226 next placement candidates incomplete')
    return {'candidate_ids':chance['legal_candidate_ids'],'candidate_set_complete':True,
            'hand_conditional_exclusions':removed,
            'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded}

def audit_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('226 saved state/boundary differs')
    state=row['final_continuation_state'];game=state['game_state']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('226 saved hash differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'verified_stop_reason_code':proof['corrected_stop_reason_code'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    reason=proof['corrected_stop_reason_code']
    if reason=='unproved_selected_board_ability_activation':
        found=activation.audit_route(row)
        if found['candidate_ids']!=['response-activate-ability-A-015#1'] or \
                found['next_opportunity']!='selected_board_ability_activation':
            raise ValueError('226 selected ability differs')
        return {**base,'next_opportunity':found['next_opportunity'],
                'candidate_ids':found['candidate_ids'],'candidate_set_complete':True,
                'source_instance_id':found['source_instance_id'],
                'public_top_card_preinspection':found['public_top_card_preinspection']}
    if game['phase']=='post_placement_response':found=next_post_placement(row)
    elif game['phase']=='turn_end_response':found=followup.audit_route(row)
    elif game['phase']=='response_window':found=next_response.audit_route(row)
    else:raise ValueError('226 phase unclassified')
    if found['candidate_ids']!=['response-pass'] or not found['candidate_set_complete']:
        raise ValueError('226 response pass incomplete')
    return {**base,'next_opportunity':'response_window','candidate_ids':found['candidate_ids'],
            'candidate_set_complete':True,
            'hand_conditional_exclusions':found['hand_conditional_exclusions'],
            'hand_other_exclusions':found['hand_other_exclusions'],
            'board_exclusions':found['board_exclusions']}

def validate_result(result):
    try:
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,proof) else ['226 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[audit_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or any(validate_result(x) for x in result):
        raise ValueError('226 reached opportunity differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('226 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('226: four reached opportunities complete')
if __name__=='__main__':main()
