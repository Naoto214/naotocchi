#!/usr/bin/env python3
"""EXPERIMENT ONLY. Aggregates runs/shard*.jsonl(.gz) into results/summary.json and results/tables.md with the metrics
fixed in PLAN.md.  Usage: python3 analyze.py"""
import glob, gzip, json, os, random, statistics as st
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__))
rows = [json.loads(l) for f in sorted(glob.glob(os.path.join(HERE, 'runs', 'shard*.jsonl*')))
        for l in (gzip.open(f, 'rt') if f.endswith('.gz') else open(f)) if l.strip()]
ok = [r for r in rows if r['status'] == 'completed']
OPP = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
def boot(xs, seed=20261027, n=10000):
    if not xs: return None
    rnd = random.Random(seed); b = sorted(st.mean(rnd.choice(xs) for _ in xs) for _ in range(n)); return [round(b[250], 3), round(b[9749], 3)]
def m(xs, d=3):
    xs = [x for x in xs if x is not None]; return round(st.mean(xs), d) if xs else None
def group_score(rs):
    g = defaultdict(list)
    for r in rs: g[r['group']].append(r['testScore'])
    return {k: st.mean(v) for k, v in g.items() if len(v) == 2}
def jumps(r, seat):
    return [x['stage'] - x['from'] for x in r['moves'][seat] if x['variant'] == 'time_skip']
def double_turns(r, seat):
    c = Counter(x['round'] for x in r['moves'][seat] if x['variant'] == 'time_skip'); return sum(1 for v in c.values() if v >= 2)
SYN = ['E-mirror', 'I-c_time_forward', 'G-picross-5', 'C-shiba', 'E-fateful-transform', 'G-jump-quest', 'W-snow', 'P-snow_spirit']
def dj_block(rs, seats_of):
    D = [(r, r['dj'][s], s) for r in rs for s in seats_of(r)]
    drawn = sum(d['drawn'] for _, d, _ in D); plays = sum(len(d['plays']) for _, d, _ in D)
    used = sum(d['usedOnOpportunity'] for _, d, _ in D); opp = sum(d['opportunityTurns'] for _, d, _ in D)
    single = sum(d['opportunityWithSingleStep'] for _, d, _ in D)
    draws = sum(d['draws'] for _, d, _ in D); p5 = sum(d['plus5'] for _, d, _ in D)
    J = [j for r, _, s in D for j in jumps(r, s)]
    gain = Counter(5 * d['plus5'] for _, d, _ in D)
    syn = Counter()
    for r, d, s in D:
        for f in d['fires']:
            for c in r['playedByTurn'][s].get(f"{f['round']}:{s}", []):
                if c in SYN: syn[c] += 1
    return {'seats': len(D), 'drawn': drawn, 'plays': plays, 'play_per_draw': round(plays / drawn, 3) if drawn else None,
            'opportunity_turns': opp, 'opportunity_with_single_step': single, 'used_on_opportunity': used,
            'plays_without_opportunity': plays - used, 'opportunities_not_used': opp - used,
            'draw_fires': draws, 'plus5_fires': p5, 'plus5_per_play': round(p5 / plays, 3) if plays else None,
            'plus5_per_opportunity_use': round(p5 / used, 3) if used else None,
            'expired_unfired': sum(d['expiredUnfired'] for _, d, _ in D), 'expired_after_draw': sum(d['expiredAfterDraw'] for _, d, _ in D),
            'growth_from_card_per_seat': dict(sorted(gain.items())), 'seats_over_15_from_card': sum(v for k, v in gain.items() if k > 15),
            'time_skips_per_seat': round(len(J) / len(D), 3), 'single_step_skips_per_seat': round(sum(1 for j in J if j == 1) / len(D), 3),
            'jump_dist': dict(sorted(Counter(J).items())), 'double_skip_turns': sum(double_turns(r, s) for r, _, s in D),
            'synergy_cards_played_on_fire_turns': dict(syn)}
