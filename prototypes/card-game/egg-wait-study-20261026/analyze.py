#!/usr/bin/env python3
"""EXPERIMENT ONLY. Aggregates runs/shard*.jsonl(.gz) into results/summary.json and results/tables.md,
using exactly the metrics fixed in PLAN.md. Usage: python3 analyze.py"""
import glob, gzip, json, os, random, statistics as st
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
rows = []
for f in sorted(glob.glob(os.path.join(HERE, 'runs', 'shard*.jsonl*'))):
    op = gzip.open if f.endswith('.gz') else open
    rows += [json.loads(l) for l in op(f, 'rt') if l.strip()]
STRATS = ['A_early', 'B_wait3', 'C_late7', 'D_never']; RULES = ['current', 'egg00']
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
ok = [r for r in rows if r['status'] == 'completed']
abnormal = [r for r in rows if r['status'] != 'completed']
other = lambda a: 'B' if a == 'A' else 'A'
by = defaultdict(list)
for r in ok: by[(r['rule'], r['strategy'])].append(r)
# group score = mean of the two seat orders for one deal
def group_scores(rs):
    g = defaultdict(list)
    for r in rs: g[r['group']].append(r['studyScore'])
    return {k: st.mean(v) for k, v in g.items() if len(v) == 2}
def boot(diffs, n=10000, seed=20261026):
    rnd = random.Random(seed); m = len(diffs)
    if not m: return None
    xs = sorted(st.mean(rnd.choice(diffs) for _ in range(m)) for _ in range(n))
    return [round(xs[int(.025 * n)], 3), round(xs[int(.975 * n) - 1], 3)]
def mean(xs): xs = [x for x in xs if x is not None]; return round(st.mean(xs), 2) if xs else None
summary = {'matches': len(rows), 'completed': len(ok), 'abnormal': len(abnormal),
           'abnormal_examples': [{'match': r['match'], 'error': r['error']} for r in abnormal[:10]],
           'replay_mismatch': sum(1 for r in ok if r.get('replay') != 'match'), 'cells': {}}
for rule in RULES:
    base = group_scores(by[(rule, 'A_early')])
    for s in STRATS:
        rs = by[(rule, s)]
        if not rs: continue
        gs = group_scores(rs); common = sorted(set(gs) & set(base))
        diffs = [gs[k] - base[k] for k in common]
        S = lambda r: r['study']; O = lambda r: other(r['study'])
        ch_won = [sum(1 for c in r['challenges'] if c['winner'] == S(r)) for r in rs]
        ch_lost = [sum(1 for c in r['challenges'] if c['winner'] == O(r)) for r in rs]
        ch_vs_egg = [sum(1 for c in r['challenges'] if c['egg'].get(S(r))) for r in rs]
        ch_vs_egg_lost = [sum(1 for c in r['challenges'] if c['egg'].get(S(r)) and c['winner'] == O(r)) for r in rs]
        births = [r['birth'][S(r)] for r in rs]
        cell = {
            'n': len(rs), 'score': round(st.mean(r['studyScore'] for r in rs), 3),
            'win': round(sum(r['studyScore'] == 1 for r in rs) / len(rs), 3),
            'draw': round(sum(r['studyScore'] == .5 for r in rs) / len(rs), 3),
            'diff_vs_A_paired': round(st.mean(diffs), 3) if diffs else None, 'diff_ci95': boot(diffs) if s != 'A_early' else None,
            'groups': len(common),
            'study_growth': mean([r['growth'][S(r)] for r in rs]), 'opp_growth': mean([r['growth'][O(r)] for r in rs]),
            'growth_margin': mean([r['growth'][S(r)] - r['growth'][O(r)] for r in rs]),
            'study_growth_by_round': [mean([r['growthByRound'][S(r)][i] for r in rs if len(r['growthByRound'][S(r)]) > i]) for i in range(10)],
            'opp_growth_by_round': [mean([r['growthByRound'][O(r)][i] for r in rs if len(r['growthByRound'][O(r)]) > i]) for i in range(10)],
            'hatched_share': round(sum(b is not None for b in births) / len(rs), 3),
            'birth_round': mean([b['round'] for b in births if b]), 'birth_stage': mean([b['stage'] for b in births if b]),
            'egg_turns': mean([r['eggTurns'][S(r)] for r in rs]),
            'study_challenges_won': mean(ch_won), 'study_challenges_lost': mean(ch_lost),
            'challenged_as_egg': mean(ch_vs_egg), 'lost_as_egg': mean(ch_vs_egg_lost),
            'opp_blocked_turns': mean([r['blockedChallenge'][O(r)] for r in rs]),
            'time_use': round(1 - sum(r['timeLeft'][S(r)] for r in rs) / max(1, sum(r['timeAvail'][S(r)] for r in rs)), 3),
            'hand_mean': mean([st.mean(r['handByTurn'][S(r)]) for r in rs if r['handByTurn'][S(r)]]),
            'main_ability': mean([r['mainAbility'][S(r)] for r in rs]),
            'married_share': round(sum(r['relationship'][S(r)]['marriedRound'] is not None for r in rs) / len(rs), 3),
            'relationship_max': mean([r['relationship'][S(r)]['max'] for r in rs]),
            'reach100_win': round(sum(1 for r in rs if (r['result'] or {}).get('reason') == '100維持' and r['result']['winner'] == S(r)) / len(rs), 3),
            'late_comeback': round(sum(1 for r in rs if len(r['growthByRound'][S(r)]) >= 7 and r['growthByRound'][S(r)][6] < r['growthByRound'][O(r)][6] and r['studyScore'] == 1)
                                   / max(1, sum(1 for r in rs if len(r['growthByRound'][S(r)]) >= 7 and r['growthByRound'][S(r)][6] < r['growthByRound'][O(r)][6])), 3),
            'by_opening_mains': {k: (lambda xs: {'n': len(xs), 'score': round(st.mean(xs), 3) if xs else None})(
                [r['studyScore'] for r in rs if (min(r['opening']['mains'], 2) == k)]) for k in (0, 1, 2)},
            'by_seat': {seat: round(st.mean([r['studyScore'] for r in rs if r['study'] == seat]), 3) for seat in 'AB'},
            'by_deck': {d: round(st.mean([r['studyScore'] for r in rs if r['deck'] == d]), 3) for d in DECKS if any(r['deck'] == d for r in rs)},
        }
        summary['cells'][f'{rule}:{s}'] = cell
