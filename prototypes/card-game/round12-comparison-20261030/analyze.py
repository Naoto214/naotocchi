# Aggregates the 10-round / 12-round comparison (PLAN.md §5). Pure standard library.
# Usage: python3 analyze.py runs/MAIN-*.jsonl.gz [runs/SENS-*.jsonl.gz ...] > results/summary.json
import gzip, json, sys, random, statistics as st
from collections import defaultdict, Counter

def load(paths):
    for f in paths:
        for l in (gzip.open(f, 'rt') if f.endswith('.gz') else open(f)):
            if l.strip():
                yield json.loads(l)

rows = list(load(sys.argv[1:]))
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
base = lambda r: r['group'].rsplit(':', 1)[0]
mean = lambda xs: (sum(xs) / len(xs)) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
score = lambda res: {'win': 1.0, 'draw': 0.5, 'loss': 0.0}[res]

def boot(groups, fn, n=2000, seed=20261030):
    """Percentile CI over resampled seed groups. fn(list_of_groups) -> number."""
    rng = random.Random(seed); keys = list(groups); vals = []
    for _ in range(n):
        sample = [groups[rng.choice(keys)] for _ in keys]
        v = fn(sample)
        if v is not None: vals.append(v)
    vals.sort()
    return [rnd(vals[int(.025 * len(vals))]), rnd(vals[int(.975 * len(vals)) - 1])] if vals else None

def leader_series(r):
    F = r['final']; A, B = r['seat']['A']['growthEnd'], r['seat']['B']['growthEnd']
    last = r['round']
    out = []
    for k in range(1, last + 1):
        d = A[k] - B[k]
        out.append('A' if d > 0 else 'B' if d < 0 else '=')
    return out

def comeback(r, at):
    """Winner was strictly behind at the end of round `at` (decided games that reached that round)."""
    w = r['result']['winner']
    if not w or r['round'] < at or (r['round'] == at and r['result']['reason'] == '100維持'):
        return None
    o = 'B' if w == 'A' else 'A'
    return r['seat'][w]['growthEnd'][at] < r['seat'][o]['growthEnd'][at]

def lock_round(r):
    """First round from which the final winner led at every later round end (None for draws)."""
    w = r['result']['winner']
    if not w: return None
    s = leader_series(r); k = len(s)
    while k > 0 and s[k - 1] == w: k -= 1
    return k + 1 if k < len(s) else len(s)

def lead_changes(r, start=1):
    s = leader_series(r); prev = None; n = 0
    for i, x in enumerate(s, 1):
        if x == '=': continue
        if prev and x != prev and i >= start: n += 1
        prev = x
    return n

