#!/usr/bin/env python3
"""First-player score in official-CPU vs official-CPU games (A_early) under each rule, paired by deal, plus where
the egg was challenged. Usage: python3 tools/seat_bias.py"""
import glob, gzip, json, os, random, statistics as st
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
rows = [json.loads(l) for f in sorted(glob.glob(os.path.join(ROOT, 'runs', 'shard*.jsonl*')))
        for l in (gzip.open(f, 'rt') if f.endswith('.gz') else open(f)) if l.strip()]
fp = defaultdict(dict); eggch = defaultdict(lambda: defaultdict(int))
for r in rows:
    if r['strategy'] != 'A_early': continue
    s = r['studyScore']; fp[r['rule']][r['match'].replace(r['rule'], '')] = s if r['study'] == 'A' else 1 - s
    for c in r['challenges']:
        for seat in 'AB':
            if c['egg'].get(seat): eggch[r['rule']][f"R{c['round']}:egg={'first' if seat == 'A' else 'second'}"] += 1
keys = sorted(set(fp['current']) & set(fp['egg00'])); d = [fp['egg00'][k] - fp['current'][k] for k in keys]
rnd = random.Random(20261026)
def ci(xs):
    b = sorted(st.mean(rnd.choice(xs) for _ in xs) for _ in range(10000)); return [round(b[250], 3), round(b[9749], 3)]
out = {'first_player_score': {k: {'score': round(st.mean(v.values()), 3), 'ci95': ci(list(v.values()))} for k, v in fp.items()},
       'egg00_minus_current': {'diff': round(st.mean(d), 3), 'ci95': ci(d), 'matches': len(d)},
       'egg_challenges_A_early': {k: dict(sorted(v.items())) for k, v in eggch.items()}}
json.dump(out, open(os.path.join(ROOT, 'results', 'seat-bias.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
