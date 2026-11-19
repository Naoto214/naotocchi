# Extra analysis on MAIN (R10 vs R12, same seeds). The R12 game is the R10 game played on: the engines differ only
# at the R10 end (final comparison vs continue) and in the 100維持 window, so the two extra rounds can be isolated.
# Usage: python3 analyze_extra.py runs/MAIN-shard*.jsonl.gz [runs/SENS-shard*.jsonl.gz] > results/extra.json
import gzip, json, sys, random
from collections import defaultdict, Counter

rows = [json.loads(l) for f in sys.argv[1:] for l in gzip.open(f, 'rt') if l.strip()]
key = lambda r: (r['group'].rsplit(':', 1)[0], r['first'])
by = defaultdict(dict)
for r in rows: by[r['variant']][key(r)] = r
R10, R12 = by['R10'], by['R12']
keys = sorted(k for k in R10 if k in R12)
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
score = {'win': 1, 'draw': .5, 'loss': 0}
out = {}

# 1. Prefix identity: same growth and stage at every round end up to R9, and up to R10 when R10 ended by final comparison
same_prefix = 0; checked = 0; diverged = []
for k in keys:
    a, b = R10[k], R12[k]
    upto = min(a['round'], b['round']) - 1  # last fully completed round in both
    ok = all(a['seat'][s]['growthEnd'][i] == b['seat'][s]['growthEnd'][i] and a['seat'][s]['stageEnd'][i] == b['seat'][s]['stageEnd'][i]
             for s in 'AB' for i in range(1, upto + 1))
    ok = ok and all(a['seat'][s]['decisions'][i] == b['seat'][s]['decisions'][i] for s in 'AB' for i in range(1, upto + 1))
    checked += 1; same_prefix += ok
    if not ok: diverged.append(k[0] + ':' + k[1])
out['prefixIdentity'] = {'checked': checked, 'identicalThroughCommonRounds': same_prefix, 'diverged': diverged[:10]}

# 2. What the two extra rounds did to the result
cat = Counter(); flips_margin = []; ext = []
for k in keys:
    a, b = R10[k], R12[k]
    wa, wb = a['result']['winner'], b['result']['winner']
    if a['result']['reason'] == '100維持' or a['round'] < 10:
        cat['endedBeforeR10End_sameGame'] += 1; continue
    ext.append(k)
    if b['round'] == 10: cat['R12_endedAtR10_by100維持'] += 1
    if wa == wb: cat['sameWinner' if wa else 'drawStaysDraw'] += 1
    elif wa and wb: cat['winnerFlipped'] += 1; flips_margin.append(abs(a['seat']['A']['growth'] - a['seat']['B']['growth']))
    elif wa and not wb: cat['winToDraw'] += 1
    else: cat['drawToWin'] += 1
n = len(ext)
out['extraRoundsEffect'] = {'gamesReachingR10End': n, **{k: v for k, v in cat.items()},
    'resultChangedShare': rnd((cat['winnerFlipped'] + cat['winToDraw'] + cat['drawToWin']) / n),
    'winnerFlippedShare': rnd(cat['winnerFlipped'] / n),
    'flippedMarginAtR10': dict(sorted(Counter(flips_margin).items()))}
# Margin at R10 end -> probability the R12 result differs
bins = defaultdict(lambda: [0, 0])
for k in ext:
    a, b = R10[k], R12[k]
    m = abs(a['seat']['A']['growth'] - a['seat']['B']['growth'])
    bins[min(m, 40)][0] += 1; bins[min(m, 40)][1] += a['result']['winner'] != b['result']['winner']
out['changeByR10Margin'] = {str(m): {'games': v[0], 'changed': rnd(v[1] / v[0])} for m, v in sorted(bins.items())}

# 2b. Same yardstick for both formats: provisional result at the end of round F-2 (leader or tie) vs the final result
def provisional(r, at):
    a, b = r['seat']['A']['growthEnd'][at], r['seat']['B']['growthEnd'][at]
    return 'A' if a > b else 'B' if b > a else None
