# Follow-up aggregation (PLAN-EXTRA.md §4): ⑧ decks (E8) and すれちがい love decks (EL), R10 vs R12 on shared seeds.
# Usage: python3 analyze_followup.py > results/followup.json   (reads runs/E8-shard*.jsonl.gz and runs/EL-shard*.jsonl.gz)
import gzip, json, glob, random
from collections import defaultdict, Counter

mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
SC = {'win': 1, 'draw': .5, 'loss': 0}
other = lambda a: 'B' if a == 'A' else 'A'

def load(name):
    rows = [json.loads(l) for f in sorted(glob.glob(f'runs/{name}-shard*.jsonl.gz')) for l in gzip.open(f, 'rt') if l.strip()]
    by = defaultdict(dict)
    for r in rows: by[r['variant']][(r['group'].rsplit(':', 1)[0], r['first'])] = r
    return rows, by

def boot_diff(keys, f, n=2000, seed=20261030):
    """Paired R12-R10 difference of mean(f(r)) over seed groups; f returns a list of values per game."""
    groups = defaultdict(list)
    for k in keys: groups[k[0]].append(k)
    G = list(groups)
    def d(gs):
        a = [v for g in gs for k in groups[g] for v in f(BY['R10'][k])]
        b = [v for g in gs for k in groups[g] for v in f(BY['R12'][k])]
        return mean(b) - mean(a) if a and b else None
    rng = random.Random(seed); vals = sorted(v for v in (d([rng.choice(G) for _ in G]) for _ in range(n)) if v is not None)
    return {'diff': rnd(d(G)), 'ci95': [rnd(vals[int(.025 * len(vals))]), rnd(vals[int(.975 * len(vals)) - 1])]}

def provisional(r, at):
    a, b = r['seat']['A']['growthEnd'][at], r['seat']['B']['growthEnd'][at]
    return 'A' if a > b else 'B' if b > a else None

