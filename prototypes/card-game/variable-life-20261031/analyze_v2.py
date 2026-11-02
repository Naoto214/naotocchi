# VERSION 2 analysis (PLAN-V2.md §6). Reuses A0 (PR #495 G-A, ref/), V1 (MAINT T-2s, T-X4; SENST T-8s) and the new V2 runs.
# Paired comparisons share (base seed label, first seat). Bootstrap: resample seed numbers (001..020), 2,000 times.
# Usage: python3 analyze_v2.py > results/summary-v2.json
import gzip, json, glob, random, sys
from collections import defaultdict, Counter
random.seed(20261102)
mean = lambda xs: sum(xs) / len(xs) if xs else None
rnd = lambda x, n=3: None if x is None else round(x, n)
SC = {'win': 1.0, 'draw': 0.5, 'loss': 0.0}
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
LABEL = {'main': 'メイン成長', 'companion': 'なかま', 'partner': 'こいびと・交際', 'challenge': 'ちょうせん', 'growth': 'そだち獲得', 'item': 'アイテム・じゅんび', 'balance': 'バランス'}

def load(path_glob, manifest=None, keep=lambda r: True):
    man = {m['match']: m['base'] for m in json.load(open(manifest))['matches']} if manifest else None
    out = []
    for f in sorted(glob.glob(path_glob)):
        for l in gzip.open(f, 'rt'):
            if not l.strip(): continue
            r = json.loads(l)
            if not keep(r): continue
            if man: r['base'] = man[r['match']]
            r.setdefault('final', 10)
            out.append(r)
    return out
def deck_of(r, a): return r['seat'][a]['deck'].split('@')[0]
def config_of(r, a): d = r['seat'][a]['deck']; return d.split('@')[1] if '@' in d else None
def seed(r): return r['base'].rsplit(':', 1)[1]
def key(r): return (r['base'], r['first'])

def time_events(r): return [e for e in (r.get('life') or {}).get('events', []) if e['op'] == 'timeSet']
def per_game(r):
    A, B = r['seat']['A'], r['seat']['B']; w = r['result']['winner']; ev = time_events(r)
    g = {'draw': float(not w), 'firstSeat': SC[A['result']], 'firstWin': float(w == 'A'), 'secondWin': float(w == 'B'),
         'close': float(abs(A['growth'] - B['growth']) <= 10), 'holdWin': float(r['result']['reason'].endswith('維持')),
         'final': r['final'], 'endRound': r['round'], 'r10': float(r['final'] == 10), 'timeUsed': float(bool(ev)),
         'counter': float(any(e['battle'] > 1 for e in ev)), 'resolutions': len(ev), 'cards': sum(e['battle'] for e in ev),
         'growthMean': (A['growth'] + B['growth']) / 2}
    return g

def events_summary(rows):
    c = Counter(); rounds = Counter(); battles = Counter(); maxb = 0
    decisive = Counter()  # last applied change that set the final: (state, kind) -> [n, wins]
    dwin = Counter()
    for r in rows:
        ev = time_events(r)
        for e in ev:
            a = e['actor']; o = 'B' if a == 'A' else 'A'; d = e['growth'][a] - e['growth'][o]
            st = 'ahead' if d > 0 else 'behind' if d < 0 else 'tie'
            kind = 'extend' if e['extended'] else 'shorten' if e['shortened'] else 'same'
            c[(st, kind)] += 1; rounds[e['round']] += 1; battles[e['battle']] += 1; maxb = max(maxb, e['battle'])
        ch = [e for e in ev if e['extended'] or e['shortened']]
        if ch:
            e = ch[-1]; a = e['actor']; o = 'B' if a == 'A' else 'A'; d = e['growth'][a] - e['growth'][o]
            st = 'ahead' if d > 0 else 'behind' if d < 0 else 'tie'; kind = 'extend' if e['extended'] else 'shorten'
            decisive[(st, kind)] += 1; dwin[(st, kind)] += SC[r['seat'][a]['result']]
    n = sum(c.values())
    rate = lambda st, k: rnd(c[(st, k)] / n) if n else None
    ahead_n = sum(v for (st, k), v in c.items() if st == 'ahead'); behind_n = sum(v for (st, k), v in c.items() if st == 'behind')
    return {'resolutions': n, 'byState': {f'{st}/{k}': v for (st, k), v in sorted(c.items())},
            'wrongDirection': rnd((c[('behind', 'shorten')] + c[('ahead', 'extend')]) / n) if n else None,
            'behindShortenShare': rnd(c[('behind', 'shorten')] / behind_n) if behind_n else None,
            'aheadExtendShare': rnd(c[('ahead', 'extend')] / ahead_n) if ahead_n else None,
            'round': dict(sorted(rounds.items())), 'earlyShare': rnd(sum(v for k, v in rounds.items() if k <= 5) / n) if n else None,
            'battle': dict(sorted(battles.items())), 'maxBattle': maxb,
            'comebackByExtender': {'games': decisive[('behind', 'extend')], 'score': rnd(dwin[('behind', 'extend')] / decisive[('behind', 'extend')]) if decisive[('behind', 'extend')] else None},
            'holdByShortener': {'games': decisive[('ahead', 'shorten')], 'score': rnd(dwin[('ahead', 'shorten')] / decisive[('ahead', 'shorten')]) if decisive[('ahead', 'shorten')] else None}}

