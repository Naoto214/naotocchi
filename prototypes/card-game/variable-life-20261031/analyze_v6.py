# VERSION 6 analysis (PLAN-V6.md). Reuses analyze_v5.py / analyze_v4.py helpers. Usage: python3 analyze_v6.py > results/summary-v6.json
import json, glob, sys, random
from collections import defaultdict, Counter
exec(open('analyze_v5.py').read().split('\nout = {}')[0])
random.seed(20261106)
def L(name): return load(f'runs/{name}-shard*.jsonl.gz', f'runs/{name}-manifest.json')
V2C = [r for r in load('runs/V2C-shard*.jsonl.gz', 'runs/V2C-manifest.json') if int(seed(r)) <= 10]
A0 = [r for r in load('ref/G120-AD.jsonl.gz', keep=lambda r: r['variant'] == 'G-A') if int(seed(r)) <= 10]
cond = {'A0': A0, 'V2C': V2C, 'HN': L('V5F_PAIR_HN'), 'P3': L('V6_P3'), 'PHOTO': L('V6_PHOTO'), 'PF': L('V6_PF'), 'PS': L('V6_PS'),
        'NAGA_early': L('V6E_naga'), 'NAGA_hold': L('V5F_N_naga'), 'NAGA_adaptive': L('V6A_naga'), 'P3_early': L('V6E_P3'), 'P3_hold': L('V6_P3'), 'P3_adaptive': L('V6A_P3')}
out = {'conditions': {}}
for c, rows in cond.items():
    sm = summary(rows); sm['comeback'] = comeback(rows); sm['cardUse'] = card_use5(rows); out['conditions'][c] = sm
M = ['behindR8', 'close', 'firstSeat', 'holdWin', 'spread', 'deck:item', 'deck:growth', 'deck:companion', 'deck:partner', 'deck:balance']
out['vsV2C'] = {c: {m: contrast4(cond[c], V2C, m) for m in M} for c in cond if c not in ('V2C', 'A0')}
out['vsA0'] = {c: {m: contrast4(cond[c], A0, m) for m in ['firstSeat', 'close', 'holdWin', 'spread']} for c in ('V2C', 'HN', 'P3', 'PHOTO')}
# ---- おもいでのしゃしん: uses by seat (logged by T-6h) ----
def photo_stats(rows):
    s = {a: {'uses': 0, 'gain': [], 'drew': 0, 'used': 0, 'extendedAfter': 0, 'counts': Counter(), 'byFinal': Counter(), 'winWhenUsed': []} for a in 'AB'}
    for r in rows:
        ev = [e for e in r['life']['events'] if e['op'] == 'photo']
        for a in 'AB':
            if any(x['card'] == 'X-N-photo' for x in r['seat'][a].get('xSeen', [])): s[a]['drew'] += 1
            mine = [e for e in ev if e['actor'] == a]
            if mine: s[a]['used'] += 1; s[a]['winWhenUsed'].append(SC[r['seat'][a]['result']])
            for e in mine:
                s[a]['uses'] += 1; s[a]['gain'].append(e['n']); s[a]['counts'][e['count']] += 1; s[a]['byFinal'][e['final']] += 1
                if r['final'] > e['final']: s[a]['extendedAfter'] += 1
    return {('first' if a == 'A' else 'second'): {'seatsDrew': v['drew'], 'usedShare': rnd(v['used'] / v['drew']) if v['drew'] else None, 'uses': v['uses'],
            'meanGain': rnd(mean(v['gain']), 2) if v['gain'] else None, 'gainDist': dict(sorted(Counter(v['gain']).items())), 'extendedAfterUse': v['extendedAfter'],
            'usedAtFinal': dict(sorted(v['byFinal'].items())), 'scoreWhenUsed': rnd(mean(v['winWhenUsed'])) if v['winWhenUsed'] else None} for a, v in s.items()}
out['photo'] = {c: photo_stats(cond[c]) for c in ('P3', 'PHOTO', 'PF', 'PS')}
# Structural seat bias: holder's score change vs V2C on the same (seed, seat order), first holder (PF, seat A) vs second (PS, seat B).
def paired(rows, seat):
    ib = {key(r): r for r in V2C}; out = defaultdict(list)
    for r in rows:
        k = key(r)
        if k in ib: out[k[0].rsplit(':', 1)[1]].append(SC[r['seat'][seat]['result']] - SC[ib[k]['seat'][seat]['result']])
    return out
gF, gS = paired(cond['PF'], 'A'), paired(cond['PS'], 'B')
seeds = sorted(set(gF) & set(gS))
def bias(sd):
    f = [x for s in sd for x in gF[s]]; t = [x for s in sd for x in gS[s]]
    return mean(t) - mean(f)
bs = []
for _ in range(2000):
    pick = [random.choice(seeds) for _ in seeds]; bs.append(bias(pick))
bs.sort()
out['seatBias'] = {'firstHolderGain': rnd(mean([x for s in seeds for x in gF[s]])), 'secondHolderGain': rnd(mean([x for s in seeds for x in gS[s]])),
                   'secondMinusFirst': rnd(bias(seeds)), 'ci95': [rnd(bs[50]), rnd(bs[1949])], 'pairs': sum(len(gF[s]) for s in seeds)}
def deck_gain(rows, seat):
    ib = {key(r): r for r in V2C}; g = defaultdict(list)
    for r in rows:
        k = key(r)
        if k in ib: g[deck_of(r, seat)].append(SC[r['seat'][seat]['result']] - SC[ib[k]['seat'][seat]['result']])
    return {d: rnd(mean(v)) for d, v in g.items()}
out['seatBiasByDeck'] = {'first': deck_gain(cond['PF'], 'A'), 'second': deck_gain(cond['PS'], 'B')}
pairs = [('NAGA_adaptive', 'NAGA_hold'), ('NAGA_early', 'NAGA_hold'), ('NAGA_adaptive', 'NAGA_early'), ('P3_adaptive', 'P3_hold'), ('P3_early', 'P3_hold'), ('P3_adaptive', 'P3_early'), ('PS', 'PF')]
out['pairs'] = {f'{a}-{b}': {m: contrast4(cond[a], cond[b], m) for m in ['behindR8', 'close', 'firstSeat', 'holdWin', 'spread']} for a, b in pairs}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
