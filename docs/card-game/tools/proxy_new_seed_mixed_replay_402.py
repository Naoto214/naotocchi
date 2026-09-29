#!/usr/bin/env python3
"""Replay the reached A turns in one batch using existing 401 adapters."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_401 as source
import proxy_reached_mixed_contracts_401 as contracts
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_normal_trigger_audit_146 as table_source

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='78840ee72e3ab907c79cfa74869a52e8d0d633a071850efe38da2bf59e209cdb'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-402-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-402-20260930.json'
canonical_bytes=contracts.canonical_bytes

def load_rows():
    raw=source.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('402 source raw/canonical differs')
    rows=json.loads(raw)['results']
    if len(rows)!=4:raise ValueError('402 route count')
    return rows

def run_route(initial):
    row=copy.deepcopy(initial);all_events=[];all_shots=[];all_decisions=[];steps=[]
    baseline,history,baseline_hash=source.saved_history(row['path_id'])
    history+=list(zip(initial['new_events'],initial['new_snapshots']))
    for _ in range(14):
        state=row['final_continuation_state'];phase=state['game_state']['phase'];ctx=state['response_context']
        if phase=='egg_exchange_choice' and all_events:break
        if phase=='egg_exchange_choice':
            proof={**contracts.boundary(row),**eggs.audit_egg(row)}
            result=egg_replay.run_route(row);selected=copy.deepcopy(result['new_decisions'][0])
        elif phase=='normal_action':
            game=state['game_state'];actor=game['turn_player'];instance=game['players'][actor]['board']['partner']
            if instance is not None and game['cards'][instance]['card_id']=='P-anglerfish':
                with partner.partner_response_scope(table_source.normal.candidate.load_inputs()['candidate_table']):
                    proof=contracts.audit_normal(row)
            else:proof=contracts.audit_normal(row)
            selected=contracts.choose_normal(row,proof)
            result=contracts.normal_pass.run_route(row,selected,proof)
        elif phase=='turn_end':
            proof=contracts.extend_end_proof(row,baseline,history+list(zip(all_events,all_shots)))
            selected=None;result=contracts.replay_end(row,proof)
        elif phase=='response_window' and ctx['chain_status']=='resolving':
            proof={**contracts.boundary(row),'next_opportunity':'resolve_board_ability','source_window_kind':ctx['window_kind'],'activation_zone':copy.deepcopy(state['activation_zone'])}
            selected=None;result=contracts.replay_resolution(row)
        else:
            proof=contracts.audit_response(row);selected=contracts.choose_response(row,proof)
            result=contracts.replay_response(row,proof,selected)
        contracts.validate_chain(row,result)
        steps.append({'audit':proof,'selection':selected,'event_seqs':[x['seq'] for x in result['new_events']]})
        all_events.extend(result['new_events']);all_shots.extend(result['new_snapshots']);all_decisions.extend(result['new_decisions']);row=result
    else:raise ValueError('402 scoped batch exceeded expected steps')
    if (row['final_continuation_state']['game_state']['turn_player'],row['final_continuation_state']['game_state']['phase'])!=('B','egg_exchange_choice'):raise ValueError('402 final boundary differs')
    next_audit={**contracts.boundary(row),**eggs.audit_egg(row)}
    result={**row,**contracts.boundary(initial),'stop_reason_code':'checkpoint_boundary_next_egg_exchange','new_events':all_events,'new_snapshots':all_shots,'new_decisions':all_decisions}
    contracts.validate_chain(initial,result)
    return ({'path_id':initial['path_id'],'baseline_checkpoint':source.BASELINES[initial['path_id']],'baseline_raw_sha256':baseline_hash,'steps':steps,'next_opportunity_audit':next_audit},result)

def build_reports():
    rows=load_rows();pairs=[run_route(row) for row in rows];audits=[x[0] for x in pairs];results=[x[1] for x in pairs]
    events=sum(len(x['new_events']) for x in results);decisions=sum(len(x['new_decisions']) for x in results)
    if events<28 or any(x['completed'] or x['balance_sample_count'] for x in results):raise ValueError('402 batch count/balance differs')
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_402.v1','results':audits},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_402.v1','new_decisions':decisions,'new_events':events,'new_snapshots':events,'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();a,r=build_reports()
    for path,value in ((AUDIT,a),(OUTPUT,r)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('402 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"402: four A turns, {r['new_events']} events/snapshots verified")
if __name__=='__main__':main()
