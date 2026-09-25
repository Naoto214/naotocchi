#!/usr/bin/env python3
"""Apply saved mixed choices to their original continuation states."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_223 as choices
import proxy_new_seed_mixed_audit_222 as audits
import proxy_new_seed_egg_replay_221 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=choices.OUTPUT
SOURCE_RAW_SHA256='6eb6a54d78a6871846cf0350d2501922af9492ff39629e9147959101bcfa9306'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-224-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_224.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();audit_raw=audits.OUTPUT.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(audit_raw).hexdigest()!=choices.SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=choices.canonical_bytes(choices.build_report()) or \
            audit_raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('224 protected source raw/canonical differs')
    proofs=json.loads(raw)['results'];inventory=json.loads(audit_raw)['results'];source=json.loads(saved)['results']
    if len(proofs)!=len(inventory)!=len(source)!=4 or any(choices.validate_result(x) for x in proofs):
        raise ValueError('224 protected source choices differ')
    return proofs,inventory,source

def run_route(row,proof,audit):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or \
            proof['candidate_ids']!=audit['candidate_ids'] or not audit['candidate_set_complete']:
        raise ValueError('224 source boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('224 source state hash differs')
    actor=state['response_context']['priority_actor'] if proof['selected_candidate'].startswith('response-') else state['game_state']['turn_player']
    events=[];shots=[]
    if proof['selected_candidate']=='response-pass':
        if proof['candidate_ids']!=['response-pass'] or proof['resolution_mode']!='response_unique':
            raise ValueError('224 response pass not unique')
        if row['stop_reason_code']=='unproved_next_turn_start_response_candidates':
            chance=precedent.opportunity(state,audit)
            order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
            decision=response.resolve_response_choice({'order_id':order,
                'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
            if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_unique':
                raise ValueError('224 reconstructed start response differs')
        elif row['stop_reason_code']=='unproved_post_placement_response_candidates':
            decision={'decision_kind':'response_window','resolution_mode':'response_unique',
                      'selected_candidate':'response-pass','legal_candidates':['response-pass'],
                      'candidate_set_complete':True,'actor':actor,
                      'reason_code':'only_complete_legal_candidate'}
        else:raise ValueError('224 response phase differs')
        after,event,snap=start._pass(state,actor)
        normal._verify_step(state,after,[event]);events=[event];shots=[snap]
        reason=('unproved_next_priority_response_candidates' if
                row['stop_reason_code']=='unproved_next_turn_start_response_candidates' else
                'unproved_current_normal_action_candidates')
    elif proof['selected_candidate']=='pass':
        if audit['next_opportunity']!='normal_action' or \
                proof['comparison']['decided_at']!='time_after_certain_resolution':
            raise ValueError('224 normal pass comparison differs')
        detail=next(x for x in audit['legal_candidate_details'] if x['candidate_id']=='pass')
        decision={'decision_kind':'normal_action','resolution_mode':'priority_unique',
                  'reason_code':'time_balance','strategic_unresolved':False,
                  'legal_candidates':copy.deepcopy(audit['candidate_ids']),
                  'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
                  'candidate_set_complete':True,'selected_candidate':'pass',
                  'selected_action':copy.deepcopy(detail),
                  'runner_up_candidates':[x for x in audit['candidate_ids'] if x!='pass'],
                  'seed_context':None,'seed_proof':None,
                  'priority_comparison':copy.deepcopy(proof['comparison'])}
        after,generated=normal.transition(state,decision,{'candidate_table':
            candidates.load_inputs()['candidate_table']})
        normal._verify_step(state,after,generated)
        if len(generated)!=1 or after['game_state']['phase']!='turn_end_response':
            raise ValueError('224 normal pass phase differs')
        events=[{k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}]
        shots=[snapshots.snapshot(after)];reason='unproved_turn_end_response_candidates'
    else:
        if row['stop_reason_code']!='unproved_next_turn_start_response_candidates' or \
                proof['resolution_mode']!='response_seeded_fallback' or \
                proof['selected_candidate']!=audit['board_candidate_details'][0]['candidate_id']:
            raise ValueError('224 selected board ability differs')
        decision=copy.deepcopy(proof['comparison']);after=state
        reason='unproved_selected_board_ability_activation'
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[decision],'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        proofs,inventory,source=load_sources()
        row=next(x for x in source if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        audit=next(x for x in inventory if x['path_id']==result['path_id'])
        if result!=run_route(row,proof,audit) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['224 independent replay differs']
        previous_game=row['final_game_state_sha256'];previous_state=row['final_continuation_state_sha256']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['game_state_before_sha256']!=previous_game or \
                    event['continuation_state_before_sha256']!=previous_state or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
                return ['224 event/snapshot chain differs']
            previous_game=event['game_state_after_sha256'];previous_state=event['continuation_state_after_sha256']
        return []
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    proofs,inventory,source=load_sources()
    rows=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']),
                    next(x for x in inventory if x['path_id']==row['path_id'])) for row in source]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('224 four mixed replays differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':4,'new_events':3,'new_snapshots':3,
            'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('224 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('224: three choices applied; one selected ability pending activation')

if __name__=='__main__':main()
