# VERSION 4 analysis (PLAN-V4.md §6). Reuses the helpers of analyze_v2.py (loaded below) and the V2 records (V2C = baseline,
# V2S B4 rows for the deck search). Usage: python3 analyze_v4.py > results/summary-v4.json
import json, glob, sys, random
from collections import defaultdict, Counter
exec(open('analyze_v2.py').read().split('out = {}')[0])
random.seed(20261104)
NEW = ['hayajimai', 'nagaiki', 'tsuru', 'photo', 'machibuse', 'omiyage', 'chotto']
JP = {'hayajimai': 'はやじまい', 'nagaiki': 'ながいきのひけつ', 'tsuru': 'おいわいのつる', 'photo': 'おもいでのしゃしん', 'machibuse': 'まちぶせどけい', 'omiyage': 'いなかのおみやげ', 'chotto': 'ちょっとまった'}

def comeback(rows):
    """Side behind at the end of R8 (growthEnd[8]): its score overall and by final round; decisive time-card moves by the behind side."""
    by = defaultdict(list); allv = []
    for r in rows:
        A, B = r['seat']['A'], r['seat']['B']; ga, gb = A['growthEnd'][8], B['growthEnd'][8]
        if not ga or not gb or ga == gb: continue
        seat = 'A' if ga < gb else 'B'; sc = SC[r['seat'][seat]['result']]; allv.append(sc); by[r['final']].append(sc)
    dec = defaultdict(list)
    for r in rows:
        ch = [e for e in time_events(r) if e['to'] != e['from']]
        if not ch: continue
        e = ch[-1]; a = e['actor']; o = 'B' if a == 'A' else 'A'; d = e['growth'][a] - e['growth'][o]
        st = 'behind' if d < 0 else 'ahead' if d > 0 else 'tie'; kind = 'extend' if e['to'] > e['from'] else 'shorten'
        dec[f'{st}/{kind}'].append(SC[r['seat'][a]['result']])
    return {'behindAtR8Score': rnd(mean(allv)), 'behindAtR8Games': len(allv), 'behindAtR8ScoreByFinal': {f'R{k}': [rnd(mean(v)), len(v)] for k, v in sorted(by.items())},
            'decisive': {k: [rnd(mean(v)), len(v)] for k, v in sorted(dec.items())}}
def behind_score(rows):  # per-game metric for paired contrasts: score of the side behind at R8 end (None if tied)
    return None
def card_use(rows):
    out = {}
    for n in NEW:
        cid = 'X-N-' + n; seats = drew = used = 0; rounds = Counter()
        for r in rows:
            for a in 'AB':
                x = r['seat'][a]; seen = any(s['card'] == cid for s in x.get('xSeen', []))
                if not seen: continue
                drew += 1; ev = (x.get('xPlayed', {}).get(cid, []) + x.get('xSet', {}).get(cid, []))
                if ev: used += 1
                for rd in ev: rounds[rd] += 1
        if drew: out[JP[n]] = {'seatsDrew': drew, 'usedShare': rnd(used / drew), 'roundsUsed': dict(sorted(rounds.items()))}
    return out
def r8_behind(r):
    A, B = r['seat']['A'], r['seat']['B']; ga, gb = A['growthEnd'][8], B['growthEnd'][8]
    if not ga or not gb or ga == gb: return None
    return SC[r['seat']['A' if ga < gb else 'B']['result']]
_pg = per_game
def per_game(r):
    g = _pg(r); g['behindR8'] = r8_behind(r); return g
def contrast4(a_rows, b_rows, metric):
    ia = {key(r): r for r in a_rows}; ib = {key(r): r for r in b_rows}; ks = [k for k in ia if k in ib]
    groups = defaultdict(list)
    for k in ks: groups[k[0].rsplit(':', 1)[1]].append((ia[k], ib[k]))
    def fn(pairs):
        if metric == 'spread' or metric.startswith('deck:'):
            da = deck_scores([p[0] for p in pairs]); db = deck_scores([p[1] for p in pairs])
            if len(da) < 7 or len(db) < 7: return None
            if metric == 'spread': return (max(da.values()) - min(da.values())) - (max(db.values()) - min(db.values()))
            return da[metric[5:]] - db[metric[5:]]
        if metric == 'behindR8':  # unpaired within the matched set (the behind side can differ)
            xa = [per_game(p[0])['behindR8'] for p in pairs]; xb = [per_game(p[1])['behindR8'] for p in pairs]
            xa = [x for x in xa if x is not None]; xb = [x for x in xb if x is not None]
            return mean(xa) - mean(xb) if xa and xb else None
        return mean([per_game(p[0])[metric] - per_game(p[1])[metric] for p in pairs])
    allp = [p for g in groups.values() for p in g]
    return {'n': len(allp), 'diff': rnd(fn(allp)), 'ci95': boot(fn, groups, 1000)}

