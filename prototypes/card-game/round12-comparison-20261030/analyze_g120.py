# A–D comparison (PLAN-G120.md §4): 12 rounds / growth cap 120 / 120維持, CPU heuristic-2, shared seeds.
# Usage: python3 analyze_g120.py > results/g120.json
import gzip, json, glob, random
from collections import defaultdict, Counter

mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
SC = {'win': 1, 'draw': .5, 'loss': 0}
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
other = lambda a: 'B' if a == 'A' else 'A'
COND = {'G-A': (10, 100), 'G-B': (12, 100), 'G-C': (10, 120), 'G-D': (12, 120), 'G-D0': (12, 120), 'G-OFF': (10, 100), 'R10': (10, 100), 'R12': (12, 100)}

def load(name):
    man = {m['match']: m['base'] for m in json.load(open(f'runs/{name}-manifest.json'))['matches']}
    out = []
    for f in sorted(glob.glob(f'runs/{name}-shard*.jsonl.gz')):
        for l in gzip.open(f, 'rt'):
            if l.strip():
                r = json.loads(l); r['base'] = man[r['match']]; out.append(r)
    return out

def index(rows):
    by = defaultdict(dict)
    for r in rows: by[r['variant']][(r['base'], r['first'])] = r
    return by

hold_win = lambda r: r['result']['reason'].endswith('維持')
def est_min(r):
    return (sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB')
            + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60
def provisional(r, at):
    a, b = r['seat']['A']['growthEnd'][at], r['seat']['B']['growthEnd'][at]
    return 'A' if a > b else 'B' if b > a else None
def lock_round(r):
    w = r['result']['winner']
    if not w: return None
    s = [provisional(r, k) for k in range(1, r['round'] + 1)]
    k = len(s)
    while k > 0 and s[k - 1] == w: k -= 1
    return k + 1

_PG = {}
def per_game(r):
    # cached: bootstrap resamples call this many times for the same game
    key = (r['variant'], r['match'])
    if key not in _PG: _PG[key] = _per_game(r)
    return _PG[key]

def _per_game(r):
    F, cap = COND[r['variant']]
    seats = [r['seat'][a] for a in 'AB']
    return {
        'holdWin': float(hold_win(r)), 'draw': float(not r['result']['winner']), 'firstSeat': SC[r['seat']['A']['result']],
        'growth': mean([x['growth'] for x in seats]), 'margin': abs(seats[0]['growth'] - seats[1]['growth']),
        'close': float(abs(seats[0]['growth'] - seats[1]['growth']) <= 10),
        'reach100': mean([x.get('maxGrowth', x['growth']) >= 100 for x in seats]), 'reach110': mean([x.get('maxGrowth', x['growth']) >= 110 for x in seats]),
        'reach120': mean([x.get('maxGrowth', x['growth']) >= 120 for x in seats]), 'reachCap': mean([x.get('maxGrowth', x['growth']) >= cap for x in seats]),
        'lastTwoChanged': float(provisional(r, F - 2) != r['result']['winner']) if r['round'] > F - 2 else None,
        'minutes': est_min(r), 'decisions': sum(sum(x['decisions'][1:]) for x in seats),
        'expiredShare': sum(sum(x['expired']) + x['expiredAtEnd'] for x in seats) / max(1, sum(sum(x['granted']) for x in seats)),
        'handFinal': mean([t['hand'] for x in seats for t in x['turns'] if t['round'] == F]) if r['round'] == F else None,
    }

def summary(rs):
    F, cap = COND[rs[0]['variant']]
    comp = [r for r in rs if r['status'] == 'completed']
    seats = [(r, a, r['seat'][a]) for r in comp for a in 'AB']
    g = [per_game(r) for r in comp]
    col = lambda k: [x[k] for x in g if x[k] is not None]
    mat = defaultdict(list)
    for r, a, x in seats: mat[(x['deck'], r['seat'][other(a)]['deck'])].append(SC[x['result']])
    ds = {d: rnd(mean([v for e in DECKS if e != d for v in mat[(d, e)]])) for d in DECKS}
    hold_seats = [x for r, a, x in seats if x.get('holdStarts', 0) > 0]
    hold_wins = [(r, a) for r, a, x in seats if hold_win(r) and r['result']['winner'] == a]
    lr = [v for v in (lock_round(r) for r in comp) if v]
    late = {}
    for k in range(max(1, F - 3), F + 1):
        T = [t for r, a, x in seats for t in x['turns'] if t['round'] == k]
        if T: late[k] = {'nonPass': rnd(mean([t['nonPass'] for t in T]), 2), 'passOnly': rnd(mean([t['nonPass'] == 0 for t in T])),
                         'growthDelta': rnd(mean([t['growthDelta'] for t in T]), 2), 'hand': rnd(mean([t['hand'] for t in T]), 2), 'options': rnd(mean([t['options'] for t in T]), 2)}
    fr = Counter(x['firstReach'].get(str(cap)) for r, a, x in seats if x.get('firstReach', {}).get(str(cap)))
    return {
        'games': len(rs), 'completed': len(comp), 'replayMatch': sum(r.get('replay') == 'match' for r in comp), 'policy': sorted({r['policy'] for r in rs}),
        'final': F, 'cap': cap,
        'endReason': dict(Counter(r['result']['reason'] for r in comp)), 'endRound': dict(sorted(Counter(r['round'] for r in comp).items())),
        'holdWinRate': rnd(mean(col('holdWin'))), 'normalFinishRate': rnd(1 - mean(col('holdWin'))), 'drawRate': rnd(mean(col('draw'))),
        'firstSeatScore': rnd(mean(col('firstSeat'))),
        'growthMean': rnd(mean(col('growth')), 2), 'growthHist10': dict(sorted(Counter(min(x['growth'] // 10 * 10, cap) for r, a, x in seats).items())),
        'reach': {'100': rnd(mean([x.get('maxGrowth', 0) >= 100 for r, a, x in seats])), '110': rnd(mean([x.get('maxGrowth', 0) >= 110 for r, a, x in seats])),
                  '120': rnd(mean([x.get('maxGrowth', 0) >= 120 for r, a, x in seats])), 'cap': rnd(mean([x.get('maxGrowth', 0) >= cap for r, a, x in seats]))},
        'firstReachCapRound': dict(sorted(fr.items())),
        'hold': {'seatsStartingHold': rnd(len(hold_seats) / len(seats)), 'holdStartsPerSeat': rnd(mean([x.get('holdStarts', 0) for r, a, x in seats]), 3),
                 'holdWinsPerStart': rnd(len(hold_wins) / max(1, sum(x.get('holdStarts', 0) for r, a, x in seats))),
                 'brokenPerStart': rnd(sum(x.get('holdBreaks', 0) for r, a, x in seats) / max(1, sum(x.get('holdStarts', 0) for r, a, x in seats))),
                 'seatsAtCapAtEnd': rnd(mean([x['growth'] >= cap for r, a, x in seats])),
                 'holdWinRound': dict(sorted(Counter(r['round'] for r, a in hold_wins).items()))},
        'margin': rnd(mean(col('margin')), 2), 'closeRate': rnd(mean(col('close'))), 'bothAtCap': rnd(mean([r['seat']['A']['growth'] >= cap and r['seat']['B']['growth'] >= cap for r in comp])),
        'lastTwoChanged': rnd(mean(col('lastTwoChanged'))), 'lockRoundRelative': rnd(mean([l / F for l in lr]), 3), 'lockedInLast2': rnd(mean([l >= F - 1 for l in lr])),
        'deckScore': ds, 'deckSpread': rnd(max(ds.values()) - min(ds.values())),
        'deckVsDeck': {d: {e: rnd(mean(mat[(d, e)])) for e in DECKS} for d in DECKS},
        'growthByDeck': {d: rnd(mean([x['growth'] for r, a, x in seats if x['deck'] == d]), 1) for d in DECKS},
        'minutes': rnd(mean(col('minutes')), 1), 'decisions': rnd(mean(col('decisions')), 1), 'expiredShare': rnd(mean(col('expiredShare'))),
        'timeSpentPerSeat': rnd(mean([sum(x['spentOwn']) + sum(x['spentOpp']) for r, a, x in seats]), 2),
        'handAtFinalRound': rnd(mean(col('handFinal')), 2), 'lateRounds': late,
    }

def contrast(byv, v1, v0, keys, f, n=1000, seed=20261030):
    groups = defaultdict(list)
    for k in keys: groups[k[0]].append(k)
    G = list(groups)
    pre = {g: ([x for k in groups[g] for x in [f(byv[v0][k])] if x is not None], [x for k in groups[g] for x in [f(byv[v1][k])] if x is not None]) for g in G}
    def d(gs):
        a = [v for g in gs for v in pre[g][0]]; b = [v for g in gs for v in pre[g][1]]
        return mean(b) - mean(a)
    rng = random.Random(seed); vals = sorted(d([rng.choice(G) for _ in G]) for _ in range(n))
    return {'diff': rnd(d(G)), 'ci95': [rnd(vals[int(.025 * n)]), rnd(vals[int(.975 * n) - 1])]}

def interaction(byv, keys, f, n=1000, seed=20261030):
    groups = defaultdict(list)
    for k in keys: groups[k[0]].append(k)
    G = list(groups)
    pre = {(v, g): [x for k in groups[g] for x in [f(byv[v][k])] if x is not None] for v in ('G-A', 'G-B', 'G-C', 'G-D') for g in G}
    m = lambda v, gs: mean([x for g in gs for x in pre[(v, g)]])
    d = lambda gs: m('G-D', gs) - m('G-C', gs) - m('G-B', gs) + m('G-A', gs)
    rng = random.Random(seed); vals = sorted(d([rng.choice(G) for _ in G]) for _ in range(n))
    return {'diff': rnd(d(G)), 'ci95': [rnd(vals[int(.025 * n)]), rnd(vals[int(.975 * n) - 1])]}

def deck_spread_fn(byv, v, keys):
    s = {}
    for d in DECKS:
        vals = [SC[byv[v][k]['seat'][a]['result']] for k in keys for a in 'AB' if byv[v][k]['seat'][a]['deck'] == d and byv[v][k]['seat'][other(a)]['deck'] != d]
        s[d] = mean(vals)
    return max(s.values()) - min(s.values())

out = {}
G = index(load('G120'))
keys = sorted(set.intersection(*[set(G[v]) for v in ('G-A', 'G-B', 'G-C', 'G-D')]))
out['conditions'] = {v: summary(list(G[v].values())) for v in ('G-A', 'G-B', 'G-C', 'G-D')}
metrics = {k: (lambda kk: (lambda r: per_game(r)[kk]))(k) for k in ['holdWin', 'firstSeat', 'growth', 'margin', 'close', 'reachCap', 'lastTwoChanged', 'minutes', 'expiredShare', 'draw']}
pairs = {'B-A（ラウンド延長）': ('G-B', 'G-A'), 'C-A（そだち120化）': ('G-C', 'G-A'), 'D-B（12R下での120化）': ('G-D', 'G-B'),
         'D-C（120下でのラウンド延長）': ('G-D', 'G-C'), 'D-A（総合）': ('G-D', 'G-A')}
out['contrasts'] = {name: {m: contrast(G, v1, v0, keys, f) for m, f in metrics.items()} for name, (v1, v0) in pairs.items()}
out['interaction(D-C-B+A)'] = {m: interaction(G, keys, f) for m, f in metrics.items()}
# Deck spread with bootstrap per contrast
groups = defaultdict(list)
for k in keys: groups[k[0]].append(k)
gl = list(groups); rng = random.Random(20261030); boots = []
for _ in range(300):
    smp = [k for g in (rng.choice(gl) for _ in gl) for k in groups[g]]
    boots.append({v: deck_spread_fn(G, v, smp) for v in ('G-A', 'G-B', 'G-C', 'G-D')})
def spread_ci(v1, v0):
    xs = sorted(b[v1] - b[v0] for b in boots); return {'diff': rnd(deck_spread_fn(G, v1, keys) - deck_spread_fn(G, v0, keys)), 'ci95': [rnd(xs[int(.025 * len(xs))]), rnd(xs[int(.975 * len(xs)) - 1])]}
out['deckSpreadContrasts'] = {name: spread_ci(v1, v0) for name, (v1, v0) in pairs.items()}
# Paired deck scores per contrast
def deck_contrast(v1, v0, d):
    f = lambda r: mean([SC[r['seat'][a]['result']] for a in 'AB' if r['seat'][a]['deck'] == d and r['seat'][other(a)]['deck'] != d]) if any(r['seat'][a]['deck'] == d and r['seat'][other(a)]['deck'] != d for a in 'AB') else None
    return contrast(G, v1, v0, keys, f, n=500)
out['deckContrasts'] = {name: {d: deck_contrast(v1, v0, d) for d in DECKS} for name, (v1, v0) in pairs.items()}

# CPU policy check: heuristic-2 (G-A/G-B) vs heuristic-1 (MAIN R10/R12) on the same seeds (groups 001-020)
M = index(load('MAIN'))
pol = {}
for h2, h1 in (('G-A', 'R10'), ('G-B', 'R12')):
    ks = [k for k in G[h2] if k in M[h1]]
    gw = lambda v, k: (G if v.startswith('G-') else M)[v][k]
    pol[f'{h2}(h2) vs {h1}(h1)'] = {'games': len(ks), 'sameWinner': rnd(mean([gw(h2, k)['result']['winner'] == gw(h1, k)['result']['winner'] for k in ks])),
        'holdWin': [rnd(mean([hold_win(gw(h1, k)) for k in ks])), rnd(mean([hold_win(gw(h2, k)) for k in ks]))],
        'growth': [rnd(mean([per_game(gw(h1, k))['growth'] for k in ks]), 2), rnd(mean([per_game(gw(h2, k))['growth'] for k in ks]), 2)],
        'firstSeat': [rnd(mean([SC[gw(h1, k)['seat']['A']['result']] for k in ks])), rnd(mean([SC[gw(h2, k)['seat']['A']['result']] for k in ks]))]}
out['policyCheck(h1,h2)'] = pol

# Sensitivity D0 (CPU growth-cap constants left at 100) vs D, groups 001-005
S = index(load('G120S'))
ks = [k for k in S['G-D0'] if k in G['G-D']]
out['sensitivityD0'] = {'games': len(ks), 'sameWinner': rnd(mean([S['G-D0'][k]['result']['winner'] == G['G-D'][k]['result']['winner'] for k in ks])),
    **{m: [rnd(mean([per_game(G['G-D'][k])[m] for k in ks])), rnd(mean([per_game(S['G-D0'][k])[m] for k in ks]))] for m in ('holdWin', 'growth', 'reachCap', 'firstSeat')}}

# Equivalence: G-OFF (unmodified main 7c1f18c7) vs G-A on groups 001-003 (gpilot 001 + G120EQ 002-003)
E = index(load('G120EQ') + load('gpilot'))
ks = [k for k in E['G-OFF'] if k in G['G-A']]
out['equivalence'] = {'compared': len(ks), 'saveShaMatch': sum(E['G-OFF'][k]['saveSha256'] == G['G-A'][k]['saveSha256'] for k in ks)}

# ⑧ decks under A and D (heuristic-2)
# The three ⑧-study decks share the E8 seed labels, so rows are kept as lists per variant (not keyed by seed).
E8 = defaultdict(list)
for r in load('G120E8'): E8[r['variant']].append(r)
eight = {}
for v in ('G-A', 'G-D'):
    F, cap = COND[v]
    for d in ('main+8', 'main+8lite', 'main+dup'):
        xs = [(r, a, r['seat'][a]) for r in E8[v] for a in 'AB' if r['seat'][a]['deck'] == d]
        reached = [x for r, a, x in xs if x['reached8'] is not None]; t8 = sum(x['turnsAfter8'] for x in reached)
        eight[f'{v}:{d}'] = {'seats': len(xs), 'score': rnd(mean([SC[x['result']] for r, a, x in xs])), 'reach8': rnd(len(reached) / len(xs)),
            'reach7plus': rnd(mean([x['maxStage'] >= 7 for r, a, x in xs])), 'turnsAfter8': rnd(t8 / max(1, len(reached)), 2),
            'passOnlyAfter8': rnd(sum(x['passOnlyTurnsAfter8'] for x in reached) / max(1, t8)), 'growthPerTurnAfter8': rnd(sum(x['growthAfter8'] for x in reached) / max(1, t8), 2),
            'growth': rnd(mean([x['growth'] for r, a, x in xs]), 1), 'scoreIfReached8': rnd(mean([SC[x['result']] for x in reached])),
            'scoreIfMax7': rnd(mean([SC[x['result']] for r, a, x in xs if x['maxStage'] == 7]))}
def seat_map(v, d):
    return {(r['base'], r['first']): SC[r['seat'][a]['result']] for r in E8[v] for a in 'AB' if r['seat'][a]['deck'] == d and r['seat'][other(a)]['deck'] != d}
def paired_deck(v, d1, d0, n=2000, seed=20261030):
    a, b = seat_map(v, d0), seat_map(v, d1); ks = [k for k in a if k in b]
    groups = defaultdict(list)
    for k in ks: groups[k[0]].append(k)
    gl = list(groups); dd = lambda gs: mean([b[k] - a[k] for g in gs for k in groups[g]])
    rng = random.Random(seed); vals = sorted(dd([rng.choice(gl) for _ in gl]) for _ in range(n))
    return {'pairs': len(ks), 'diff': rnd(dd(gl)), 'ci95': [rnd(vals[int(.025 * n)]), rnd(vals[int(.975 * n) - 1])]}
eight['eightItself(main+8lite - main+dup)'] = {v: paired_deck(v, 'main+8lite', 'main+dup') for v in ('G-A', 'G-D')}
out['eight'] = eight
print(json.dumps(out, ensure_ascii=False, indent=1))