last2 = {}
for v, F in (('R10', 10), ('R12', 12)):
    gs = [by[v][k] for k in keys if by[v][k]['round'] > F - 2]
    ch = [provisional(r, F - 2) != r['result']['winner'] for r in gs]
    fl = [provisional(r, F - 2) is not None and r['result']['winner'] is not None and provisional(r, F - 2) != r['result']['winner'] for r in gs]
    last2[v] = {'games': len(gs), 'resultChangedInLast2Rounds': rnd(mean(ch)), 'leaderOvertakenInLast2Rounds': rnd(mean(fl))}
out['lastTwoRounds'] = last2

# 3. Growth saturation: seats already at 100 when R10 ends (in games that continue)
sat = [R12[k]['seat'][s]['growthEnd'][10] == 100 for k in ext for s in 'AB' if R12[k]['round'] > 10]
out['saturation'] = {'seatsAt100AtR10End': rnd(mean(sat)),
    'R12gamesBoth100Final': rnd(mean([R12[k]['seat']['A']['growth'] == R12[k]['seat']['B']['growth'] == 100 for k in keys]))}

# 4. Deck score change with paired bootstrap over seed groups
groups = defaultdict(list)
for k in keys: groups[k[0]].append(k)
def deckscore(variant, gl, d):
    v = [score[by[variant][k]['seat'][s]['result']] for g in gl for k in groups[g] for s in 'AB'
         if by[variant][k]['seat'][s]['deck'] == d and by[variant][k]['seat']['B' if s == 'A' else 'A']['deck'] != d]
    return mean(v)
rng = random.Random(20261030); G = list(groups)
deck = {}
for d in DECKS:
    pt = deckscore('R12', G, d) - deckscore('R10', G, d); bs = []
    for _ in range(1000):
        sm = [rng.choice(G) for _ in G]
        x, y = deckscore('R12', sm, d), deckscore('R10', sm, d)
        if x is not None and y is not None: bs.append(x - y)
    bs.sort(); deck[d] = {'R10': rnd(deckscore('R10', G, d)), 'R12': rnd(deckscore('R12', G, d)), 'diff': rnd(pt), 'ci95': [rnd(bs[25]), rnd(bs[974])]}
out['deckScorePaired'] = deck
def spread(variant, gl):
    v = [deckscore(variant, gl, d) for d in DECKS]; return max(v) - min(v)
bs = []
for _ in range(1000):
    sm = [rng.choice(G) for _ in G]; bs.append(spread('R12', sm) - spread('R10', sm))
bs.sort(); out['deckSpreadDiff'] = {'diff': rnd(spread('R12', G) - spread('R10', G)), 'ci95': [rnd(bs[25]), rnd(bs[974])]}

# 5. Highest stage reached per deck (no official CPU deck contains a ⑧ main)
out['stage7ByDeck'] = {v: {d: rnd(mean([by[v][k]['seat'][s]['maxStage'] >= 7 for k in keys for s in 'AB' if by[v][k]['seat'][s]['deck'] == d])) for d in DECKS} for v in ('R10', 'R12')}

# 6. What happens in R11 and R12 (own turns), per seat-turn
acts = ['timeSkips', 'transforms', 'challenges', 'relAdvance', 'trapSet', 'trapFire', 'companionAbil', 'partnerAbil', 'actionPlays', 'companionPlace', 'worldPlace']
late = {}
for rr in (9, 10, 11, 12):
    seats = [R12[k]['seat'][s] for k in keys for s in 'AB' if R12[k]['round'] >= rr]
    T = [t for x in seats for t in x['turns'] if t['round'] == rr]
    late[rr] = {'seatTurns': len(T), 'nonPassPerTurn': rnd(mean([t['nonPass'] for t in T]), 2), 'passOnly': rnd(mean([t['nonPass'] == 0 for t in T])),
                'growthDeltaPerTurn': rnd(mean([t['growthDelta'] for t in T]), 2), 'zeroGrowthTurn': rnd(mean([t['growthDelta'] <= 0 for t in T])),
                'births': rnd(mean([x['births'].count(rr) for x in seats]), 3), 'partnerPlace': rnd(mean([x['partnerPlace'].count(rr) for x in seats]), 3),
                'marriages': rnd(mean([x['marriage'] == rr for x in seats]), 3),
                **{a: rnd(mean([x[a][rr] for x in seats]), 3) for a in acts}}
