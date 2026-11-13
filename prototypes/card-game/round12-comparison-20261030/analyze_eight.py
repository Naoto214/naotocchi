# ⑧ in the CPU decks (EIGHT.md). Reuses MAIN (official decks, R10/R12) and E8 (⑧ decks, R10/R12); adds only C8 (R10):
# official main / balance and main+8lite on the E8 seeds, so every ⑧ variant is paired with its official control.
# Usage: python3 analyze_eight.py > results/eight.json
import gzip, json, glob, random
from collections import defaultdict, Counter

mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, k=3: None if x is None else round(x, k)
SC = {'win': 1, 'draw': .5, 'loss': 0}
OFF = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
other = lambda a: 'B' if a == 'A' else 'A'
rows = lambda n: [json.loads(l) for f in sorted(glob.glob(f'runs/{n}-shard*.jsonl.gz')) for l in gzip.open(f, 'rt') if l.strip()]

# Seats of deck d in R10 games keyed by (seed base, first) -> (row, seat)
def seats(rs, deck, variant='R10'):
    out = {}
    for r in rs:
        if r['variant'] != variant: continue
        base = r.get('base') or r['group'].rsplit(':', 1)[0]
        for a in 'AB':
            if r['seat'][a]['deck'] == deck:
                # mirror games (deck vs itself) have two seats; keep both with the seat letter
                out[(base, r['first'], a if r['seat'][other(a)]['deck'] == deck else '')] = (r, a)
    return out

E8, C8, C8b, MAIN = rows('E8'), rows('C8'), rows('C8b'), rows('MAIN')
# C8 rows carry the E8 seed label in 'base' through the manifest; re-attach it from the manifest to be explicit.
cm = {m['match']: m['base'] for m in json.load(open('runs/C8-manifest.json'))['matches']}
for r in C8: r['base'] = cm[r['match']]
em = {m['match']: m['base'] for m in json.load(open('runs/E8-manifest.json'))['matches']}
for r in E8: r['base'] = em[r['match']]
bm = {m['match']: m['base'] for m in json.load(open('runs/C8b-manifest.json'))['matches']}
for r in C8b: r['base'] = bm[r['match']]

