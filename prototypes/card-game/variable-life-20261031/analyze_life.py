# Variable-life comparison (PLAN.md §4). A0 = PR #495 G-A and A5 = PR #495 G-D (ref/, same seeds and main), the rest from runs/.
# Usage: python3 analyze_life.py > results/summary.json
import gzip, json, glob, random
from collections import defaultdict, Counter

mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
SC = {'win': 1, 'draw': .5, 'loss': 0}
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
other = lambda a: 'B' if a == 'A' else 'A'
NB = 2000
NAMES = {'A0': 'G-A', 'A5': 'G-D', 'X0': 'L-X0', 'A1': 'L-A1', 'A1a': 'L-A1a', 'A1t': 'L-A1t', 'A2': 'L-A2', 'A2s': 'L-A2s', 'A3': 'L-A3', 'A4': 'L-A4',
         'A1c4': 'L-A1c4', 'A1n1': 'L-A1n1', 'A1aL': 'L-A1aL', 'A1t1': 'L-A1t1'}
MAINC = ['A0', 'X0', 'A1', 'A1a', 'A1t', 'A2', 'A2s', 'A3', 'A4', 'A5']

def load_runs(name):
    man = {m['match']: m['base'] for m in json.load(open(f'runs/{name}-manifest.json'))['matches']}
    out = []
    for f in sorted(glob.glob(f'runs/{name}-shard*.jsonl.gz')):
        for l in gzip.open(f, 'rt'):
            if l.strip():
                r = json.loads(l); r['base'] = man[r['match']]
                for a in 'AB': r['seat'][a]['deckBase'] = r['seat'][a]['deck']
                out.append(r)
    return out
def load_ref(name):
    out = [json.loads(l) for l in gzip.open(f'ref/{name}-AD.jsonl.gz', 'rt') if l.strip()]
    for r in out:
        r.setdefault('final', 10 if r['variant'] == 'G-A' else 12)
        for a in 'AB': r['seat'][a]['deckBase'] = r['seat'][a]['deck']
    return out
def index(rows):
    by = defaultdict(dict)
    for r in rows: by[r['variant']][(r['base'], r['first'])] = r
    return by