out['R12lateRounds'] = late

# 7. Paired estimated time and decisions
est = lambda r: (sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB')
                 + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60
out['estMinutes'] = {'R10': rnd(mean([est(R10[k]) for k in keys]), 1), 'R12': rnd(mean([est(R12[k]) for k in keys]), 1),
                     'ratio': rnd(mean([est(R12[k]) for k in keys]) / mean([est(R10[k]) for k in keys]), 3)}
# 8. Time operations per own turn (for the physical counter)
for v in ('R10', 'R12'):
    seats = [by[v][k]['seat'][s] for k in keys for s in 'AB']
    turns = sum(len(x['turns']) for x in seats)
    out.setdefault('timeOps', {})[v] = {'payEventsPerOwnTurn': rnd(sum(sum(x['payEvents']) for x in seats) / turns, 2),
        'timeUnitsSpentPerOwnTurn': rnd(sum(sum(x['spentOwn']) + sum(x['spentOpp']) for x in seats) / turns, 2),
        'oppTurnPayEventsShare': rnd(sum(sum(x['spentOpp']) for x in seats) / max(1, sum(sum(x['spentOwn']) + sum(x['spentOpp']) for x in seats)), 3),
        'maxCostPaidOnce': None}

# 9. Sensitivity (R12h, CPU round constants re-anchored) vs R12 on the same seeds
if 'R12h' in by:
    H = by['R12h']; hk = [k for k in H if k in R12]
    sc = lambda v, k: score[by[v][k]['seat']['A']['result']]
    g = lambda v, k: (by[v][k]['seat']['A']['growth'] + by[v][k]['seat']['B']['growth']) / 2
    out['sensitivity'] = {'games': len(hk),
        'sameWinnerR12hVsR12': rnd(mean([H[k]['result']['winner'] == R12[k]['result']['winner'] for k in hk])),
        'growth': {'R12': rnd(mean([g('R12', k) for k in hk]), 2), 'R12h': rnd(mean([g('R12h', k) for k in hk]), 2)},
        'earlyWin': {'R12': rnd(mean([R12[k]['result']['reason'] == '100維持' for k in hk])), 'R12h': rnd(mean([H[k]['result']['reason'] == '100維持' for k in hk]))},
        'firstSeat': {'R12': rnd(mean([sc('R12', k) for k in hk])), 'R12h': rnd(mean([sc('R12h', k) for k in hk]))},
        'deckScore': {d: {'R12': rnd(mean([score[R12[k]['seat'][s]['result']] for k in hk for s in 'AB' if R12[k]['seat'][s]['deck'] == d and R12[k]['seat']['B' if s == 'A' else 'A']['deck'] != d])),
                          'R12h': rnd(mean([score[H[k]['seat'][s]['result']] for k in hk for s in 'AB' if H[k]['seat'][s]['deck'] == d and H[k]['seat']['B' if s == 'A' else 'A']['deck'] != d]))} for d in DECKS},
        'R11R12nonPassPerTurn': {v: rnd(mean([t['nonPass'] for k in hk for s in 'AB' for t in by[v][k]['seat'][s]['turns'] if t['round'] >= 11]), 2) for v in ('R12', 'R12h')},
        'R11R12passOnly': {v: rnd(mean([t['nonPass'] == 0 for k in hk for s in 'AB' for t in by[v][k]['seat'][s]['turns'] if t['round'] >= 11])) for v in ('R12', 'R12h')}}
print(json.dumps(out, ensure_ascii=False, indent=1))
