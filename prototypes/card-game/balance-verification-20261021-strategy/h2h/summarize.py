#!/usr/bin/env python3
"""Summarize current-CPU vs PR #406-CPU head-to-head (h2h-E1-shard*.jsonl[.gz])."""
import json, glob, gzip, math, collections
R = []
for f in glob.glob('h2h/h2h-E1-shard*.jsonl*'):
    op = gzip.open if f.endswith('.gz') else open
    R += [json.loads(l) for l in op(f, 'rt')]
def wilson(k, n, z=1.96):
    p = k/n; d = 1+z*z/n; c = p+z*z/(2*n); h = z*math.sqrt(p*(1-p)/n+z*z/(4*n*n)); return [round((c-h)/d, 3), round((c+h)/d, 3)]
def sc(r): w = r['result']['winner']; return .5 if w is None else float(w == r['newSeat'])
out = {'games': len(R), 'abnormal': sum(r['status'] != 'completed' for r in R), 'replay_mismatch': sum(r['replay'] != 'match' for r in R)}
c = collections.Counter('draw' if r['result']['winner'] is None else 'new' if r['result']['winner'] == r['newSeat'] else 'pr406' for r in R)
s = sum(sc(r) for r in R); out.update({'new_wins': c['new'], 'pr406_wins': c['pr406'], 'draws': c['draw'], 'new_score': round(s/len(R), 4), 'ci95': wilson(s, len(R))})
dec = c['new']+c['pr406']; k = c['new']; pk = [math.comb(dec, i)/2**dec for i in range(dec+1)]
out['sign_test_p'] = round(min(1, sum(p for p in pk if p <= pk[k]+1e-15)), 4)
by = collections.defaultdict(lambda: [0.0, 0])
for r in R:
    d = r['deck'][r['newSeat']]; by[d][0] += sc(r); by[d][1] += 1
out['new_score_by_new_side_deck'] = {d: [round(a/n, 3), n, wilson(a, n)] for d, (a, n) in sorted(by.items())}
seat = collections.defaultdict(lambda: [0.0, 0])
for r in R: seat[r['newSeat']][0] += sc(r); seat[r['newSeat']][1] += 1
out['new_score_by_seat'] = {k: round(a/n, 3) for k, (a, n) in seat.items()}
# Policy effect per deck: new CPU's score with deck d minus PR #406 CPU's score with the same deck d (same opposition set).
nw, ol = collections.defaultdict(list), collections.defaultdict(list)
for r in R:
    ns = r['newSeat']; os_ = 'B' if ns == 'A' else 'A'; w = r['result']['winner']
    nw[r['deck'][ns]].append(.5 if w is None else float(w == ns)); ol[r['deck'][os_]].append(.5 if w is None else float(w == os_))
out['policy_effect_by_deck'] = {d: {'new_cpu_score': round(sum(nw[d])/len(nw[d]), 3), 'pr406_cpu_score': round(sum(ol[d])/len(ol[d]), 3), 'delta': round(sum(nw[d])/len(nw[d])-sum(ol[d])/len(ol[d]), 3)} for d in sorted(nw)}
json.dump(out, open('results/h2h-summary.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(out, ensure_ascii=False, indent=1))
