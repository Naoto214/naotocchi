"""VERSION 8: first-seat score check for the P3 CPU setup (owner's request: keep watching the ~−2.3pt first-seat tendency after
adoption). Reads CPU-match records (lib/run.mjs format, .jsonl or .jsonl.gz) and reports the first player's score
(win 1, draw 0.5, loss 0; seat A always plays first) with a 95% CI from a bootstrap over seed groups (same method as REPORT §14–§18).

Baseline (VERSION 7, hotseat-8, 560 games): P3 0.491; without the new cards 0.514.
Watch rule (fixed in VERSION 8, docs: integration/CANDIDATE-V8.md §1): "要確認" when the point estimate is below 0.461
(P3 baseline −3.0pt) or the whole 95% CI is below the P3 baseline; otherwise "範囲内".

Usage: python3 integration/first-seat-check.py 'runs-v7/EQ_IX-shard*.jsonl.gz' [more globs...]
"""
import glob, gzip, json, random, sys
from collections import defaultdict
BASE_P3, BASE_A0, ALERT = 0.491, 0.514, 0.461
SC = {'A': 1.0, 'B': 0.0, None: 0.5}

def read(pattern):
    for f in sorted(glob.glob(pattern)):
        op = gzip.open if f.endswith('.gz') else open
        with op(f, 'rt') as h:
            for line in h:
                if line.strip():
                    yield json.loads(line)

def check(patterns, seed=20261106, n=2000):
    groups = defaultdict(list)
    for p in patterns:
        for r in read(p):
            if r.get('status') != 'completed':
                continue
            groups[r['group'].split(':')[-2]].append(SC[r['result'].get('winner')])
    keys = sorted(groups)
    if not keys:
        raise SystemExit('no completed matches found')
    flat = lambda ks: [x for k in ks for x in groups[k]]
    score = sum(flat(keys)) / len(flat(keys))
    rnd = random.Random(seed)
    boot = sorted(sum(v) / len(v) for v in (flat([rnd.choice(keys) for _ in keys]) for _ in range(n)))
    lo, hi = boot[int(0.025 * n)], boot[int(0.975 * n) - 1]
    status = '要確認' if score < ALERT or hi < BASE_P3 else '範囲内'
    return {'games': len(flat(keys)), 'seedGroups': len(keys), 'firstSeatScore': round(score, 3), 'ci95': [round(lo, 3), round(hi, 3)],
            'baselineP3': BASE_P3, 'baselineWithoutNewCards': BASE_A0, 'diffFromBaselineP3': round(score - BASE_P3, 3), 'status': status}

if __name__ == '__main__':
    print(json.dumps(check(sys.argv[1:]), ensure_ascii=False, indent=1))