S = {'matches': len(rows), 'completed': len(ok), 'abnormal': [{'match': r['match'], 'error': r['error']} for r in rows if r['status'] != 'completed'],
     'replay_mismatch': [r['match'] for r in ok if r.get('replay') != 'match'], 'E1': {}, 'E1F': {}, 'E2': {}}
for exp in ('E1', 'E1F'):
    by = {v: [r for r in ok if r['exp'] == exp and r['version'] == v] for v in 'AB'}
    ga, gb = group_score(by['A']), group_score(by['B']); common = sorted(set(ga) & set(gb)); d = [gb[k] - ga[k] for k in common]
    S[exp]['score_diff_B_minus_A'] = {'diff': round(st.mean(d), 3), 'ci95': boot(d), 'groups': len(common)}
    for v, rs in by.items():
        T = lambda r: r['test']; O = lambda r: 'B' if r['test'] == 'A' else 'A'
        S[exp][v] = {'n': len(rs), 'score': m([r['testScore'] for r in rs]), 'win': m([r['testScore'] == 1 for r in rs]),
                     'test_growth': m([r['growth'][T(r)] for r in rs], 2), 'opp_growth': m([r['growth'][O(r)] for r in rs], 2),
                     'by_opponent': {o: m([r['testScore'] for r in rs if r['opponent'] == o]) for o in OPP},
                     'by_opening_dj': {k: (lambda xs: {'n': len(xs), 'score': m(xs)})([r['testScore'] for r in rs if min(r['opening']['dj'], 1) == k]) for k in (0, 1)},
                     'by_opening_mains': {k: (lambda xs: {'n': len(xs), 'score': m(xs)})([r['testScore'] for r in rs if min(r['opening']['mains'], 2) == k]) for k in (0, 1, 2)},
                     'dj': dj_block(rs, lambda r: [r['test']])}
    # Observational (confounded): score when the card was used on an opportunity vs drawn and never used.
    for v, rs in by.items():
        used = [r['testScore'] for r in rs if r['dj'][r['test']]['usedOnOpportunity'] > 0]
        idle = [r['testScore'] for r in rs if r['dj'][r['test']]['drawn'] > 0 and not r['dj'][r['test']]['plays']]
        S[exp][v]['observational'] = {'used_on_opportunity': {'n': len(used), 'score': m(used)}, 'drawn_never_played': {'n': len(idle), 'score': m(idle)}}
    # Per-opponent paired diff (small n, indicative only)
    S[exp]['by_opponent_diff'] = {o: round(st.mean([gb[k] - ga[k] for k in common if k.split(':')[1] == o]), 3) for o in OPP}
E2 = [r for r in ok if r['exp'] == 'E2']
cells = {}
for strat in ('A_early', 'C_late7'):
    for v in 'AB':
        rs = [r for r in E2 if r['strategy'] == strat and r['version'] == v]
        cells[(strat, v)] = group_score(rs)
        S['E2'][f'{strat}:{v}'] = {'n': len(rs), 'score': m([r['testScore'] for r in rs]),
                                   'test_growth': m([r['growth'][r['test']] for r in rs], 2),
                                   'dj_test_seat': dj_block(rs, lambda r: [r['test']]), 'dj_both_seats': dj_block(rs, lambda r: ['A', 'B'])}
gap = {}
for v in 'AB':
    common = sorted(set(cells[('A_early', v)]) & set(cells[('C_late7', v)]))
    gap[v] = {k: cells[('A_early', v)][k] - cells[('C_late7', v)][k] for k in common}
    S['E2'][f'gap_A_minus_C:{v}'] = {'diff': round(st.mean(gap[v].values()), 3), 'ci95': boot(list(gap[v].values()))}
