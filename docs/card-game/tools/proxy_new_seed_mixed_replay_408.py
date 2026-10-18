#!/usr/bin/env python3
"""Resume the remaining R10 B turns through the existing407 contracts."""
import argparse
import hashlib
import json
import proxy_new_seed_mixed_replay_407 as source

contracts=source.contracts
ROOT=source.ROOT
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-408-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-408-20260930.json'
SOURCE_SHA='ea0070f04b2b23d9bd62a9b078ae3bdbd5a947085b18908cef649ebc42617ea1'
canonical_bytes=source.canonical_bytes

def load_rows():
    raw=source.OUTPUT.read_bytes();data=json.loads(raw)
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=canonical_bytes(data):raise ValueError('408 saved source raw/canonical differs')
    rows=data['results']
    if len(rows)!=4 or len({r['path_id'] for r in rows})!=4:raise ValueError('408 source routes differ')
    return rows

def saved_history(path):
    initial=next(r for r in load_rows() if r['path_id']==path)
    baseline,history,digest=source.saved_history(path)
    history+=list(zip(initial['new_events'],initial['new_snapshots']))
    source.verify_history(initial,baseline,history)
    return baseline,history,digest

def build_reports():
    pairs=[source.run_route(row,history_loader=saved_history) for row in load_rows()]
    results=[p[1] for p in pairs];count=sum(len(r['new_events']) for r in results)
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':sum(r['completed'] for r in results),'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_408.v1','results':[p[0] for p in pairs]},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_408.v1','new_events':count,'new_snapshots':count,'new_decisions':sum(len(r['new_decisions']) for r in results),'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    audit,report=build_reports()
    for path,value in ((AUDIT,audit),(OUTPUT,report)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('408 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"408: four routes, {report['new_events']} event/snapshot pairs, completed {report['completed']}")
if __name__=='__main__':main()
