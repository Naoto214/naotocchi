#!/usr/bin/env python3
"""Read-only: main movements in the PR #447 egg-wait study (2,240 saved games, rule 'current' only by default).
How often each seat births / time-skips / transforms, how many stages a time-skip jumps, the stage reached, and
main-ability use, per strategy and per deck. Writes results/main-moves.json.  Usage: python3 tools/main_moves.py"""
import glob, gzip, json, os, statistics as st
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__)); STUDY = os.path.join(HERE, '..', '..', 'egg-wait-study-20261026')
rows = [json.loads(l) for f in sorted(glob.glob(os.path.join(STUDY, 'runs', 'shard*.jsonl.gz'))) for l in gzip.open(f, 'rt')]
rows = [r for r in rows if r['status'] == 'completed' and r['rule'] == 'current']
def seat_stats(r, seat):
    mv = r['moves'][seat]; births = [m for m in mv if m['variant'] == 'birth']
    skips = [m for m in mv if m['variant'] == 'time_skip']; trans = [m for m in mv if m['variant'] == 'transform']
    stage, jumps = None, []
    for m in mv:
        if m['variant'] == 'time_skip' and stage is not None: jumps.append(m['stage'] - stage)
        stage = m['stage']
    return {'births': len(births), 'skips': len(skips), 'trans': len(trans), 'jumps': jumps,
            'final_stage': stage, 'first_stage': births[0]['stage'] if births else None,
            'ability': r['mainAbility'][seat]}
out = {}
for key in ('strategy', 'deck'):
    groups = defaultdict(list)
    for r in rows:
        study, opp = r['study'], 'B' if r['study'] == 'A' else 'A'
        if key == 'strategy': groups[r['strategy']].append((seat_stats(r, study), r['studyScore']))
        elif r['strategy'] == 'A_early':  # official CPU vs official CPU: both seats are the same policy
            for seat in (study, opp): groups[r['deck']].append((seat_stats(r, seat), None))
    res = {}
    for g, xs in sorted(groups.items()):
        S = [x for x, _ in xs]; J = [j for s in S for j in s['jumps']]
        res[g] = {'seats': len(S), 'births': round(st.mean(s['births'] for s in S), 2),
                  'time_skips': round(st.mean(s['skips'] for s in S), 2), 'transforms': round(st.mean(s['trans'] for s in S), 2),
                  'skip_jump_dist': dict(sorted(Counter(J).items())), 'skip_jump_mean': round(st.mean(J), 2) if J else None,
                  'first_stage_mean': round(st.mean(s['first_stage'] for s in S if s['first_stage']), 2) if any(s['first_stage'] for s in S) else None,
                  'final_stage_mean': round(st.mean(s['final_stage'] for s in S if s['final_stage']), 2) if any(s['final_stage'] for s in S) else None,
                  'main_ability_mean': round(st.mean(s['ability'] for s in S), 2),
                  'never_skipped_share': round(sum(1 for s in S if s['births'] and not s['skips']) / max(1, sum(1 for s in S if s['births'])), 3)}
    out['by_' + key] = res
json.dump(out, open(os.path.join(HERE, '..', 'results', 'main-moves.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))

# Turns with two or more time-skips (the condition of ぴょんぴょんジャンプ's +5 and ジャンプクエスト), official CPU seats.
two = {'seats': 0, 'seats_with_double_skip_turn': 0, 'skip_turns': 0, 'double_skip_turns': 0}
for r in rows:
    if r['strategy'] != 'A_early': continue
    for seat in 'AB':
        c = Counter(m['round'] for m in r['moves'][seat] if m['variant'] == 'time_skip')
        two['seats'] += 1; two['skip_turns'] += len(c)
        two['double_skip_turns'] += sum(1 for v in c.values() if v >= 2); two['seats_with_double_skip_turn'] += any(v >= 2 for v in c.values())
out['double_time_skip'] = two
json.dump(out, open(os.path.join(HERE, '..', 'results', 'main-moves.json'), 'w'), ensure_ascii=False, indent=1)
print(two)
