#!/usr/bin/env python3
"""Read-only per-card usage from saved CPU-vs-CPU records (no re-run).
Sources: the latest CPU-deck sets (variety V1/V2, partner-deck, deck-balance X) and, for reference, the older
seven test decks (balance-verification-20261020-cpufix E1). Writes results/card-usage.json.
Usage: python3 tools/card_usage.py"""
import glob, gzip, json, os
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.join(HERE, '..', '..')
SETS = {'cpu_decks': ['balance-verification-20261022-variety/runs/V1-*', 'balance-verification-20261022-variety/runs/V2-*',
                      'partner-deck-20261025/runs/*', 'deck-balance-20261025/runs/X-*'],
        'test_decks_e1': ['balance-verification-20261020-cpufix/runs/E1-*']}
out = {}
for name, pats in SETS.items():
    agg = defaultdict(lambda: defaultdict(int)); matches = 0
    for pat in pats:
        for f in sorted(glob.glob(os.path.join(GAME, pat + '.jsonl.gz'))):
            for line in gzip.open(f, 'rt'):
                r = json.loads(line)
                if r.get('status') != 'completed': continue
                matches += 1
                for seat in 'AB':
                    for cid, c in r['cards'][seat].items():
                        a = agg[cid]; a['seats'] += 1
                        for k in ('deck', 'drawn', 'played', 'activated', 'handEnd'): a[k] += c[k]
    out[name] = {'matches': matches, 'cards': {k: {**v, 'play_per_draw': round(v['played'] / v['drawn'], 3) if v['drawn'] else None,
                                                   'activate_per_play': round(v['activated'] / v['played'], 3) if v['played'] else None,
                                                   'stuck_per_draw': round(v['handEnd'] / v['drawn'], 3) if v['drawn'] else None}
                                               for k, v in sorted(agg.items())}}
json.dump(out, open(os.path.join(HERE, '..', 'results', 'card-usage.json'), 'w'), ensure_ascii=False, indent=1)
for name, o in out.items(): print(name, o['matches'], len(o['cards']))