def deck_scores(rows):
    s = defaultdict(list)
    for r in rows:
        if deck_of(r, 'A') == deck_of(r, 'B'): continue
        for a in 'AB': s[deck_of(r, a)].append(SC[r['seat'][a]['result']])
    return {d: mean(s[d]) for d in DECKS if s[d]}
def final_card_use(rows):  # さいごのじかん plays by round (U6)
    c = Counter()
    for r in rows:
        for a in 'AB':
            for rd in r['seat'][a].get('roundCards', {}).get('E-final-time', []): c[(rd, r['final'])] += 1
    return {f'R{rd}/final{F}': v for (rd, F), v in sorted(c.items())}

def summary(rows):
    pg = [per_game(r) for r in rows]; ds = deck_scores(rows); col = lambda k: [g[k] for g in pg]
    fin = Counter(g['final'] for g in pg); n = len(rows)
    return {'games': n, 'completed': sum(r['status'] == 'completed' for r in rows), 'replayMatch': sum(r.get('replay') == 'match' for r in rows),
            'abnormal': sum(r['status'] != 'completed' for r in rows),
            'final': {f'R{k}': rnd(fin[k] / n) for k in (9, 10, 11, 12)}, 'finalMean': rnd(mean(col('final')), 2),
            'firstWin': rnd(mean(col('firstWin'))), 'secondWin': rnd(mean(col('secondWin'))), 'firstSeatScore': rnd(mean(col('firstSeat'))),
            'draw': rnd(mean(col('draw'))), 'close': rnd(mean(col('close'))), 'holdWin': rnd(mean(col('holdWin'))),
            'timeUsedGames': rnd(mean(col('timeUsed'))), 'counterGames': rnd(mean(col('counter'))), 'cardsPerGame': rnd(mean(col('cards')), 2),
            'deck': {d: rnd(v) for d, v in ds.items()}, 'deckSpread': rnd(max(ds.values()) - min(ds.values())) if ds else None,
            'deckSD': rnd((sum((v - .5) ** 2 for v in ds.values()) / len(ds)) ** .5) if ds else None,
            'events': events_summary(rows), 'finalTimeCard': final_card_use(rows)}

def boot(fn, groups, B=2000):
    keys = sorted(groups); vals = []
    for _ in range(B):
        pick = [groups[random.choice(keys)] for _ in keys]
        v = fn([x for g in pick for x in g])
        if v is not None: vals.append(v)
    vals.sort(); return [rnd(vals[int(.025 * len(vals))]), rnd(vals[int(.975 * len(vals)) - 1])]
def contrast(a_rows, b_rows, metric):
    """Paired difference a−b over common (base, first). metric: per-game key or 'spread' / 'deck:<id>'."""
    ia = {key(r): r for r in a_rows}; ib = {key(r): r for r in b_rows}; ks = [k for k in ia if k in ib]
    groups = defaultdict(list)
    for k in ks: groups[k[0].rsplit(':', 1)[1]].append((ia[k], ib[k]))
    def fn(pairs):
        if metric == 'spread' or metric.startswith('deck:'):
            da = deck_scores([p[0] for p in pairs]); db = deck_scores([p[1] for p in pairs])
            if len(da) < 7 or len(db) < 7: return None
            if metric == 'spread': return (max(da.values()) - min(da.values())) - (max(db.values()) - min(db.values()))
            d = metric[5:]; return da[d] - db[d]
        return mean([per_game(p[0])[metric] - per_game(p[1])[metric] for p in pairs])
    allp = [p for g in groups.values() for p in g]
    return {'n': len(allp), 'diff': rnd(fn(allp)), 'ci95': boot(fn, groups)}