def common(by, keys, focus):
    """Metrics shared by both sets. `focus(r, seat)` -> True for the seats under study (⑧ deck / lover deck)."""
    out = {}
    for v, F in (('R10', 10), ('R12', 12)):
        rs = [by[v][k] for k in keys]
        fs = [(r, a, r['seat'][a]) for r in rs for a in 'AB' if focus(r, a)]
        turns = [len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']) for r in rs]
        est = [(sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB') + 5 * t) / 60 for r, t in zip(rs, turns)]
        late = [r for r in rs if r['round'] > F - 2]
        out[v] = {
            'games': len(rs), 'abnormal': sum(r['status'] != 'completed' for r in rs), 'replayMatch': sum(r.get('replay') == 'match' for r in rs),
            'focusScore': rnd(mean([SC[x['result']] for r, a, x in fs])),
            'focusGrowth': rnd(mean([x['growth'] for r, a, x in fs]), 2), 'otherGrowth': rnd(mean([r['seat'][other(a)]['growth'] for r, a, x in fs]), 2),
            'earlyWin': rnd(mean([r['result']['reason'] == '100維持' for r in rs])),
            'earlyWinByFocus': rnd(mean([r['result']['reason'] == '100維持' and r['result']['winner'] == a for r, a, x in fs])),
            'draw': rnd(mean([not r['result']['winner'] for r in rs])),
            'endRound': dict(sorted(Counter(r['round'] for r in rs).items())),
            'firstSeatScore': rnd(mean([SC[r['seat']['A']['result']] for r in rs])),
            'resultChangedInLast2Rounds': rnd(mean([provisional(r, F - 2) != r['result']['winner'] for r in late])),
            'leaderOvertakenInLast2Rounds': rnd(mean([provisional(r, F - 2) is not None and r['result']['winner'] not in (None, provisional(r, F - 2)) for r in late])),
            'decisionsPerGame': rnd(mean([sum(r['seat'][s]['decisions'][1:]) for r in rs for s in 'AB']) * 2, 1),
            'estMinutes': rnd(mean(est), 1),
            'timeExpiredShare': rnd(sum(sum(x['expired']) + x['expiredAtEnd'] for r in rs for x in r['seat'].values()) / sum(sum(x['granted']) for r in rs for x in r['seat'].values())),
        }
    # Same game stopped at R10 vs played on to R12
    ext = [k for k in keys if by['R10'][k]['round'] == 10 and by['R10'][k]['result']['reason'] != '100維持']
    ch = Counter()
    for k in ext:
        wa, wb = by['R10'][k]['result']['winner'], by['R12'][k]['result']['winner']
        ch['same' if wa == wb else 'flipped' if wa and wb else 'winToDraw' if wa else 'drawToWin'] += 1
    out['R10vsR12sameGame'] = {'games': len(ext), **ch, 'changedShare': rnd(1 - ch['same'] / len(ext))}
    out['prefixIdentical'] = sum(all(by['R10'][k]['seat'][s]['growthEnd'][i] == by['R12'][k]['seat'][s]['growthEnd'][i] for s in 'AB'
                                     for i in range(1, min(by['R10'][k]['round'], by['R12'][k]['round']))) for k in keys)
    out['paired'] = {
        'focusScore': boot_diff(keys, lambda r: [SC[r['seat'][a]['result']] for a in 'AB' if focus(r, a)]),
        'earlyWin': boot_diff(keys, lambda r: [r['result']['reason'] == '100維持']),
        'estMinutes': boot_diff(keys, lambda r: [(sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB') + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60]),
    }
    return out

result = {}

# ---------- E8: ⑧ decks ----------
rows, BY = load('E8')
keys = sorted(k for k in BY['R10'] if k in BY['R12'])
is8 = lambda r, a: r['seat'][a]['deck'].endswith('+8')
e8 = common(BY, keys, is8)
for v, F in (('R10', 10), ('R12', 12)):
    fs = [(r, a, r['seat'][a]) for r in (BY[v][k] for k in keys) for a in 'AB' if is8(r, a)]
    reached = [x for r, a, x in fs if x['reached8'] is not None]
    a8 = [x for x in reached if x['turnsAfter8']]
    t8 = sum(x['turnsAfter8'] for x in a8)
    e8[v].update({
        'reach8Rate': rnd(len(reached) / len(fs)),
        'reach8RateByDeck': {d: rnd(mean([x['reached8'] is not None for r, a, x in fs if x['deck'] == d])) for d in ('main+8', 'balance+8')},
        'reach8ByR10End': rnd(mean([x['reached8'] is not None and x['reached8'] <= 10 for r, a, x in fs])),
        'reach8Round': dict(sorted(Counter(x['reached8'] for x in reached).items())),
        'reach8InR11R12': rnd(mean([x['reached8'] is not None and x['reached8'] > 10 for r, a, x in fs])),
        'maxStage': dict(sorted(Counter(x['maxStage'] for r, a, x in fs).items())),
        'turnsAfter8PerReacher': rnd(t8 / max(1, len(reached)), 2),
        'actsPerTurnAfter8': rnd(sum(x['actsAfter8'] for x in a8) / max(1, t8), 2),
        'passOnlyShareAfter8': rnd(sum(x['passOnlyTurnsAfter8'] for x in a8) / max(1, t8)),
        'growthPerTurnAfter8': rnd(sum(x['growthAfter8'] for x in a8) / max(1, t8), 2),
        'main8AbilPerReacher': rnd(mean([x['main8Abil'] for x in reached]), 2),
        'scoreIfReached8': rnd(mean([SC[x['result']] for r, a, x in fs if x['reached8'] is not None])),
        'scoreIfNot8': rnd(mean([SC[x['result']] for r, a, x in fs if x['reached8'] is None])),
        'growthIfReached8': rnd(mean([x['growth'] for x in reached]), 1),
        'timeSkipsPerSeat': rnd(mean([sum(x['timeSkips']) for r, a, x in fs]), 2),
        'transformsPerSeat': rnd(mean([sum(x['transforms']) for r, a, x in fs]), 2),
        'scoreVsOpponent': {o: rnd(mean([SC[x['result']] for r, a, x in fs if r['seat'][other(a)]['deck'] == o])) for o in ('main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance')},
    })
e8['paired'].update({
    'reach8': boot_diff(keys, lambda r: [r['seat'][a]['reached8'] is not None for a in 'AB' if is8(r, a)]),
    'turnsAfter8': boot_diff(keys, lambda r: [r['seat'][a]['turnsAfter8'] for a in 'AB' if is8(r, a) and r['seat'][a]['reached8'] is not None]),
})
result['E8'] = e8

# ---------- EL: lover decks vs すれちがい decks ----------
rows, BY = load('EL')
keys = sorted(k for k in BY['R10'] if k in BY['R12'])
isLover = lambda r, a: r['seat'][a]['deck'] in ('partner', 'balance')
el = common(BY, keys, isLover)
for v, F in (('R10', 10), ('R12', 12)):
    fs = [(r, a, r['seat'][a]) for r in (BY[v][k] for k in keys) for a in 'AB' if isLover(r, a)]
    opp = [(r, a, r['seat'][other(a)]) for r, a, x in fs]
    br = lambda x: [l for l in x['leaves'] if l['stage'] is not None and l['stage'] < 4]
    dv = lambda x: [l for l in x['leaves'] if l['stage'] == 4]
    el[v].update({
        'placedRate': rnd(mean([bool(x['partnerPlace']) for r, a, x in fs])),
        'marriageRate': rnd(mean([x['marriage'] is not None for r, a, x in fs])),
        'marriedAtEnd': rnd(mean([x['relEnd'] == 4 for r, a, x in fs])),
        'marriageRound': dict(sorted(Counter(x['marriage'] for r, a, x in fs if x['marriage']).items())),
        'breakupsPerSeat': rnd(mean([len(br(x)) for r, a, x in fs]), 3), 'breakupRate': rnd(mean([bool(br(x)) for r, a, x in fs])),
        'divorcesPerSeat': rnd(mean([len(dv(x)) for r, a, x in fs]), 3), 'divorceRate': rnd(mean([bool(dv(x)) for r, a, x in fs])),
        'leaveRound': dict(sorted(Counter(l['round'] for r, a, x in fs for l in x['leaves']).items())),
        'leaveInR11R12': rnd(mean([sum(l['round'] > 10 for l in x['leaves']) for r, a, x in fs]), 3),
        'byOpponentShare': rnd(mean([l['byOpponent'] for r, a, x in fs for l in x['leaves']])),
        'replacedAfterLeave': rnd(mean([len(x['partnerPlace']) > 1 for r, a, x in fs if x['leaves']])),
        'remarriedAfterLeave': rnd(mean([x['relEnd'] == 4 for r, a, x in fs if x['leaves']])),
        'misunderstandingPlays': rnd(mean([y['plays'].get('E-misunderstanding', 0) for r, a, y in opp]), 3),
        'reconciliationPlays': rnd(mean([x['plays'].get('E-reconciliation', 0) for r, a, x in fs]), 3),
        'scoreIfLeft': rnd(mean([SC[x['result']] for r, a, x in fs if x['leaves']])),
        'scoreIfNoLeave': rnd(mean([SC[x['result']] for r, a, x in fs if not x['leaves']])),
        'scoreVsOpponent': {o: rnd(mean([SC[x['result']] for r, a, x in fs if r['seat'][other(a)]['deck'] == o])) for o in ('challenge+S', 'growth+S', 'item+S', 'partner+S')},
    })
el['paired'].update({
    'marriage': boot_diff(keys, lambda r: [r['seat'][a]['marriage'] is not None for a in 'AB' if isLover(r, a)]),
    'marriedAtEnd': boot_diff(keys, lambda r: [r['seat'][a]['relEnd'] == 4 for a in 'AB' if isLover(r, a)]),
    'breakups': boot_diff(keys, lambda r: [sum(l['stage'] is not None and l['stage'] < 4 for l in r['seat'][a]['leaves']) for a in 'AB' if isLover(r, a)]),
    'divorces': boot_diff(keys, lambda r: [sum(l['stage'] == 4 for l in r['seat'][a]['leaves']) for a in 'AB' if isLover(r, a)]),
})
result['EL'] = el
print(json.dumps(result, ensure_ascii=False, indent=1))
