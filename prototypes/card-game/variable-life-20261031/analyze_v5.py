# VERSION 5 analysis (PLAN-V5.md §5). Reuses analyze_v4.py's helpers. Usage: python3 analyze_v5.py > results/summary-v5.json
import json, glob, sys, random
from collections import defaultdict, Counter
exec(open('analyze_v4.py').read().split('\nout = {}')[0])
random.seed(20261105)
NEW5 = NEW + ['tsuruR', 'tsuruS']
JP.update({'tsuruR': 'おいわいのつる（ラウンド終了）', 'tsuruS': 'おいわいのつる（ラウンド開始）'})
def card_use5(rows):
    out = {}
    for n in NEW5:
        cid = 'X-N-' + n; drew = used = 0; rounds = Counter()
        for r in rows:
            for a in 'AB':
                x = r['seat'][a]
                if not any(s['card'] == cid for s in x.get('xSeen', [])): continue
                drew += 1; ev = x.get('xPlayed', {}).get(cid, []) + x.get('xSet', {}).get(cid, [])
                if ev: used += 1
                for rd in ev: rounds[rd] += 1
        if drew: out[JP[n]] = {'seatsDrew': drew, 'usedShare': rnd(used / drew), 'roundsUsed': dict(sorted(rounds.items())), 'earlyShare(R5以前)': rnd(sum(v for k, v in rounds.items() if k <= 5) / max(1, sum(rounds.values())))}
    return out
out = {}
V2C = [r for r in load('runs/V2C-shard*.jsonl.gz', 'runs/V2C-manifest.json') if int(seed(r)) <= 10]
cond = {'V2C': V2C}
for f in sorted(glob.glob('runs/V5F_*-manifest.json')):
    name = f.split('/')[-1].replace('-manifest.json', '')
    if glob.glob(f'runs/{name}-shard*.jsonl.gz'): cond[name] = load(f'runs/{name}-shard*.jsonl.gz', f)
for name in ('V4F_MULTI', 'V4F_N_naga', 'V4F_N_tsuru'):
    cond[name] = load(f'runs/{name}-shard*.jsonl.gz', f'runs/{name}-manifest.json')
out['conditions'] = {}
for c, rows in cond.items():
    sm = summary(rows); sm['comeback'] = comeback(rows); sm['cardUse'] = card_use5(rows); out['conditions'][c] = sm
metrics = ['behindR8', 'close', 'firstSeat', 'firstWin', 'secondWin', 'holdWin', 'r10', 'counter', 'spread', 'deck:item', 'deck:growth', 'deck:companion', 'deck:partner', 'deck:balance']
out['contrasts'] = {c: {m: contrast4(cond[c], cond['V2C'], m) for m in metrics} for c in cond if c != 'V2C'}
pairs = [('V5F_MULTI', 'V4F_MULTI', 'CPU smart4−smart3（MULTI）'), ('V5F_N_naga', 'V4F_N_naga', 'CPU smart4−smart3（ながいき×2）'), ('V5F_TV4', 'V4F_N_tsuru', 'CPU smart4−smart3（つる V4）'),
         ('V5F_TR', 'V5F_TV4', 'つる：ラウンド終了−V4'), ('V5F_TS', 'V5F_TV4', 'つる：ラウンド開始−V4'), ('V5F_P4R', 'V5F_P3', 'つる追加の効果'), ('V5F_FREE', 'V5F_P3', '自由構成−有望3枚')]
out['pairs'] = {f'{a}-{b}（{l}）': {m: contrast4(cond[a], cond[b], m) for m in ['behindR8', 'close', 'firstSeat', 'holdWin', 'spread', 'deck:item']} for a, b, l in pairs if a in cond and b in cond}
FK = defaultdict(list)
for f in sorted(glob.glob('runs/FORK*-shard*.jsonl.gz')):
    name = f.split('/')[-1].split('-shard')[0]
    for l in gzip.open(f, 'rt'):
        r = json.loads(l)
        for x in r.get('forks', []): FK[(name, x['type'])].append({**x, 'seed': r['base'].rsplit(':', 1)[1]})
out['forks'] = {}
for (name, typ), xs in sorted(FK.items()):
    groups = defaultdict(list)
    for x in xs: groups[x['seed']].append(x)
    fn = lambda v: mean([x['yes']['score'] - x['no']['score'] for x in v])
    out['forks'][f'{name}/{typ}'] = {'positions': len(xs), 'yesScore': rnd(mean([x['yes']['score'] for x in xs])), 'noScore': rnd(mean([x['no']['score'] for x in xs])), 'diff': rnd(fn(xs)), 'ci95': boot(fn, groups, 1000)}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
