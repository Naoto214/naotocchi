#!/usr/bin/env python3
"""Read-only extraction of egg / birth / challenge facts from the official fixed-400 result branch.

Reads `origin/fixed400-results/fixed400-e8e7202ac717` blobs through `git cat-file`; writes nothing back
into the repository's evidence. Usage: python3 fixed400_egg_extract.py <out.json>
"""
import gzip, json, subprocess, sys

REF = 'origin/fixed400-results/fixed400-e8e7202ac717'
ROOT = 'docs/card-game/data/proxy-population-400-attempt-fixed400-e8e7202ac717/rows'


def blob(path):
    return subprocess.run(['git', 'cat-file', 'blob', f'{REF}:{path}'], check=True, capture_output=True).stdout


def extract(row):
    d = json.loads(gzip.decompress(blob(f'{ROOT}/{row:04d}/record.json.gz')))
    ev = d['runtime']['events']
    rnd = {'A': 0, 'B': 0}
    out = {'row': row, 'match': d['binding']['match_id'], 'completed': d.get('completed'),
           'egg_turns': {'A': 0, 'B': 0}, 'births': [], 'moves': [], 'challenges': [],
           'relationship': {'A': [], 'B': []}, 'result': None}
    for e in ev:
        t, a = e['action_type'], e.get('actor')
        if t.startswith('turn_start'):
            rnd[a] += 1
            if t == 'turn_start_and_egg_draw':
                out['egg_turns'][a] += 1
        elif t == 'main_movement':
            m = {'actor': a, 'round': rnd[a], 'variant': e.get('candidate_variant'), 'time': e.get('payment_time'),
                 'card': (e.get('source_reference') or '').split('#')[-1]}
            (out['births'] if m['variant'] == 'birth' else out['moves']).append(m)
        elif t == 'challenge_compared':
            r = e['result']
            out['challenges'].append({'round': max(rnd.values()), 'actor': r['declaring_actor'], 'winner': r.get('winner'),
                                      'values': r.get('values'), 'parameter': r.get('parameter')})
        elif t in ('relationship_progress', 'relationship_start'):
            out['relationship'][a].append({'round': rnd[a], 'step': e.get('candidate_variant') or 'start'})
        elif t in ('r10_final_comparison', 'growth_100_victory') or (e.get('result') or {}).get('completion_reason'):
            out['result'] = e['result']
    return out


if __name__ == '__main__':
    rows = [extract(i) for i in range(1, 401)]
    json.dump(rows, open(sys.argv[1], 'w'), ensure_ascii=False)
    print(len(rows))
