#!/usr/bin/env python3
"""Compare a re-run subset (jsonl files) with PR #406 records of the same match ids. Read-only."""
import json, gzip, glob, sys, collections
new = {}
for f in sys.argv[1:]:
    for l in open(f): r = json.loads(l); new[r['match']] = r
old = {}
for f in glob.glob('../balance-verification-20261020-cpufix/runs/*-shard*.jsonl.gz'):
    for l in gzip.open(f, 'rt'):
        r = json.loads(l)
        if r['match'] in new: old[r['match']] = r
FOCUS = ['I-c_friend','I-c_match','I-c_time_forward','G-picross-5','G-stack-acorn','E-new-encounter','E-mirror','I-c_egg_normal','G-animal-shogi','C-cat_friend','G-mini-golf-physics','E-fateful-transform','I-c_coin2','G-hit-blow','G-area-claim','E-first-date','G-archery-3d']
def stats(R):
    c = [r for r in R.values() if r['status'] == 'completed']; n = len(c)
    out = {'games': len(R), 'completed': n, 'abnormal': len(R)-n, 'replay_mismatch': sum(1 for r in c if r.get('replay') != 'match'),
        'time_spent_share': round(1 - sum(r['timeLeft'][a] for r in c for a in 'AB')/(n*110), 3),
        'final_growth': round(sum(r['growth'][a] for r in c for a in 'AB')/(2*n), 2),
        'reached100': round(sum(r['reached100']['A'] or r['reached100']['B'] for r in c)/n, 3),
        'early': round(sum(r['result']['reason'] != 'R10最終比較' for r in c)/n, 3),
        'responses_used': round(sum(r['responsesUsed']['A']+r['responsesUsed']['B'] for r in c)/n, 2),
        'challenges': round(sum(len(r['challenges']) for r in c)/n, 2),
        'first_win_decisive': round(sum(r['result']['winner']=='A' for r in c)/max(1, sum(r['result']['winner'] is not None for r in c)), 3)}
    dk = collections.defaultdict(lambda: [0.0, 0])
    for r in c:
        if r['deck']['A'] == r['deck']['B']: continue
        for s in 'AB':
            w = r['result']['winner']; dk[r['deck'][s]][0] += .5 if w is None else w == s; dk[r['deck'][s]][1] += 1
    out['deck_vs_others'] = {k: round(v[0]/v[1], 3) for k, v in sorted(dk.items())}
    cu = collections.defaultdict(lambda: [0, 0])
    for r in c:
        for s in 'AB':
            for cid, x in r['cards'][s].items(): cu[cid][0] += x['drawn']; cu[cid][1] += x['played'] + (x['activated'] if cid == 'C-cat_friend' else 0)
    out['use_per_draw'] = {k: (cu[k][1], cu[k][0], round(cu[k][1]/cu[k][0], 3) if cu[k][0] else None) for k in FOCUS}
    distinct = collections.Counter(); 
    for r in c:
        for s in 'AB':
            distinct[sum(1 for x in r['cards'][s].values() if x['played'] or x['activated'])] += 1
    out['distinct_cards_used_per_seat'] = round(sum(k*v for k, v in distinct.items())/sum(distinct.values()), 2)
    return out
a, b = stats(old), stats(new)
for k in a:
    if isinstance(a[k], dict):
        print(k); [print('   ', kk, a[k][kk], '->', b[k].get(kk)) for kk in a[k]]
    else: print(k, a[k], '->', b[k])
same = sum(1 for m in new if old[m]['saveSha256'] == new[m].get('saveSha256')); print('identical records', same, '/', len(new))