# Rule effect on the same strategy (egg00 minus current), paired by deal.
summary['rule_effect'] = {}
for s in STRATS:
    a, b = group_scores(by[('current', s)]), group_scores(by[('egg00', s)])
    common = sorted(set(a) & set(b)); d = [b[k] - a[k] for k in common]
    if d: summary['rule_effect'][s] = {'diff': round(st.mean(d), 3), 'ci95': boot(d), 'groups': len(common)}
# Official CPU vs official CPU under each rule: seat bias (first player) as a fairness check.
for rule in RULES:
    rs = by[(rule, 'A_early')]
    if rs: summary['cells'][f'{rule}:A_early']['first_player_score'] = round(st.mean([r['studyScore'] if r['study'] == 'A' else 1 - r['studyScore'] for r in rs]), 3)
os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
json.dump(summary, open(os.path.join(HERE, 'results', 'summary.json'), 'w'), ensure_ascii=False, indent=1)
L = ['# たまご待機・0/0ちょうせん比較の集計（analyze.py 自動生成）', '',
     f"完走 {summary['completed']}/{summary['matches']}、異常 {summary['abnormal']}、再生不一致 {summary['replay_mismatch']}", '',
     '| ルール | 戦略 | n | 得点率 | A比(対応差) | 95%区間 | 調査席そだち | 相手そだち | たんじょうR | 段階 | たまごT | 勝/負ちょうせん | たまごで受けた(負) | 相手の封じられたT | 時使用率 | メイン能力 | 結婚率 |',
     '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for k, c in summary['cells'].items():
    rule, s = k.split(':')
    L.append(f"| {rule} | {s} | {c['n']} | {c['score']} | {c['diff_vs_A_paired']} | {c['diff_ci95']} | {c['study_growth']} | {c['opp_growth']} | {c['birth_round']} | {c['birth_stage']} | {c['egg_turns']} | {c['study_challenges_won']}/{c['study_challenges_lost']} | {c['challenged_as_egg']}({c['lost_as_egg']}) | {c['opp_blocked_turns']} | {c['time_use']} | {c['main_ability']} | {c['married_share']} |")
L += ['', '## ルール差（同じ戦略・同じ配札、egg00 − current）', '', '| 戦略 | 得点率差 | 95%区間 |', '|---|---|---|']
for s, v in summary['rule_effect'].items(): L.append(f"| {s} | {v['diff']} | {v['ci95']} |")
L += ['', '## デッキ別得点率', '', '| ルール:戦略 | ' + ' | '.join(DECKS) + ' |', '|---' * (len(DECKS) + 1) + '|']
for k, c in summary['cells'].items(): L.append(f"| {k} | " + ' | '.join(str(c['by_deck'].get(d)) for d in DECKS) + ' |')
L += ['', '## 初期手札のメイン枚数別得点率（n）', '', '| ルール:戦略 | 0枚 | 1枚 | 2枚以上 |', '|---|---|---|---|']
for k, c in summary['cells'].items(): L.append(f"| {k} | " + ' | '.join(f"{v['score']} ({v['n']})" for v in c['by_opening_mains'].values()) + ' |')
L += ['', '## ラウンド終了時そだち平均（調査席／相手）', '', '| ルール:戦略 | ' + ' | '.join(f'R{i}' for i in range(1, 11)) + ' |', '|---' * 11 + '|']
for k, c in summary['cells'].items(): L.append(f"| {k} | " + ' | '.join(f"{a}/{b}" for a, b in zip(c['study_growth_by_round'], c['opp_growth_by_round'])) + ' |')
open(os.path.join(HERE, 'results', 'tables.md'), 'w').write('\n'.join(L) + '\n')
print('\n'.join(L[:16]))