hold_win = lambda r: r['result']['reason'].endswith('維持')
def est_min(r):  # PR #495 assumption: 12 s per action, 3 s per pass/choice, 5 s per turn
    return (sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB')
            + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60
# Actions-only variant: holding a playable すぐつかう card makes the CPU answer every response window with a pass, which
# the PR #495 estimate counts as 3 s each. This variant counts only actions (12 s) and turns (5 s).
def est_actions(r):
    return (sum(sum(r['seat'][s]['nonPass'][1:]) * 12 for s in 'AB') + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60
def provisional(r, at):
    a, b = r['seat']['A']['growthEnd'][at], r['seat']['B']['growthEnd'][at]
    return 'A' if a > b else 'B' if b > a else None
events = lambda r: (r.get('life') or {}).get('events', [])
ext_events = lambda r: [e for e in events(r) if e.get('extended')]
raise_events = lambda r: [e for e in events(r) if e.get('raised')]
used = lambda x: bool(x.get('xPlayed') or x.get('xFired'))
FUNCTIONAL = {'X-life-extend', 'X-cap-raise', 'X-life-both'}
seen_func = lambda x: any(s['card'] in FUNCTIONAL for s in x.get('xSeen', []))

_PG = {}
def per_game(r):
    key = (r['variant'], r['match'])
    if key not in _PG: _PG[key] = _per_game(r)
    return _PG[key]
def _per_game(r):
    F = r['final']; seats = [r['seat'][a] for a in 'AB']; w = r['result']['winner']
    return {
        'holdWin': float(hold_win(r)), 'draw': float(not w), 'firstSeat': SC[r['seat']['A']['result']],
        'growth': mean([x['growth'] for x in seats]), 'margin': abs(seats[0]['growth'] - seats[1]['growth']),
        'close': float(abs(seats[0]['growth'] - seats[1]['growth']) <= 10),
        'endRound': r['round'], 'ext11': float(F >= 11), 'ext12': float(F >= 12),
        'lastTwoChanged': float(provisional(r, F - 2) != w) if r['round'] > F - 2 else None,
        'flipAfterR10': float(r['round'] > 10 and provisional(r, 10) != w),
        'minutes': est_min(r), 'minutesActions': est_actions(r), 'actions': sum(sum(x['nonPass'][1:]) for x in seats), 'passes': sum(sum(x['decisions'][1:]) - sum(x['nonPass'][1:]) for x in seats), 'decisions': sum(sum(x['decisions'][1:]) for x in seats),
        'expiredShare': sum(sum(x['expired']) + x['expiredAtEnd'] for x in seats) / max(1, sum(sum(x['granted']) for x in seats)),
        'reach100': mean([x.get('maxGrowth', x['growth']) >= 100 for x in seats]),
        'anyUsed': float(any(used(x) for x in seats)),
    }

def summary(rs):
    comp = [r for r in rs if r['status'] == 'completed']
    seats = [(r, a, r['seat'][a]) for r in comp for a in 'AB']
    g = [per_game(r) for r in comp]; col = lambda k: [x[k] for x in g if x[k] is not None]
    mat = defaultdict(list)
    for r, a, x in seats: mat[(x['deckBase'], r['seat'][other(a)]['deckBase'])].append(SC[x['result']])
    ds = {d: rnd(mean([v for e in DECKS if e != d for v in mat[(d, e)]])) for d in DECKS}
    late = {}
    for k in range(9, 13):
        T = [t for r, a, x in seats for t in x['turns'] if t['round'] == k]
        if T: late[k] = {'turns': len(T), 'nonPass': rnd(mean([t['nonPass'] for t in T]), 2), 'passOnly': rnd(mean([t['nonPass'] == 0 for t in T])),
                         'growthDelta': rnd(mean([t['growthDelta'] for t in T]), 2), 'hand': rnd(mean([t['hand'] for t in T]), 2)}
    # experiment cards
    ex = [(r, e) for r in comp for e in ext_events(r)]
    ex_d = [e['growth'][other(e['actor'])] - e['growth'][e['actor']] for r, e in ex]
    rz = [(r, e) for r in comp for e in raise_events(r)]
    holders = [x for r, a, x in seats if seen_func(x)]
    first_ext = [(r, ext_events(r)[0]) for r in comp if ext_events(r)]
    card = {
        'seatsDrewCard': rnd(len(holders) / max(1, len(seats))),
        'seatsUsedOfDrew': rnd(mean([used(x) for x in holders])),
        'seatsDrewButUnused': rnd(mean([not used(x) for x in holders])),
        'gamesNoCardUsed': rnd(1 - mean(col('anyUsed'))),
        'unusedAtEnd': {'hand': rnd(mean([len(x.get('xHandEnd', [])) for r, a, x in seats if seen_func(x)]), 2)},
        'extensions': {'perGame': rnd(len(ex) / len(comp), 3), 'byRound': dict(sorted(Counter(e['round'] for r, e in ex).items())),
                       'byTurnOwner': dict(Counter('own' if e['turn'] == e['actor'] else 'opponent' for r, e in ex)),
                       'actorBehind': rnd(mean([d > 0 for d in ex_d])), 'actorTied': rnd(mean([d == 0 for d in ex_d])), 'actorAhead': rnd(mean([d < 0 for d in ex_d])),
                       'meanDeficit': rnd(mean(ex_d), 2),
                       'actorScore': rnd(mean([1 if r['result']['winner'] == e['actor'] else .5 if not r['result']['winner'] else 0 for r, e in ex])),
                       'actorScoreWhenBehind': rnd(mean([1 if r['result']['winner'] == e['actor'] else .5 if not r['result']['winner'] else 0 for (r, e), d in zip(ex, ex_d) if d > 0])),
                       'firstExtenderBehindWonOrDrew': rnd(mean([r['result']['winner'] in (e['actor'], None) for r, e in first_ext if e['growth'][other(e['actor'])] > e['growth'][e['actor']]])),
                       'byFirstSeat': rnd(mean([e['actor'] == 'A' for r, e in ex]))},
        'raises': {'perGame': rnd(len(rz) / len(comp), 3), 'byRound': dict(sorted(Counter(e['round'] for r, e in rz).items())),
                   'brokeOpponentHold': sum(1 for r, e in rz if e['op'] != 'lifeExtend' and e['growth'][other(e['actor'])] == (e['cap'][other(e['actor'])] - 10) and e['cap'][other(e['actor'])] > 100 and (e['cap'][e['actor']] == e['cap'][other(e['actor'])])),
                   'actorAtCapBefore': rnd(mean([e['growth'][e['actor']] >= e['cap'][e['actor']] - 10 for r, e in rz])),
                   'actorScore': rnd(mean([1 if r['result']['winner'] == e['actor'] else .5 if not r['result']['winner'] else 0 for r, e in rz])),
                   'finalCap': dict(Counter(max(r['life']['cap'].values()) for r in comp if r.get('life')))},
    }
    return {
        'games': len(rs), 'completed': len(comp), 'replayMatch': sum(r.get('replay') == 'match' for r in comp),
        'endReason': dict(Counter(r['result']['reason'] for r in comp)), 'endRound': dict(sorted(Counter(r['round'] for r in comp).items())),
        'finalRound': dict(sorted(Counter(r['final'] for r in comp).items())),
        'ext11Rate': rnd(mean(col('ext11'))), 'ext12Rate': rnd(mean(col('ext12'))),
        'holdWinRate': rnd(mean(col('holdWin'))), 'holdWinByValue': dict(Counter(r['result']['reason'] for r in comp if hold_win(r))),
        'drawRate': rnd(mean(col('draw'))), 'firstSeatScore': rnd(mean(col('firstSeat'))),
        'growthMean': rnd(mean(col('growth')), 2), 'reach': {str(t): rnd(mean([x.get('maxGrowth', 0) >= t for r, a, x in seats])) for t in (100, 110, 120)},
        'hold': {'startsPerSeat': rnd(mean([x.get('holdStarts', 0) for r, a, x in seats])),
                 'brokenPerStart': rnd(sum(x.get('holdBreaks', 0) for r, a, x in seats) / max(1, sum(x.get('holdStarts', 0) for r, a, x in seats))),
                 'winsPerStart': rnd(sum(hold_win(r) for r in comp) / max(1, sum(x.get('holdStarts', 0) for r, a, x in seats))),
                 'holdWinRound': dict(sorted(Counter(r['round'] for r in comp if hold_win(r)).items()))},
        'margin': rnd(mean(col('margin')), 2), 'closeRate': rnd(mean(col('close'))),
        'lastTwoChanged': rnd(mean(col('lastTwoChanged'))), 'flipAfterR10': rnd(mean(col('flipAfterR10'))),
        'flipAfterR10GivenExtended': rnd(mean([per_game(r)['flipAfterR10'] for r in comp if r['round'] > 10])),
        'deckScore': ds, 'deckSpread': rnd(max(ds.values()) - min(ds.values())),
        'minutes': rnd(mean(col('minutes')), 1), 'minutesActions': rnd(mean(col('minutesActions')), 1), 'actions': rnd(mean(col('actions')), 1), 'passes': rnd(mean(col('passes')), 1), 'decisions': rnd(mean(col('decisions')), 1), 'expiredShare': rnd(mean(col('expiredShare'))),
        'lateRounds': late, 'card': card,
    }

# ---- paired bootstrap by seed group (deck pair x seed label) --------------------------------------------------
def groups_of(keys):
    gr = defaultdict(list)
    for k in keys: gr[k[0]].append(k)
    return gr
def contrast(byv, v1, v0, f, seed=20261031):
    keys = [k for k in byv[v0] if k in byv[v1]]; gr = groups_of(keys); G = list(gr)
    pre = {}
    for g in G:
        a = [x for k in gr[g] for x in [f(byv[v0][k])] if x is not None]; b = [x for k in gr[g] for x in [f(byv[v1][k])] if x is not None]
        pre[g] = (sum(a), len(a), sum(b), len(b))
    def d(gs):
        s0 = sum(pre[g][0] for g in gs); n0 = sum(pre[g][1] for g in gs); s1 = sum(pre[g][2] for g in gs); n1 = sum(pre[g][3] for g in gs)
        return s1 / n1 - s0 / n0
    rng = random.Random(seed); vals = sorted(d([rng.choice(G) for _ in G]) for _ in range(NB))
    return {'n': len(keys), 'diff': rnd(d(G)), 'ci95': [rnd(vals[int(.025 * NB)]), rnd(vals[int(.975 * NB) - 1])]}
def deck_pre(byv, v, keys):
    gr = groups_of(keys); pre = {}
    for g, ks in gr.items():
        s = defaultdict(lambda: [0, 0])
        for k in ks:
            r = byv[v][k]
            for a in 'AB':
                d, e = r['seat'][a]['deckBase'], r['seat'][other(a)]['deckBase']
                if d != e: s[d][0] += SC[r['seat'][a]['result']]; s[d][1] += 1
        pre[g] = dict(s)
    return pre
def spread(pre, gs):
    tot = defaultdict(lambda: [0, 0])
    for g in gs:
        for d, (a, n) in pre[g].items(): tot[d][0] += a; tot[d][1] += n
    sc = [a / n for a, n in tot.values() if n]
    return max(sc) - min(sc)
def deck_scores(pre, gs):
    tot = defaultdict(lambda: [0, 0])
    for g in gs:
        for d, (a, n) in pre[g].items(): tot[d][0] += a; tot[d][1] += n
    return {d: a / n for d, (a, n) in tot.items() if n}
def deck_contrasts(byv, v1, v0, seed=20261031):
    keys = [k for k in byv[v0] if k in byv[v1]]; G = list(groups_of(keys))
    p0, p1 = deck_pre(byv, v0, keys), deck_pre(byv, v1, keys)
    rng = random.Random(seed); bs = []
    for _ in range(NB):
        gs = [rng.choice(G) for _ in G]; s0, s1 = deck_scores(p0, gs), deck_scores(p1, gs)
        bs.append(({d: s1[d] - s0[d] for d in DECKS if d in s1 and d in s0}, spread(p1, gs) - spread(p0, gs)))
    full0, full1 = deck_scores(p0, G), deck_scores(p1, G)
    ci = lambda xs: [rnd(sorted(xs)[int(.025 * len(xs))]), rnd(sorted(xs)[int(.975 * len(xs)) - 1])]
    return {'spread': {'diff': rnd(spread(p1, G) - spread(p0, G)), 'ci95': ci([b[1] for b in bs])},
            'decks': {d: {'diff': rnd(full1[d] - full0[d]), 'ci95': ci([b[0][d] for b in bs if d in b[0]])} for d in DECKS}}

out = {}
REF = load_ref('G120')
MAIN = load_runs('MAIN')
byv = index(REF + MAIN)
V = {c: NAMES[c] for c in MAINC}
out['conditions'] = {c: summary(list(byv[v].values())) for c, v in V.items()}
metrics = ['holdWin', 'draw', 'firstSeat', 'growth', 'margin', 'close', 'endRound', 'ext11', 'ext12', 'lastTwoChanged', 'flipAfterR10', 'minutes', 'minutesActions', 'actions', 'expiredShare', 'reach100']
mf = {m: (lambda kk: (lambda r: per_game(r)[kk]))(m) for m in metrics}
pairs = {'X0-A0（カード交換だけの影響）': ('X0', 'A0'), 'A5-A0（固定12R・120、参考）': ('A5', 'A0')}
for c in ['A1', 'A1a', 'A1t', 'A2', 'A2s', 'A3', 'A4']:
    pairs[f'{c}-X0（ルール効果）'] = (c, 'X0'); pairs[f'{c}-A0（総合）'] = (c, 'A0')
out['contrasts'] = {name: {m: contrast(byv, V[c1], V[c0], f) for m, f in mf.items()} for name, (c1, c0) in pairs.items()}
out['deckContrasts'] = {name: deck_contrasts(byv, V[c1], V[c0]) for name, (c1, c0) in pairs.items()}

# Card access fairness: games where exactly one seat drew a working life card. That seat's score vs the same seat in X0.
def access(c, byv=byv, V=V):
    rows = []
    for k, r in byv[V[c]].items():
        x0 = byv['L-X0'].get(k)
        if not x0: continue
        s = [a for a in 'AB' if seen_func(r['seat'][a])]
        if len(s) == 1: a = s[0]; rows.append((k, SC[r['seat'][a]['result']] - SC[x0['seat'][a]['result']], SC[r['seat'][a]['result']]))
    if not rows: return None
    gr = defaultdict(list)
    for k, d, sc in rows: gr[k[0]].append(d)
    G = list(gr); rng = random.Random(20261031)
    vals = sorted(mean([d for g in [rng.choice(G) for _ in G] for d in gr[g]]) for _ in range(NB))
    return {'games': len(rows), 'scoreOfHolder': rnd(mean([sc for k, d, sc in rows])), 'diffVsX0': rnd(mean([d for k, d, sc in rows])), 'ci95': [rnd(vals[int(.025 * NB)]), rnd(vals[int(.975 * NB) - 1])],
            'bothDrew': sum(all(seen_func(r['seat'][a]) for a in 'AB') for r in byv[V[c]].values()), 'neitherDrew': sum(not any(seen_func(r['seat'][a]) for a in 'AB') for r in byv[V[c]].values())}
out['cardAccess'] = {c: access(c) for c in ['A1', 'A1a', 'A1t', 'A2', 'A2s', 'A3', 'A4']}

# Sensitivity (MAIN seeds 001-010)
SENS = index(load_runs('SENS'))
sub = lambda v: {k: r for k, r in byv[v].items() if k in SENS['L-A1c4']}
sb = {**{v: sub(v) for v in ('L-X0', 'L-A1', 'L-A1a')}, **SENS}
out['sensitivity'] = {c: {'summary': {k: summary(list(sb[NAMES[c]].values()))[k] for k in ('games', 'completed', 'replayMatch', 'finalRound', 'ext11Rate', 'ext12Rate', 'holdWinRate', 'closeRate', 'lastTwoChanged', 'flipAfterR10', 'minutes', 'minutesActions', 'deckSpread', 'firstSeatScore', 'card')},
                          'vsX0': {m: contrast(sb, NAMES[c], 'L-X0', mf[m]) for m in ('ext11', 'ext12', 'close', 'lastTwoChanged', 'flipAfterR10', 'minutes', 'minutesActions', 'holdWin')}}
                      for c in ('X0', 'A1', 'A1a', 'A1c4', 'A1n1', 'A1aL')}

# Equivalence: L-A0 (this build, no experiment cards) vs PR #495 G-A on seeds 001-003
EQ = index(load_runs('EQ') + [r for r in load_runs('pilot') if r['variant'] == 'L-A0'])
ks = [k for k in EQ['L-A0'] if k in byv['G-A']]
out['equivalence'] = {'compared': len(ks), 'saveShaMatch': sum(EQ['L-A0'][k]['saveSha256'] == byv['G-A'][k]['saveSha256'] for k in ks)}
pil = load_runs('pilot')
out['pilot'] = {'games': len(pil), 'completed': sum(r['status'] == 'completed' for r in pil), 'replayMatch': sum(r.get('replay') == 'match' for r in pil)}

# ⑧ deck (main+8 vs the official 7, both seat orders) — this run (X0, A1, A3) and PR #495 G120E8 (A0 = G-A, A5 = G-D)
E8 = load_runs('E8') + load_ref('G120E8')
eight = {}
for v in ('G-A', 'L-X0', 'L-A1', 'L-A3', 'G-D'):
    xs = [(r, a, r['seat'][a]) for r in E8 if r['variant'] == v for a in 'AB' if r['seat'][a]['deckBase'] == 'main+8']
    reached = [x for r, a, x in xs if x['reached8'] is not None]; t8 = sum(x['turnsAfter8'] for x in reached)
    eight[v] = {'seats': len(xs), 'completed': sum(r['status'] == 'completed' for r, a, x in xs), 'score': rnd(mean([SC[x['result']] for r, a, x in xs])), 'reach8': rnd(len(reached) / max(1, len(xs))),
                'reach8Round': dict(sorted(Counter(x['reached8'] for x in reached).items())), 'turnsAfter8': rnd(t8 / max(1, len(reached)), 2),
                'passOnlyAfter8': rnd(sum(x['passOnlyTurnsAfter8'] for x in reached) / max(1, t8)), 'growth': rnd(mean([x['growth'] for r, a, x in xs]), 1),
                'finalRound': dict(Counter(r['final'] for r, a, x in xs))}
out['eight'] = eight
# Follow-up (PLAN-NEXT.md): A1t1 = しかける x1 (MAIN 001-020); A1n1 = すぐつかう x1 completed to 001-020 (SENS 001-010 + NEXTn1 011-020)
if glob.glob('runs/NEXT-shard*.jsonl.gz'):
    NX = index(load_runs('NEXT') + load_runs('NEXTn1') + [r for r in load_runs('SENS') if r['variant'] == 'L-A1n1'])
    nb = {**{v: byv[v] for v in ('G-A', 'L-X0', 'L-A1t', 'L-A1')}, 'L-A1t1': NX['L-A1t1'], 'L-A1n1': NX['L-A1n1']}
    NV = {c: NAMES[c] for c in ('A0', 'X0', 'A1', 'A1t', 'A1t1', 'A1n1')}
    npairs = {'A1t1-A0（総合）': ('A1t1', 'A0'), 'A1t1-X0（ルール効果）': ('A1t1', 'X0'), 'A1t1-A1t（2枚→1枚）': ('A1t1', 'A1t'),
              'A1t1-A1n1（しかける−すぐつかう、1枚）': ('A1t1', 'A1n1'), 'A1n1-X0（ルール効果）': ('A1n1', 'X0'), 'A1n1-A0（総合）': ('A1n1', 'A0')}
    out['next'] = {'conditions': {c: summary(list(nb[NV[c]].values())) for c in ('A1t1', 'A1n1')},
                   'contrasts': {name: {m: contrast(nb, NV[a], NV[b], f) for m, f in mf.items()} for name, (a, b) in npairs.items()},
                   'deckContrasts': {name: deck_contrasts(nb, NV[a], NV[b]) for name, (a, b) in npairs.items()},
                   'cardAccess': {c: access(c, nb, NV) for c in ('A1t1', 'A1n1')}}
print(json.dumps(out, ensure_ascii=False, indent=1))