def per_variant(rs):
    F = rs[0]['final']
    comp = [r for r in rs if r['status'] == 'completed']
    seats = [(r, a, r['seat'][a]) for r in comp for a in 'AB']
    out = {'matches': len(rs), 'completed': len(comp), 'abnormal': len(rs) - len(comp),
           'replayMatch': sum(r.get('replay') == 'match' for r in comp), 'final': F}
    # Results
    reasons = Counter(r['result']['reason'] for r in comp)
    out['endReason'] = dict(reasons)
    out['earlyWinRate'] = rnd(reasons.get('100維持', 0) / len(comp))
    out['endRound'] = dict(sorted(Counter(r['round'] for r in comp).items()))
    out['drawRate'] = rnd(sum(not r['result']['winner'] for r in comp) / len(comp))
    out['firstSeatScore'] = rnd(mean([score(r['seat']['A']['result']) for r in comp]))
    # Deck matrix (row deck score vs column deck), off-mirror
    mat = defaultdict(list)
    for r, a, x in seats:
        o = 'B' if a == 'A' else 'A'
        mat[(x['deck'], r['seat'][o]['deck'])].append(score(x['result']))
    out['deckVsDeck'] = {d: {e: rnd(mean(mat[(d, e)])) for e in DECKS} for d in DECKS}
    deckScore = {d: rnd(mean([v for e in DECKS if e != d for v in mat[(d, e)]])) for d in DECKS}
    out['deckScore'] = deckScore
    vals = list(deckScore.values())
    out['deckScoreSpread'] = {'max-min': rnd(max(vals) - min(vals)), 'sd': rnd(st.pstdev(vals))}
    out['deckFirstSeat'] = {d: rnd(mean([score(x['result']) for r, a, x in seats if x['deck'] == d and a == 'A'])) for d in DECKS}
    # Growth
    g = [x['growth'] for r, a, x in seats]
    out['growth'] = {'mean': rnd(mean(g), 2), 'median': st.median(g), 'at100': rnd(sum(v == 100 for v in g) / len(g)),
                     'hist10': dict(sorted(Counter(min(v // 10 * 10, 100) for v in g).items()))}
    out['growthByDeck'] = {d: rnd(mean([x['growth'] for r, a, x in seats if x['deck'] == d]), 1) for d in DECKS}
    out['margin'] = {'mean': rnd(mean([abs(r['seat']['A']['growth'] - r['seat']['B']['growth']) for r in comp]), 2),
                     'within10': rnd(mean([abs(r['seat']['A']['growth'] - r['seat']['B']['growth']) <= 10 for r in comp])),
                     'both100': rnd(mean([r['seat']['A']['growth'] == 100 and r['seat']['B']['growth'] == 100 for r in comp]))}
    # Main stage
    out['maxStage'] = dict(sorted(Counter(x['maxStage'] for r, a, x in seats).items()))
    out['reach8Rate'] = rnd(mean([x['reached8'] is not None for r, a, x in seats]))
    out['reach8ByDeck'] = {d: rnd(mean([x['reached8'] is not None for r, a, x in seats if x['deck'] == d])) for d in DECKS}
    out['reach8Round'] = dict(sorted(Counter(x['reached8'] for r, a, x in seats if x['reached8']).items()))
    out['stageAtEnd'] = rnd(mean([x['stageEnd'][r['round']] for r, a, x in seats]), 2)
    # Egg wait: round of the first birth
    fb = [x['births'][0] if x['births'] else None for r, a, x in seats]
    out['eggWait'] = {'meanFirstBirthRound': rnd(mean([v for v in fb if v]), 2), 'neverBorn': rnd(mean([v is None for v in fb])),
                      'dist': dict(sorted(Counter(v if v else 0 for v in fb).items()))}
    sumr = lambda x, key, lo=1, hi=99: sum(x[key][lo:hi + 1])
    out['perSeatPerGame'] = {k: rnd(mean([sumr(x, k) for r, a, x in seats]), 2) for k in
                             ['timeSkips', 'transforms', 'challenges', 'relAdvance', 'trapSet', 'trapFire', 'companionAbil', 'partnerAbil', 'companionPlace', 'worldPlace', 'actionPlays', 'nonPass', 'decisions']}
    out['births'] = rnd(mean([len(x['births']) for r, a, x in seats]), 2)
    # Love
    out['love'] = {
        'partnerPlacedRate': rnd(mean([bool(x['partnerPlace']) for r, a, x in seats])),
        'placementsPerSeat': rnd(mean([len(x['partnerPlace']) for r, a, x in seats]), 2),
        'maxRel': dict(sorted(Counter(-1 if x['maxRel'] is None else x['maxRel'] for r, a, x in seats).items())),
        'marriageRate': rnd(mean([x['marriage'] is not None for r, a, x in seats])),
        'marriageRound': dict(sorted(Counter(x['marriage'] for r, a, x in seats if x['marriage']).items())),
        'breakupsPerSeat': rnd(mean([sum(l['stage'] is not None and l['stage'] < 4 for l in x['leaves']) for r, a, x in seats]), 3),
        'divorcesPerSeat': rnd(mean([sum(l['stage'] == 4 for l in x['leaves']) for r, a, x in seats]), 3),
        'breakupGamesRate': rnd(mean([any(l['stage'] is not None and l['stage'] < 4 for l in x['leaves']) for r, a, x in seats])),
        'divorceGamesRate': rnd(mean([any(l['stage'] == 4 for l in x['leaves']) for r, a, x in seats])),
    }
    out['loveByDeck'] = {d: {'marriage': rnd(mean([x['marriage'] is not None for r, a, x in seats if x['deck'] == d])),
                             'placed': rnd(mean([bool(x['partnerPlace']) for r, a, x in seats if x['deck'] == d]))} for d in DECKS}
    # Comebacks / decisiveness
    decided = [r for r in comp if r['result']['winner']]
    cb = lambda at: [v for v in (comeback(r, at) for r in decided) if v is not None]
    out['comeback'] = {'behindAtR8': rnd(mean(cb(8))), 'behindAtFinalMinus2': rnd(mean(cb(F - 2))), 'behindAtFinalMinus1': rnd(mean(cb(F - 1))),
                       'behindAtR6': rnd(mean(cb(6))), 'nR8': len(cb(8))}
    lr = [lock_round(r) for r in decided]
    out['lockRound'] = {'mean': rnd(mean(lr), 2), 'meanRelative': rnd(mean([l / F for l in lr]), 3),
                        'lockedByR8': rnd(mean([l <= 8 for l in lr])), 'lockedInLast2': rnd(mean([l >= F - 1 for l in lr])),
                        'dist': dict(sorted(Counter(lr).items()))}
    out['leadChanges'] = {'all': rnd(mean([lead_changes(r) for r in comp]), 3), 'fromR8': rnd(mean([lead_changes(r, 8) for r in comp]), 3)}
    # Time
    tg = [sum(x['granted']) for r, a, x in seats]; so = [sum(x['spentOwn']) for r, a, x in seats]; sp = [sum(x['spentOpp']) for r, a, x in seats]
    ex = [sum(x['expired']) + x['expiredAtEnd'] for r, a, x in seats]
    out['time'] = {'granted': rnd(mean(tg), 2), 'spentOwnTurn': rnd(mean(so), 2), 'spentOppTurn': rnd(mean(sp), 2), 'expired': rnd(mean(ex), 2),
                   'expiredShare': rnd(sum(ex) / sum(tg)), 'oppTurnShareOfSpent': rnd(sum(sp) / max(1, sum(so) + sum(sp))),
                   'payEvents': rnd(mean([sum(x.get('payEvents', [0])) for r, a, x in seats]), 2),
                   'ownTurns': rnd(mean([len(x['turns']) for r, a, x in seats]), 2),
                   'maxSingleRoundTime': F}
    # Per-round profile (own turns)
    prof = {}
    for k in range(1, F + 1):
        T = [t for r, a, x in seats for t in x['turns'] if t['round'] == k]
        if not T: continue
        reached = [(r, x) for r, a, x in seats if r['round'] >= k]
        prof[k] = {'turns': len(T), 'nonPassPerTurn': rnd(mean([t['nonPass'] for t in T]), 2), 'passOnlyRate': rnd(mean([t['nonPass'] == 0 for t in T])),
                   'optionsAtStart': rnd(mean([t['options'] for t in T]), 2), 'noOptionRate': rnd(mean([t['options'] == 0 for t in T])),
                   'hand': rnd(mean([t['hand'] for t in T]), 2), 'deck': rnd(mean([t['deck'] for t in T]), 2), 'emptyDeck': rnd(mean([t['deck'] == 0 for t in T])),
                   'growthDelta': rnd(mean([t['growthDelta'] for t in T]), 2), 'oppDelta': rnd(mean([t['oppDelta'] for t in T]), 2),
                   'stage': rnd(mean([t['stage'] for t in T]), 2), 'at8Rate': rnd(mean([t['after8'] for t in T])),
                   'timeAtStart': rnd(mean([t['time'] for t in T]), 2),
                   'spent': rnd(mean([x['spentOwn'][k] + x['spentOpp'][k] for r, x in reached]), 2),
                   'expired': rnd(mean([x['expired'][k] if k < r['round'] else x['expiredAtEnd'] for r, x in reached]), 2),
                   **{key: rnd(mean([x[key][k] for r, x in reached]), 3) for key in ['timeSkips', 'transforms', 'challenges', 'relAdvance', 'trapSet', 'trapFire', 'companionAbil', 'partnerAbil', 'actionPlays']},
                   'births': rnd(mean([x['births'].count(k) for r, x in reached]), 3)}
    out['byRound'] = prof
    a8 = [x for r, a, x in seats if x['turnsAfter8']]
    out['after8'] = {'seats': len(a8), 'turnsAfter8': rnd(mean([x['turnsAfter8'] for x in a8]), 2),
                     'passOnlyShare': rnd(sum(x['passOnlyTurnsAfter8'] for x in a8) / max(1, sum(x['turnsAfter8'] for x in a8))),
                     'actsPerTurnAfter8': rnd(sum(x['actsAfter8'] for x in a8) / max(1, sum(x['turnsAfter8'] for x in a8)), 2)}
    # Handling time proxy
    dec = [sum(r['seat'][a]['decisions'][1:]) for r in comp for a in 'AB']
    npass = [sum(r['seat'][a]['nonPass'][1:]) for r in comp for a in 'AB']
    turns = [len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']) for r in comp]
    est = [(sum(r['seat'][a]['nonPass'][1:]) * 12 + (sum(r['seat'][a]['decisions'][1:]) - sum(r['seat'][a]['nonPass'][1:])) * 3 for a in 'AB') for r in comp]
    est = [sum(e) + 5 * t for e, t in zip(est, turns)]
    out['tempo'] = {'decisionsPerGame': rnd(2 * mean(dec), 1), 'nonPassPerGame': rnd(2 * mean(npass), 1), 'turnsPerGame': rnd(mean(turns), 2),
                    'estMinutes': rnd(mean(est) / 60, 1), 'cpuMsPerGame': rnd(mean([r['elapsedMs'] for r in comp]), 0)}
    rc = Counter(); rcr = defaultdict(Counter)
    for r, a, x in seats:
        for c, lst in x['roundCards'].items():
            rc[c] += len(lst)
            for k in lst: rcr[c][k] += 1
    out['roundCards'] = {c: {'plays': rc[c], 'byRound': dict(sorted(rcr[c].items()))} for c in rc}
    return out

by = defaultdict(list)
for r in rows: by[r['variant']].append(r)
summary = {v: per_variant(rs) for v, rs in sorted(by.items())}

# Paired differences R12 - R10 (and R12h - R10) by seed group, bootstrap CI
def paired(vA, vB):
    gA, gB = defaultdict(list), defaultdict(list)
    for r in by[vA]: gA[base(r)].append(r)
    for r in by[vB]: gB[base(r)].append(r)
    keys = [k for k in gA if k in gB]
    G = {k: (gA[k], gB[k]) for k in keys}
    def metric(f):
        def fn(sample):
            a = [f(r) for p in sample for r in p[0] if r['status'] == 'completed']
            b = [f(r) for p in sample for r in p[1] if r['status'] == 'completed']
            a = [v for v in a if v is not None]; b = [v for v in b if v is not None]
            return (mean(b) - mean(a)) if a and b else None
        return fn
    F = {
        'growthMean': lambda r: (r['seat']['A']['growth'] + r['seat']['B']['growth']) / 2,
        'firstSeatScore': lambda r: score(r['seat']['A']['result']),
        'earlyWin': lambda r: r['result']['reason'] == '100維持',
        'draw': lambda r: not r['result']['winner'],
        'reach8': lambda r: ((r['seat']['A']['reached8'] is not None) + (r['seat']['B']['reached8'] is not None)) / 2,
        'marriage': lambda r: ((r['seat']['A']['marriage'] is not None) + (r['seat']['B']['marriage'] is not None)) / 2,
        'comebackR8': lambda r: (lambda c: None if c is None else float(c))(comeback(r, 8)) if r['result']['winner'] else None,
        'comebackFinalMinus2': lambda r: (lambda c: None if c is None else float(c))(comeback(r, r['final'] - 2)) if r['result']['winner'] else None,
        'leadChangesFromR8': lambda r: lead_changes(r, 8),
        'decisions': lambda r: sum(r['seat']['A']['decisions'][1:]) + sum(r['seat']['B']['decisions'][1:]),
        'nonPass': lambda r: sum(r['seat']['A']['nonPass'][1:]) + sum(r['seat']['B']['nonPass'][1:]),
        'margin': lambda r: abs(r['seat']['A']['growth'] - r['seat']['B']['growth']),
        'expiredShare': lambda r: sum(sum(r['seat'][a]['expired']) + r['seat'][a]['expiredAtEnd'] for a in 'AB') / max(1, sum(sum(r['seat'][a]['granted']) for a in 'AB')),
    }
    res = {'groups': len(keys)}
    for k, f in F.items():
        point = metric(f)(list(G.values()))
        res[k] = {'diff': rnd(point), 'ci95': boot(G, metric(f))}
    # Same-seed outcome agreement: does the same seed/seat produce the same winner?
    same = []
    for k in keys:
        for ra in gA[k]:
            rb = next((x for x in gB[k] if x['first'] == ra['first']), None)
            if rb and ra['status'] == rb['status'] == 'completed':
                same.append(ra['result']['winner'] == rb['result']['winner'])
    res['sameWinnerRate'] = rnd(mean(same))
    return res

summary['paired'] = {}
if 'R10' in by and 'R12' in by: summary['paired']['R12-R10'] = paired('R10', 'R12')
if 'R10' in by and 'R12h' in by: summary['paired']['R12h-R10'] = paired('R10', 'R12h')
if 'R12' in by and 'R12h' in by: summary['paired']['R12h-R12'] = paired('R12', 'R12h')
print(json.dumps(summary, ensure_ascii=False, indent=1))