out = {}
V2C = load('runs/V2C-shard*.jsonl.gz', 'runs/V2C-manifest.json'); base10 = [r for r in V2C if int(seed(r)) <= 10]
cond = {'V2C': base10}
for f in sorted(glob.glob('runs/V4F_*-manifest.json')):
    name = f.split('/')[-1].replace('-manifest.json', '')
    if glob.glob(f'runs/{name}-shard*.jsonl.gz'): cond[name] = load(f'runs/{name}-shard*.jsonl.gz', f)
out['conditions'] = {}
for c, rows in cond.items():
    sm = summary(rows); sm['comeback'] = comeback(rows); sm['cardUse'] = card_use(rows); out['conditions'][c] = sm
metrics = ['behindR8', 'close', 'firstSeat', 'holdWin', 'r10', 'counter', 'spread', 'deck:item', 'deck:growth']
out['contrasts'] = {c: {m: contrast4(cond[c], cond['V2C'], m) for m in metrics} for c in cond if c != 'V2C'}
# Deck search (V4S vs the B4 field; B4-vs-B4 from V2S, seeds 001-004)
if glob.glob('runs/V4S-shard*.jsonl.gz'):
    def search_rows(name):
        man = json.load(open(f'runs/{name}-manifest.json')); gt = {g['group']: (g['test'], g['X'], g['Y']) for g in man['groups']}
        by = defaultdict(dict)
        for r in load(f'runs/{name}-shard*.jsonl.gz', f'runs/{name}-manifest.json'):
            if int(seed(r)) > 4: continue
            test, X, Y = gt[r['group']]; tk = X if test == 'X' else Y; ok = Y if test == 'X' else X; a = 'A' if r['first'] == test else 'B'
            d, c = tk.split('@'); by[(d, c)][(ok, r['base'], r['first'])] = SC[r['seat'][a]['result']]
        return by
    S = search_rows('V4S'); S.update({k: v for k, v in search_rows('V2S').items() if k[1] == 'B4'})
    out['search'] = {}
    for d in DECKS:
        out['search'][d] = {}
        for c in ['B4'] + ['N_' + x for x in ('haya', 'naga', 'tsuru', 'photo', 'machi', 'omiya', 'chotto')]:
            cur = S.get((d, c), {}); ref = S.get((d, 'B4'), {}); ks = [k for k in cur if k in ref]
            if not ks: continue
            groups = defaultdict(list)
            for k in ks: groups[k[1].rsplit(':', 1)[1]].append(k)
            out['search'][d][c] = {'games': len(ks), 'score': rnd(mean([cur[k] for k in ks])), 'vsB4': rnd(mean([cur[k] - ref[k] for k in ks])),
                                   'vsB4ci95': boot(lambda kk: mean([cur[k] - ref[k] for k in kk]), groups, 1000)}
# Same-position branches (lib/fork.mjs)
FK = defaultdict(list)
for f in sorted(glob.glob('runs/FORK_*-shard*.jsonl.gz')):
    name = f.split('/')[-1].split('-shard')[0]
    for l in gzip.open(f, 'rt'):
        r = json.loads(l)
        for x in r.get('forks', []): FK[(name, x['type'])].append({**x, 'seed': r['base'].rsplit(':', 1)[1], 'error': r.get('error')})
out['forks'] = {}
for (name, typ), xs in sorted(FK.items()):
    groups = defaultdict(list)
    for x in xs: groups[x['seed']].append(x)
    fn = lambda v: mean([x['yes']['score'] - x['no']['score'] for x in v])
    byd = defaultdict(list)
    for x in xs: byd['0-5' if x['deficit'] <= 5 else '6-10' if x['deficit'] <= 10 else '11+'].append(x)
    out['forks'][f'{name}/{typ}'] = {'positions': len(xs), 'yesScore': rnd(mean([x['yes']['score'] for x in xs])), 'noScore': rnd(mean([x['no']['score'] for x in xs])),
        'diff': rnd(fn(xs)), 'ci95': boot(fn, groups, 1000), 'yesFinal': dict(Counter(x['yes']['final'] for x in xs)),
        'byDeficit': {k: {'n': len(v), 'yes': rnd(mean([x['yes']['score'] for x in v])), 'no': rnd(mean([x['no']['score'] for x in v]))} for k, v in sorted(byd.items())},
        'byDeck': {d: {'n': len(v), 'diff': rnd(mean([x['yes']['score'] - x['no']['score'] for x in v]))} for d in DECKS for v in [[x for x in xs if x['deck']['own'].split('@')[0] == d]] if v}}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
