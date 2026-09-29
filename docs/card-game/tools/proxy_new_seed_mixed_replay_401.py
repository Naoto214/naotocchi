#!/usr/bin/env python3
"""Replay contiguous, fully audited steps through one turn end per route."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_400 as source
import proxy_reached_mixed_contracts_401 as contracts
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_turn_end_proof_203 as terminal

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='dd83009fca60289dac8c54a3f7e4316bd886eb326f4baf38375e6ccb790d173a'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-401-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-401-20260930.json'
BASELINES={'probe-01-a-first':396,'probe-01-b-first':399,'probe-02-a-first':397,'probe-02-b-first':394}

def canonical_bytes(value):return contracts.canonical_bytes(value)
def load_rows():
    raw=source.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('401 source raw/canonical differs')
    rows=json.loads(raw)['results']
    if len(rows)!=4:raise ValueError('401 route count')
    return rows

def saved_history(path):
    number=BASELINES[path]
    filename=ROOT/f'data/proxy-new-seed-mixed-audit-{number}-20260929.json'
    raw=filename.read_bytes();data=json.loads(raw)
    if raw!=canonical_bytes(data):raise ValueError('401 baseline canonical differs')
    baseline=next(x for x in data['results'] if x['path_id']==path)
    constraints=next(x for x in json.loads(terminal.OUTPUT.read_bytes())['results'] if x['path_id']==path)
    if not constraints['turn_end_set_complete'] or constraints['growth_reach_100'] or constraints['active_expiring_effects'] or constraints['unresolved_codes']:raise ValueError('401 inherited terminal constraints differ')
    history=[]
    for checkpoint in range(number,401):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{checkpoint}-*.json'))
        filename=next((p for p in files if '-replay-' in p.name),None)
        if filename is None:raise ValueError('401 saved replay history missing')
        saved=next(x for x in json.loads(filename.read_bytes())['results'] if x['path_id']==path)
        events,shots=saved.get('new_events',[]) or [],saved.get('new_snapshots',[]) or []
        if len(events)!=len(shots):raise ValueError('401 saved history count differs')
        history.extend(zip(events,shots))
    return baseline,history,hashlib.sha256(raw).hexdigest()

def run_route(initial):
    row=copy.deepcopy(initial);all_events=[];all_shots=[];all_decisions=[];steps=[]
    baseline,history,baseline_hash=saved_history(row['path_id'])
    for _ in range(12):
        state=row['final_continuation_state'];phase=state['game_state']['phase'];ctx=state['response_context']
        if phase=='egg_exchange_choice':break
        if phase=='normal_action':
            proof=contracts.audit_normal(row);selected=contracts.choose_normal(row,proof)
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
    else:raise ValueError('401 scoped batch exceeded expected steps')
    if row['final_continuation_state']['game_state']['phase']!='egg_exchange_choice':raise ValueError('401 final opportunity differs')
    next_audit={**contracts.boundary(row),**eggs.audit_egg(row)}
    result={**row,**contracts.boundary(initial),'stop_reason_code':'checkpoint_boundary_next_egg_exchange','new_events':all_events,'new_snapshots':all_shots,'new_decisions':all_decisions}
    contracts.validate_chain(initial,result)
    audit={'path_id':initial['path_id'],'baseline_checkpoint':BASELINES[initial['path_id']],'baseline_raw_sha256':baseline_hash,'steps':steps,'next_opportunity_audit':next_audit}
    return audit,result

def build_reports():
    rows=load_rows();pairs=[run_route(row) for row in rows];audits=[x[0] for x in pairs];results=[x[1] for x in pairs]
    events=sum(len(x['new_events']) for x in results);decisions=sum(len(x['new_decisions']) for x in results)
    if events<15 or any(x['completed'] or x['balance_sample_count'] for x in results):raise ValueError('401 batch count/balance differs')
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_401.v1','results':audits},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_401.v1','new_decisions':decisions,'new_events':events,'new_snapshots':events,'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();a,r=build_reports()
    for path,value in ((AUDIT,a),(OUTPUT,r)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('401 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"401: four contiguous batches, {r['new_events']} events/snapshots verified")
if __name__=='__main__':main()
