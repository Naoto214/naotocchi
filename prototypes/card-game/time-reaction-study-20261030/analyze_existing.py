#!/usr/bin/env python3
"""Existing CPU match records only (no re-run): response windows, responses used, time left at own turn end.
Sources: balance-verification-20261022-variety V1 (int x int, 1,680) and V2 (mirror, beginner x intermediate, 840),
deck-balance-20261025 X (480). Fields used: responseDecisions, responsesUsed, timeLeft, unaffordable, turns, cards.
These counters are per seat and per match; they do not say which window or which hand, so they only give rates.
Note: V1/V2 used the earlier partner list (2026-10-22); X uses the current one.
Output: results/existing-records.json"""
import gzip, json, glob, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
CG = os.path.dirname(HERE)
SETS = {
    'V1': glob.glob(f'{CG}/balance-verification-20261022-variety/runs/V1-shard*.jsonl.gz'),
    'V2': glob.glob(f'{CG}/balance-verification-20261022-variety/runs/V2-shard*.jsonl.gz'),
    'X': glob.glob(f'{CG}/deck-balance-20261025/runs/X-shard*.jsonl.gz'),
}
QUICK_PLAYS = None
def main():
    out = {}
    for name, files in SETS.items():
        agg = collections.defaultdict(lambda: collections.Counter())
        n = 0
        for f in files:
            for line in gzip.open(f, 'rt'):
                d = json.loads(line)
                if d['status'] != 'completed':
                    continue
                n += 1
                for seat in 'AB':
                    for key in [('all', d['difficulty'][seat]), (d['deck'][seat], d['difficulty'][seat])]:
                        c = agg[key]
                        c['seats'] += 1
                        c['turns'] += d['turns'][seat]
                        c['responseDecisions'] += d['responseDecisions'][seat]
                        c['responsesUsed'] += d['responsesUsed'][seat]
                        c['timeLeft'] += d['timeLeft'][seat]
                        c['unaffordable'] += d['unaffordable'][seat]
                        c['firstSeat'] += 1 if (seat == 'A') else 0
        rows = {}
        for (deck, diff), c in sorted(agg.items()):
            rows[f'{deck}|{diff}'] = {
                'seats': c['seats'],
                'responseDecisionsPerMatch': round(c['responseDecisions'] / c['seats'], 1),
                'responsesUsedPerMatch': round(c['responsesUsed'] / c['seats'], 2),
                'useRate': round(c['responsesUsed'] / max(1, c['responseDecisions']), 4),
                'timeLeftAtOwnEndPerTurn': round(c['timeLeft'] / max(1, c['turns']), 2),
                'unaffordableCardsAtOwnEndPerTurn': round(c['unaffordable'] / max(1, c['turns']), 2),
            }
        out[name] = {'matches': n, 'rows': rows}
    os.makedirs(f'{HERE}/results', exist_ok=True)
    json.dump(out, open(f'{HERE}/results/existing-records.json', 'w'), ensure_ascii=False, indent=1)
    for name, v in out.items():
        print(name, v['matches'])
        for k, r in v['rows'].items():
            print(' ', k, r)
main()
