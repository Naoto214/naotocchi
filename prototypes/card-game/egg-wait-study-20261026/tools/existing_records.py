#!/usr/bin/env python3
"""Read-only summary of the saved CPU-vs-CPU records (no re-run). Shows what the official CPU does with the egg
period and how much of its growth comes from challenges. Usage: python3 tools/existing_records.py <out.json>"""
import glob, gzip, json, os, statistics as st, sys
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.join(HERE, '..', '..')
SETS = ['balance-verification-20261020', 'balance-verification-20261020-cpufix', 'balance-verification-20261021-strategy',
        'balance-verification-20261022-variety', 'deck-balance-20261025', 'partner-deck-20261025']
out = {}
for name in SETS:
    rows = []
    for f in sorted(glob.glob(os.path.join(GAME, name, 'runs', '*.jsonl.gz'))):
        rows += [json.loads(l) for l in gzip.open(f, 'rt') if l.strip()]
    rows = [r for r in rows if r.get('status') == 'completed']
    first, gain, chal, eggturn_proxy, zero = [], [], [], [], 0
    for r in rows:
        ch = r.get('challenges') or []
        first.append(min([c['round'] for c in ch], default=11))
        for a in 'AB':
            g = r['growth'][a] - 20
            won = 5 * sum(1 for c in ch if c['winner'] == a)
            gain.append(g); chal.append(won)
        if not ch: zero += 1
    n = len(rows)
    out[name] = {'matches': n,
                 'first_challenge_round_median': st.median(first) if n else None,
                 'first_challenge_by_R2_share': round(sum(1 for x in first if x <= 2) / n, 3) if n else None,
                 'no_challenge_share': round(zero / n, 3) if n else None,
                 'challenge_growth_share_of_net_gain': round(sum(chal) / max(1, sum(max(0, g) for g in gain)), 3),
                 'mean_challenge_growth_per_seat': round(st.mean(chal), 2), 'mean_net_gain_per_seat': round(st.mean(gain), 2)}
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