out = {}
A0 = load('ref/G120-AD.jsonl.gz', keep=lambda r: r['variant'] == 'G-A')
MAINT = load('runs/MAINT-shard*.jsonl.gz', 'runs/MAINT-manifest.json')
V1 = [r for r in MAINT if r['variant'] == 'T-2s']; TX4 = [r for r in MAINT if r['variant'] == 'T-X4']
T8 = [r for r in load('runs/SENST-shard*.jsonl.gz', 'runs/SENST-manifest.json') if r['variant'] == 'T-8s']
cond = {'A0': A0, 'TX4': TX4, 'V1': V1, 'V1H8': T8}
for name in ('V2C', 'V2O', 'V2R', 'V2H8', 'V2H'):
    if glob.glob(f'runs/{name}-shard*.jsonl.gz'): cond[name] = load(f'runs/{name}-shard*.jsonl.gz', f'runs/{name}-manifest.json')
seeds10 = {f'{i:03d}' for i in range(1, 11)}
out['conditions'] = {c: summary(rows) for c, rows in cond.items()}
out['conditions10'] = {c: summary([r for r in rows if seed(r) in seeds10]) for c, rows in cond.items() if c in ('A0', 'V1', 'V2C', 'V2O')}
pairs = [('V2C', 'V1', 'CPU の効果（同じ各1構成）'), ('V2C', 'A0', '総合（各1・smart2）'), ('V2O', 'V2C', '構成の効果'), ('V2O', 'V1', 'VERSION 2 − VERSION 1'),
         ('V2O', 'A0', '総合（VERSION 2）'), ('V2R', 'V2C', '型別代表構成'), ('V2H8', 'V2C', '各2（8枚）'), ('V2H', 'V2C', '各3（12枚）'), ('V2H8', 'V1H8', '各2：CPU の効果'), ('V1', 'A0', '総合（VERSION 1）')]
metrics = ['firstSeat', 'close', 'holdWin', 'r10', 'final', 'counter', 'draw', 'spread'] + [f'deck:{d}' for d in DECKS]
out['contrasts'] = {}
for a, b, label in pairs:
    if a in cond and b in cond:
        out['contrasts'][f'{a}-{b}（{label}）'] = {m: contrast(cond[a], cond[b], m) for m in metrics}

# Configuration search (V2S): test deck (group 'test' seat) score vs the B4 field; difference vs its B4 config, paired.
if glob.glob('runs/V2S-shard*.jsonl.gz'):
    man = json.load(open('runs/V2S-manifest.json')); gt = {g['group']: (g['test'], g['X'], g['Y']) for g in man['groups']}
    rows = load('runs/V2S-shard*.jsonl.gz', 'runs/V2S-manifest.json')
    by = defaultdict(dict)  # (deck, config) -> {(opp, base, first): score}
    allrows = defaultdict(list)
    for r in rows:
        test, X, Y = gt[r['group']]; tk = X if test == 'X' else Y; ok = Y if test == 'X' else X
        a = 'A' if (r['first'] == test) else 'B'
        d, c = tk.split('@'); by[(d, c)][(ok, r['base'], r['first'])] = SC[r['seat'][a]['result']]
        allrows[(d, c)].append(r)
    search = {}
    for d in DECKS:
        search[d] = {}
        for c in man['spec'].split(','):
            cur = by[(d, c)]; ref = by[(d, 'B4')]
            ks = [k for k in cur if k in ref]; groups = defaultdict(list)
            for k in ks: groups[k[1].rsplit(':', 1)[1]].append(k)
            fs = lambda kk: mean([cur[k] for k in kk]); fd = lambda kk: mean([cur[k] - ref[k] for k in kk])
            ev = events_summary(allrows[(d, c)])
            search[d][c] = {'games': len(cur), 'score': rnd(mean(list(cur.values()))), 'ci95': boot(fs, groups, 1000),
                            'vsB4': rnd(fd(ks)), 'vsB4ci95': boot(fd, groups, 1000),
                            'final': {f'R{k}': rnd(sum(r['final'] == k for r in allrows[(d, c)]) / len(allrows[(d, c)])) for k in (9, 10, 11, 12)},
                            'wrongDirection': ev['wrongDirection']}
    out['search'] = search
    # Selection rule (PLAN-V2 §5): best score; prefer fewer time cards when within 2 pt of the best.
    NCARDS = {'N0': 0, 'B4': 4, 'S2': 2, 'S3': 3, 'L2': 2, 'L3': 3, 'SL2': 2, 'H8': 8, 'H12': 12}
    pick = {}
    for d in DECKS:
        best = max(search[d].values(), key=lambda x: x['score'])['score']
        cands = [c for c, x in search[d].items() if x['score'] >= best - .02]
        pick[d] = min(cands, key=lambda c: (NCARDS[c], -search[d][c]['score']))
    out['selected'] = pick
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
