#!/usr/bin/env python3
"""EXPERIMENT ONLY: candidate time opportunity cost vs the official intermediate CPU (runs/AB-*.jsonl.gz).
Score = win 1 / draw 0.5 / loss 0 for the candidate seat. Every group is played with both seat orders and the candidate
in both seats, on mirrored decks, so seat and deck effects cancel. 95% interval: normal approximation by match.
Output: results/ab-summary.json"""
import gzip, json, glob, os, collections, math
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    rows = []
    for f in sorted(glob.glob(f'{HERE}/runs/AB-shard*.jsonl.gz') + glob.glob(f'{HERE}/runs/AB2-shard*.jsonl.gz')):
        rows += [json.loads(l) for l in gzip.open(f, 'rt')]
    out = {'matches': len(rows), 'completed': sum(r['status'] == 'completed' for r in rows), 'by': {}}
    agg = collections.defaultdict(list)
    extra = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in rows:
        if r['status'] != 'completed':
            continue
        cand = 'A' if r['policy']['A'] != 'official' else 'B'
        off = 'B' if cand == 'A' else 'A'
        w = r['result'].get('winner')
        sc = 1.0 if w == cand else 0.0 if w == off else 0.5
        deck = r['deck']['A']
        for key in (r['variant'], f"{r['variant']}|{deck}", f"{r['variant']}|first" if cand == 'A' else f"{r['variant']}|second"):
            agg[key].append(sc)
            e = extra[key]
            e['candFirstBirth'].append(r['firstBirth'][cand] or 11)
            e['offFirstBirth'].append(r['firstBirth'][off] or 11)
            e['candLost'].append(r['lost'][cand])
            e['offLost'].append(r['lost'][off])
            e['candGrowth'].append(r['growth'][cand])
            e['offGrowth'].append(r['growth'][off])
            e['differs'].append(r['differs'][cand])
    for key, v in sorted(agg.items()):
        n = len(v)
        m = sum(v) / n
        sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1)) if n > 1 else 0
        e = extra[key]
        mean = lambda xs: round(sum(xs) / len(xs), 3)
        out['by'][key] = {'n': n, 'candidateScore': round(m, 3), 'ci95': [round(m - 1.96 * sd / math.sqrt(n), 3), round(m + 1.96 * sd / math.sqrt(n), 3)],
                          'firstBirthRound': {'candidate': mean(e['candFirstBirth']), 'official': mean(e['offFirstBirth'])},
                          'timeLostPerMatch': {'candidate': mean(e['candLost']), 'official': mean(e['offLost'])},
                          'finalGrowth': {'candidate': mean(e['candGrowth']), 'official': mean(e['offGrowth'])},
                          'decisionsWherePoliciesDiffer': mean(e['differs'])}
    json.dump(out, open(f'{HERE}/results/ab-summary.json', 'w'), ensure_ascii=False, indent=1)
    for k, v in out['by'].items():
        print(k, v)


main()