common = sorted(set(gap['A']) & set(gap['B'])); dd = [gap['B'][k] - gap['A'][k] for k in common]
S['E2']['gap_change_B_minus_A'] = {'diff': round(st.mean(dd), 3), 'ci95': boot(dd), 'groups': len(common)}
# Pre-registered verdicts
e1, e1f = S['E1']['score_diff_B_minus_A'], S['E1F']['score_diff_B_minus_A']
f = S['E1F']['B']['dj']
S['verdict'] = {
    'too_strong': bool((e1['ci95'] and e1['ci95'][0] > 0.10) or (e1f['ci95'] and e1f['ci95'][0] > 0.10) or S['E1']['B']['dj']['seats_over_15_from_card'] > 0.05 * S['E1']['B']['dj']['seats']),
    'no_effect': bool(f['plus5_per_opportunity_use'] is not None and f['plus5_per_opportunity_use'] < 0.2),
    'removes_waiting': bool(S['E2']['gap_change_B_minus_A']['diff'] > 0.15),
    'stop': bool(S['abnormal'] or S['replay_mismatch']),
}
S['verdict']['adoptable'] = bool(not any(S['verdict'].values()) and (f['plus5_per_opportunity_use'] or 0) >= 0.3
                                 and e1f['ci95'] and e1f['ci95'][0] >= -1e-9 and e1f['ci95'][1] <= 0.10)
os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
json.dump(S, open(os.path.join(HERE, 'results', 'summary.json'), 'w'), ensure_ascii=False, indent=1)
L = ['# ぴょんぴょんジャンプ A/B 集計（analyze.py 自動生成）', '', f"完走 {S['completed']}/{S['matches']}、異常 {len(S['abnormal'])}、再生不一致 {len(S['replay_mismatch'])}", '']
for exp in ('E1', 'E1F'):
    x = S[exp]; L += [f'## {exp}', '', f"得点率差 B−A：{x['score_diff_B_minus_A']['diff']} 95%区間 {x['score_diff_B_minus_A']['ci95']}（{x['score_diff_B_minus_A']['groups']}群）", '',
                     '| 版 | n | 得点率 | 検証デッキそだち | 相手そだち | ドロー | 使用 | 使用/ドロー | 使用機会T | うち1段階可 | 機会で使用 | 機会なしで使用 | 機会を見送り | ドロー発動 | +5発動 | +5/使用 | +5/機会使用 | 不発のまま失効 | ときおくり/席 | 1段階/席 | 2回T |',
                     '|' + '---|' * 21]
    for v in 'AB':
        a, d = x[v], x[v]['dj']
        L.append(f"| {v} | {a['n']} | {a['score']} | {a['test_growth']} | {a['opp_growth']} | {d['drawn']} | {d['plays']} | {d['play_per_draw']} | {d['opportunity_turns']} | {d['opportunity_with_single_step']} | {d['used_on_opportunity']} | {d['plays_without_opportunity']} | {d['opportunities_not_used']} | {d['draw_fires']} | {d['plus5_fires']} | {d['plus5_per_play']} | {d['plus5_per_opportunity_use']} | {d['expired_unfired']} | {d['time_skips_per_seat']} | {d['single_step_skips_per_seat']} | {d['double_skip_turns']} |")
    L += ['', '相手別得点率（A／B／差）：' + '、'.join(f"{o} {x['A']['by_opponent'][o]}／{x['B']['by_opponent'][o]}／{x['by_opponent_diff'][o]}" for o in OPP), '']
L += ['## E2（検証デッキ鏡像、戦略A_early／C_late7）', '', '| 戦略:版 | n | 得点率 | そだち | 使用(両席) | +5(両席) |', '|---|---|---|---|---|---|']
for k in ('A_early:A', 'A_early:B', 'C_late7:A', 'C_late7:B'):
    c = S['E2'][k]; L.append(f"| {k} | {c['n']} | {c['score']} | {c['test_growth']} | {c['dj_both_seats']['plays']} | {c['dj_both_seats']['plus5_fires']} |")
L += ['', f"A_early−C_late7：A版 {S['E2']['gap_A_minus_C:A']}、B版 {S['E2']['gap_A_minus_C:B']}、変化 {S['E2']['gap_change_B_minus_A']}", '', f"判定：{S['verdict']}"]
open(os.path.join(HERE, 'results', 'tables.md'), 'w').write('\n'.join(L) + '\n')
print('\n'.join(L))
