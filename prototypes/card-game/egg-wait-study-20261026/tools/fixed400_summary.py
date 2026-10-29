#!/usr/bin/env python3
"""Summarise results/fixed400-egg-facts.json (extracted read-only from the official fixed-400 result branch).
The first player's first turn start is inside the recorded opening, not in runtime events, so its round counter
and egg-turn count are shifted by +1. Usage: python3 tools/fixed400_summary.py"""
import collections, json, os, random, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); RES = os.path.join(HERE, '..', 'results')
R = json.load(open(os.path.join(RES, 'fixed400-egg-facts.json')))
def score(w, a): return .5 if w in (None, 'draw') else 1.0 if w == a else 0.0
out = {'rows': len(R), 'completed': sum(r['completed'] for r in R)}
births, stages, egg, by_round, early, wait5 = [], [], [], collections.defaultdict(list), [], collections.defaultdict(list)
for r in R:
    first = r['match'].split('-')[2]
    w = (r['result'] or {}).get('winner')
    b = {}
    for a in 'AB':
        off = 1 if a == first else 0
        x = next((m for m in r['births'] if m['actor'] == a), None)
        rnd = x['round'] + off if x else 11; b[a] = rnd
        egg.append(r['egg_turns'][a] + off)
        if x: births.append(rnd); stages.append(int(x['card'].split('-')[-1]))
        by_round[min(rnd, 11)].append(score(w, a))
        wait5['R1-2' if rnd <= 2 else 'R3-4' if rnd <= 4 else 'R5-6' if rnd <= 6 else 'R7+/never'].append(score(w, a))
    if b['A'] != b['B']:
        e = 'A' if b['A'] < b['B'] else 'B'; early.append((r['match'].split('-')[1], score(w, e)))
out['first_birth_round_distribution'] = dict(sorted(collections.Counter(births).items()))
out['first_birth_round_mean'] = round(st.mean(births), 2)
out['first_birth_stage_distribution'] = dict(sorted(collections.Counter(stages).items()))
out['first_birth_stage_mean'] = round(st.mean(stages), 2)
out['never_hatched_seats'] = sum(1 for r in R for a in 'AB' if not any(m['actor'] == a for m in r['births']))
out['egg_turns_mean'] = round(st.mean(egg), 2)
out['challenges_per_match_mean'] = round(st.mean(len(r['challenges']) for r in R), 2)
out['score_by_first_birth_band'] = {k: {'n': len(v), 'score': round(st.mean(v), 3)} for k, v in sorted(wait5.items())}
# cluster bootstrap by group for the earlier-hatcher score
g = collections.defaultdict(list)
for grp, s in early: g[grp].append(s)
keys = sorted(g); rnd = random.Random(20261026); xs = []
for _ in range(10000):
    pick = [rnd.choice(keys) for _ in keys]; vals = [s for k in pick for s in g[k]]; xs.append(st.mean(vals))
xs.sort()
out['earlier_hatcher'] = {'matches': len(early), 'score': round(st.mean(s for _, s in early), 3), 'ci95': [round(xs[250], 3), round(xs[9749], 3)]}
out['results'] = dict(collections.Counter(str((r['result'] or {}).get('winner')) for r in R))
out['note'] = ('Proxy policy 114_with_116 (Python fixed-400), two fixed 40-card decks (deck A: antlion 2-8 / beetle 1-2 etc.). '
               'Observational only: birth timing was chosen by the policy, not assigned, so it is confounded with the deal.')
json.dump(out, open(os.path.join(RES, 'fixed400-egg-summary.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
