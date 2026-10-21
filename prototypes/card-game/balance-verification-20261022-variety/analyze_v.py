#!/usr/bin/env python3
"""New CPU strategy decks: V1 (round robin, intermediate x intermediate) and V2 (same-deck mirrors, beginner vs intermediate)."""
import json, gzip, glob, math, collections
def load(exp):
    R = [json.loads(l) for f in sorted(glob.glob(f'runs/{exp}-shard*.jsonl*')) for l in (gzip.open(f, 'rt') if f.endswith('.gz') else open(f))]
    return R, len(json.load(open(f'runs/{exp}-manifest.json'))['matches'])
def wilson(k, n, z=1.96):
    p = k/n; d = 1+z*z/n; c = p+z*z/(2*n); h = z*math.sqrt(p*(1-p)/n+z*z/(4*n*n)); return [round((c-h)/d, 3), round((c+h)/d, 3)]
def sc(w, s): return .5 if w is None else float(w == s)
out = {}
for exp in ['V1', 'V2']:
    R, planned = load(exp); C = [r for r in R if r['status'] == 'completed']; X = out[exp] = {'planned': planned, 'recorded': len(R), 'completed': len(C)}
    X['abnormal'] = [r['match'] for r in R if r['status'] != 'completed']; X['replay_mismatch'] = [r['match'] for r in C if r.get('replay') != 'match']
    fw = sum(r['result']['winner'] == 'A' for r in C); sw = sum(r['result']['winner'] == 'B' for r in C); dr = len(C)-fw-sw
    X['first_second'] = {'first_wins': fw, 'second_wins': sw, 'draws': dr, 'first_rate_decisive': round(fw/(fw+sw), 3), 'ci95': wilson(fw, fw+sw)}
    X['early_rate'] = round(sum(r['result']['reason'] != 'R10最終比較' for r in C)/len(C), 4)
    X['reached100_rate'] = round(sum(r['reached100']['A'] or r['reached100']['B'] for r in C)/len(C), 4)
    X['time_spent_share'] = round(1-sum(r['timeLeft'][a] for r in C for a in 'AB')/(len(C)*110), 3)
    X['final_growth_mean'] = round(sum(r['growth'][a] for r in C for a in 'AB')/(2*len(C)), 2)
    X['challenges_per_game'] = round(sum(len(r['challenges']) for r in C)/len(C), 2)
    ch = collections.Counter()
    for r in C:
        for c in r['challenges']: ch['declared'] += 1; ch['declarer_won'] += c['winner'] == c['actor']; ch['draw'] += c['winner'] is None
    X['challenge_declarer_win_rate'] = round(ch['declarer_won']/max(1, ch['declared']), 3); X['challenge_draw_rate'] = round(ch['draw']/max(1, ch['declared']), 3)
    X['responses_used_per_game'] = round(sum(r['responsesUsed']['A']+r['responsesUsed']['B'] for r in C)/len(C), 2)
    X['elapsed_ms_mean'] = round(sum(r['elapsedMs'] for r in C)/len(C))
    # mirror pairs (same initial orders, first player swapped)
    g = collections.defaultdict(dict)
    for r in C:
        if exp == 'V1': g[r['group']][r['first']] = r
    if g:
        pc = collections.Counter()
        for d in g.values():
            if set(d) != {'X', 'Y'}: continue
            wx, wy = d['X']['result']['winner'], d['Y']['result']['winner']
            pc['draw' if None in (wx, wy) else 'first_both' if wx == wy == 'A' else 'second_both' if wx == wy == 'B' else 'same_order_both'] += 1
        X['mirror_pairs'] = dict(pc)
    M = collections.defaultdict(lambda: [0.0, 0]); O = collections.defaultdict(lambda: [0.0, 0]); G = collections.defaultdict(list)
    for r in C:
        for s, t in (('A', 'B'), ('B', 'A')):
            x = sc(r['result']['winner'], s); M[(r['deck'][s], r['deck'][t])][0] += x; M[(r['deck'][s], r['deck'][t])][1] += 1; G[r['deck'][s]].append(r['growth'][s])
            if r['deck'][s] != r['deck'][t]: O[r['deck'][s]][0] += x; O[r['deck'][s]][1] += 1
    if exp == 'V1':
        X['deck_vs_others'] = {d: {'score': round(a/n, 3), 'n': n, 'ci95': wilson(a, n), 'growth_mean': round(sum(G[d])/len(G[d]), 1)} for d, (a, n) in sorted(O.items(), key=lambda kv: -kv[1][0]/kv[1][1])}
        X['deck_matrix'] = {f'{a}|{b}': round(s/n, 3) for (a, b), (s, n) in sorted(M.items())}
        # distinct cards each deck actually used, and its never-used cards
        use = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))
        for r in C:
            for s in 'AB':
                for cid, c in r['cards'][s].items(): u = use[r['deck'][s]][cid]; u[0] += c['drawn']; u[1] += c['played']+c['activated']
        X['deck_card_use'] = {d: {'distinct_used': sum(1 for v in u.values() if v[1]), 'distinct_in_deck': len(u), 'never_used': sorted(k for k, v in u.items() if v[0] and not v[1])} for d, u in sorted(use.items())}
    if exp == 'V2':
        D = collections.defaultdict(lambda: [0.0, 0]); byd = collections.defaultdict(lambda: [0.0, 0]); same = 0; recs = {r['match']: r for r in C}
        for r in C:
            for s in 'AB':
                D[r['difficulty'][s]][0] += sc(r['result']['winner'], s); D[r['difficulty'][s]][1] += 1
                if r['difficulty'][s] == 'intermediate': byd[r['deck'][s]][0] += sc(r['result']['winner'], s); byd[r['deck'][s]][1] += 1
            if not r['match'].endswith(':swap') and r['match']+':swap' in recs and recs[r['match']+':swap']['saveSha256'] == r['saveSha256']: same += 1
        X['difficulty_score'] = {d: {'score': round(a/n, 3), 'n': n, 'ci95': wilson(a, n)} for d, (a, n) in D.items()}
        X['intermediate_score_by_deck'] = {d: [round(a/n, 3), n, wilson(a, n)] for d, (a, n) in sorted(byd.items())}
        X['identical_under_difficulty_swap'] = same
        wins = collections.Counter('draw' if r['result']['winner'] is None else r['difficulty'][r['result']['winner']] for r in C); X['wins'] = dict(wins)
        chd = collections.defaultdict(collections.Counter)
        for r in C:
            for c in r['challenges']:
                k = r['difficulty'][c['actor']]; chd[k]['declared'] += 1; chd[k]['won'] += c['winner'] == c['actor']; chd[k]['lost'] += c['winner'] not in (None, c['actor'])
            for s in 'AB': chd[r['difficulty'][s]]['seats'] += 1; chd[r['difficulty'][s]]['growth'] += r['growth'][s]; chd[r['difficulty'][s]]['time_left'] += r['timeLeft'][s]; chd[r['difficulty'][s]]['responses'] += r['responsesUsed'][s]
        X['by_difficulty'] = {k: {'challenges_per_game': round(v['declared']/v['seats'], 2), 'declarer_win': round(v['won']/max(1, v['declared']), 3), 'declarer_loss': round(v['lost']/max(1, v['declared']), 3), 'final_growth': round(v['growth']/v['seats'], 1), 'time_used_share': round(1-v['time_left']/(55*v['seats']), 3), 'responses_per_game': round(v['responses']/v['seats'], 2)} for k, v in chd.items()}
json.dump(out, open('results/variety-summary.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