def profile(pairs, F=10):
    xs = [(r, a, r['seat'][a]) for r, a in pairs]
    ms = Counter(x['maxStage'] for r, a, x in xs)
    t8 = sum(x['turnsAfter8'] for r, a, x in xs)
    return {'seats': len(xs), 'score': rnd(mean([SC[x['result']] for r, a, x in xs])),
            'scoreVs': {o: rnd(mean([SC[x['result']] for r, a, x in xs if r['seat'][other(a)]['deck'] == o])) for o in OFF},
            'growth': rnd(mean([x['growth'] for r, a, x in xs]), 2),
            'reach8': rnd(mean([x['reached8'] is not None for r, a, x in xs])),
            'reach7plus': rnd(mean([x['maxStage'] >= 7 for r, a, x in xs])),
            'maxStage': dict(sorted(ms.items())),
            'stageAtR5': rnd(mean([x['stageEnd'][5] for r, a, x in xs]), 2), 'stageAtEnd': rnd(mean([x['stageEnd'][r['round']] for r, a, x in xs]), 2),
            'reach8RoundMedian': sorted(x['reached8'] for r, a, x in xs if x['reached8'])[len([1 for r, a, x in xs if x['reached8']]) // 2] if any(x['reached8'] for r, a, x in xs) else None,
            'timeSkips': rnd(mean([sum(x['timeSkips']) for r, a, x in xs]), 2), 'transforms': rnd(mean([sum(x['transforms']) for r, a, x in xs]), 2),
            'challenges': rnd(mean([sum(x['challenges']) for r, a, x in xs]), 2),
            'turnsAfter8': rnd(t8 / max(1, sum(x['reached8'] is not None for r, a, x in xs)), 2),
            'passOnlyAfter8': rnd(sum(x['passOnlyTurnsAfter8'] for r, a, x in xs) / max(1, t8)),
            'growthPerTurnAfter8': rnd(sum(x.get('growthAfter8', 0) for r, a, x in xs) / max(1, t8), 2),
            'main8Abil': rnd(mean([x.get('main8Abil', 0) for r, a, x in xs if x['reached8'] is not None]), 2),
            'firstBirthRound': rnd(mean([x['births'][0] for r, a, x in xs if x['births']]), 2),
            'margin': rnd(mean([x['growth'] - r['seat'][other(a)]['growth'] for r, a, x in xs]), 2),
            'earlyWinBy': rnd(mean([r['result']['reason'] == '100維持' and r['result']['winner'] == a for r, a, x in xs])),
            'gameMinutes': rnd(mean([(sum(sum(r['seat'][s]['nonPass'][1:]) * 12 + (sum(r['seat'][s]['decisions'][1:]) - sum(r['seat'][s]['nonPass'][1:])) * 3 for s in 'AB') + 5 * (len(r['seat']['A']['turns']) + len(r['seat']['B']['turns']))) / 60 for r, a, x in xs]), 1)}

def paired(ctrl, var, n=2000, seed=20261030):
    keys = [k for k in ctrl if k in var]
    groups = defaultdict(list)
    for k in keys: groups[k[0]].append(k)
    G = list(groups)
    d = lambda gs: mean([SC[var[k][0]['seat'][var[k][1]]['result']] - SC[ctrl[k][0]['seat'][ctrl[k][1]]['result']] for g in gs for k in groups[g]])
    rng = random.Random(seed); vals = sorted(d([rng.choice(G) for _ in G]) for _ in range(n))
    same = mean([var[k][0]['seat'][var[k][1]]['result'] == ctrl[k][0]['seat'][ctrl[k][1]]['result'] for k in keys])
    return {'pairs': len(keys), 'scoreDiff': rnd(d(G)), 'ci95': [rnd(vals[int(.025 * n)]), rnd(vals[int(.975 * n) - 1])], 'sameResult': rnd(same)}

out = {}
ctrl = {'main': seats(C8, 'main'), 'balance': seats(C8, 'balance')}
var = {'main+8': seats(E8, 'main+8'), 'main+8lite': seats(C8, 'main+8lite'), 'balance+8': seats(E8, 'balance+8'),
       'main+dup': seats(C8b, 'main+dup'), 'balance+67': seats(C8b, 'balance+67')}
out['R10'] = {k: profile(v.values()) for k, v in {**ctrl, **var}.items()}
out['R12'] = {k: profile(seats(E8, k, 'R12').values(), 12) for k in ('main+8', 'balance+8')}
out['pairedR10'] = {'main+8 vs main': paired(ctrl['main'], var['main+8']), 'main+8lite vs main': paired(ctrl['main'], var['main+8lite']),
                    'balance+8 vs balance': paired(ctrl['balance'], var['balance+8']),
                    # Separating "cards removed / high stages added" from "⑧ added" (same removals, no ⑧)
                    'main+dup vs main': paired(ctrl['main'], var['main+dup']), 'main+8lite vs main+dup': paired(var['main+dup'], var['main+8lite']),
                    'balance+67 vs balance': paired(ctrl['balance'], var['balance+67']), 'balance+8 vs balance+67': paired(var['balance+67'], var['balance+8'])}
# Official decks in MAIN (R10 and R12): highest stage per deck and how many main cards of each stage the list holds
dk = {d['id'] if 'id' in d else k: d for k, d in json.load(open('runs/MAIN-manifest.json'))['decks'].items()}
out['MAINofficial'] = {v: {d: profile([(r, a) for r in MAIN if r['variant'] == v for a in 'AB' if r['seat'][a]['deck'] == d], 10 if v == 'R10' else 12) | {} for d in OFF} for v in ('R10', 'R12')}
for v in out['MAINofficial']:
    for d in OFF: out['MAINofficial'][v][d] = {k: out['MAINofficial'][v][d][k] for k in ('score', 'growth', 'reach7plus', 'maxStage', 'stageAtEnd', 'timeSkips', 'transforms')}
# Spread of the 7-deck table if 'main' (or 'balance') were replaced, estimated on the E8/C8 seeds (R10)
def table(rep):
    sc = {}
    for d in OFF:
        src = rep.get(d)
        if src: sc[d] = out['R10'][src]['score']  # ⑧ variant vs the 7 official decks
    return sc
out['note'] = 'scores in R10 are against the 7 official decks (mirror included), on the E8 seeds; MAINofficial is the 28-pair round robin'
print(json.dumps(out, ensure_ascii=False, indent=1))
