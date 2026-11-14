#!/usr/bin/env python3
"""Compares each arm with base on the same match IDs (runs/<arm>-shard*.jsonl[.gz]) -> results/summary.json, results/tables.md.
Usage: python3 tools/analyze.py"""
import json, glob, os, gzip, collections, math
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
op = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
def load(arm): return {r['match']: r for f in sorted(glob.glob(f'{D}/runs/{arm}-shard*.jsonl*')) for r in map(json.loads, op(f)) if r['status'] == 'completed'}
ARMS = ['base', 'E1', 'E1b', 'E2', 'E2b', 'E3']
R = {a: load(a) for a in ARMS}
CHANGED = {'E1': 'intermediate', 'E1b': 'beginner', 'E2': 'intermediate', 'E2b': 'beginner', 'E3': 'intermediate'}
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
JA = {'main': 'メイン成長', 'companion': 'なかま', 'partner': 'こいびと・交際', 'challenge': 'ちょうせん', 'growth': 'そだち獲得', 'item': 'アイテム・じゅんび', 'balance': 'バランス', 'beginner': '初級', 'intermediate': '中級'}
pts = lambda r, a: 1.0 if r['result']['winner'] == a else 0.5 if r['result']['winner'] is None else 0.0
def ci(xs):
    n = len(xs); m = sum(xs) / n if n else 0
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1)) if n > 1 else 0
    return round(m, 3), round(1.96 * sd / math.sqrt(n), 3) if n else None, n
out = {'counts': {a: len(R[a]) for a in ARMS}, 'abnormal': {}}
for a in ARMS:
    fs = sorted(glob.glob(f'{D}/runs/{a}-shard*.jsonl*'))
    out['abnormal'][a] = sum(1 for f in fs for r in map(json.loads, op(f)) if r['status'] != 'completed')
def seat_rows(arm, filt=lambda r, a: True):
    for m, r in R[arm].items():
        for a in 'AB':
            if filt(r, a): yield m, r, a
# 1. stat choice accuracy
acc = {}
for arm in ARMS:
    for diff in ['beginner', 'intermediate']:
        c = collections.Counter()
        for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff):
            for card, v in r['seat'][a]['statChoice'].items():
                c[card + ':match'] += v['match']; c[card + ':mismatch'] += v['mismatch']; c['all:match'] += v['match']; c['all:mismatch'] += v['mismatch']
        acc[f'{arm}/{diff}'] = {k: {'match': c[k + ':match'], 'mismatch': c[k + ':mismatch'], 'rate': round(c[k + ':match'] / max(1, c[k + ':match'] + c[k + ':mismatch']), 3)} for k in ['all', 'G-ski-jump', 'G-street-fight']}
out['statAccuracy'] = acc
# 2. per-arm effect on the changed difficulty: paired with base on the same match ID
eff = {}
for arm, diff in CHANGED.items():
    dg, dp, ch = [], [], collections.Counter()
    for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff):
        b = R['base'].get(m)
        if not b: continue
        o = 'B' if a == 'A' else 'A'
        dg.append(r['growth'][a] - b['growth'][a]); dp.append(pts(r, a) - pts(b, a))
        for k, x in [('arm', r), ('base', b)]:
            C = x['seat'][a]['challenge']
            ch[k + 'Decl'] += C['declared']; ch[k + 'DeclWon'] += C['declaredWon']; ch[k + 'Def'] += C['defended']; ch[k + 'DefWon'] += C['defendedWon']
            ch[k + 'Growth'] += x['growth'][a]; ch[k + 'Pts'] += pts(x, a)
    n = len(dg)
    if not n: continue
    eff[arm] = {'difficulty': diff, 'seats': n, 'growthDiff': ci(dg), 'pointsDiff': ci(dp),
                'meanGrowth': {'base': round(ch['baseGrowth'] / n, 2), 'arm': round(ch['armGrowth'] / n, 2)},
                'points': {'base': round(ch['basePts'] / n, 3), 'arm': round(ch['armPts'] / n, 3)},
                'challenge': {k: {'declared': ch[k + 'Decl'], 'declaredWinRate': round(ch[k + 'DeclWon'] / max(1, ch[k + 'Decl']), 3), 'defended': ch[k + 'Def'], 'defendedWinRate': round(ch[k + 'DefWon'] / max(1, ch[k + 'Def']), 3)} for k in ['base', 'arm']}}
out['effect'] = eff
# 3. difficulty gap (BI/IB): intermediate points per game
gap = {}
for arm in ARMS:
    xs = [pts(r, a) for m, r, a in seat_rows(arm, lambda r, a: r['pair'] in ('BI', 'IB') and r['difficulty'][a] == 'intermediate')]
    if xs: gap[arm] = {'games': len(xs), 'intermediatePoints': round(sum(xs) / len(xs), 3), 'intWin': sum(1 for x in xs if x == 1), 'begWin': sum(1 for x in xs if x == 0), 'draw': sum(1 for x in xs if x == .5)}
out['difficultyGap'] = gap
# 4. first-seat bias in mirror-difficulty pairs
fb = {}
for arm in ARMS:
    for pair in ['II', 'BB']:
        xs = [pts(r, 'A') for r in R[arm].values() if r['pair'] == pair]
        if xs: fb[f'{arm}/{pair}'] = {'games': len(xs), 'firstPoints': round(sum(xs) / len(xs), 3)}
out['firstSeat'] = fb
# 5. deck balance in II (both seats intermediate): deck points vs every other deck
bal = {}
for arm in [x for x in ['base', 'E1', 'E2', 'E3'] if R[x]]:
    tab = collections.defaultdict(list)
    for r in R[arm].values():
        if r['pair'] != 'II': continue
        for a in 'AB':
            o = 'B' if a == 'A' else 'A'
            tab[(r['deck'][a], r['deck'][o])].append(pts(r, a))
    bal[arm] = {'overall': {d: round(sum(sum(v) for (x, y), v in tab.items() if x == d and y != d) / max(1, sum(len(v) for (x, y), v in tab.items() if x == d and y != d)), 3) for d in DECKS},
                'pairs': {f'{x}>{y}': round(sum(v) / len(v), 3) for (x, y), v in sorted(tab.items()) if x != y}}
for arm in [x for x in ['E1', 'E2', 'E3'] if x in bal]:
    shifts = {k: round(v - bal['base']['pairs'][k], 3) for k, v in bal[arm]['pairs'].items()}
    bal[arm]['maxPairShift'] = max(shifts.items(), key=lambda kv: abs(kv[1]))
    bal[arm]['overallShift'] = {d: round(bal[arm]['overall'][d] - bal['base']['overall'][d], 3) for d in DECKS}
out['deckBalanceII'] = bal
# 6. decision time
tm = {}
for arm in ARMS:
    for diff in ['beginner', 'intermediate']:
        ms = dec = 0
        for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff):
            ms += r['seat'][a]['ms']; dec += r['seat'][a]['decisions']
        if dec: tm[f'{arm}/{diff}'] = {'decisions': dec, 'msPerDecision': round(ms / dec, 3)}
out['decisionTime'] = tm
# 7. traps and last-round play
tr = {}
for arm in ARMS:
    for diff in ['beginner', 'intermediate']:
        s = collections.Counter(); f = collections.Counter(); left = collections.Counter(); delay = blocked = seats = r10 = r10s = 0
        for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff):
            T = r['seat'][a]['traps']; s.update(T['set']); f.update(T['fired']); left.update(T['leftAtEnd']); delay += T['delay']; blocked += T['blockedFull']; seats += 1
            r10 += r['seat'][a]['r10']['plays']; r10s += r['seat'][a]['r10']['spent']
        if not seats: continue
        tr[f'{arm}/{diff}'] = {'seats': seats, 'set': dict(s), 'fired': dict(f), 'leftAtEnd': dict(left), 'firedShare': round(sum(f.values()) / max(1, sum(s.values())), 3),
                               'meanRoundsToFire': round(delay / max(1, sum(f.values())), 2), 'blockedFullPerGame': round(blocked / max(1, seats), 3), 'r10PlaysPerGame': round(r10 / max(1, seats), 3), 'r10TimePerGame': round(r10s / max(1, seats), 3)}
out['trapsAndR10'] = tr
# 8. per-deck effect of each arm on the changed difficulty (paired growth / points)
pd = {}
for arm, diff in CHANGED.items():
    for d in DECKS:
        g, p = [], []
        for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff and r['deck'][a] == d):
            b = R['base'].get(m)
            if b: g.append(r['growth'][a] - b['growth'][a]); p.append(pts(r, a) - pts(b, a))
        if g: pd[f'{arm}/{d}'] = {'seats': len(g), 'growthDiff': ci(g), 'pointsDiff': ci(p), 'changedGames': sum(1 for x in g if x != 0)}
out['perDeck'] = pd
# 9. clean effect: only seats whose opponent is NOT changed by the arm (opponent of the other difficulty)
cl = {}
for arm, diff in CHANGED.items():
    for d in DECKS + ['all']:
        g, p = [], []
        for m, r, a in seat_rows(arm, lambda r, a: r['difficulty'][a] == diff and r['difficulty']['B' if a == 'A' else 'A'] != diff and (d == 'all' or r['deck'][a] == d)):
            b = R['base'].get(m)
            if b: g.append(r['growth'][a] - b['growth'][a]); p.append(pts(r, a) - pts(b, a))
        if g: cl[f'{arm}/{d}'] = {'seats': len(g), 'growthDiff': ci(g), 'pointsDiff': ci(p), 'changedGames': sum(1 for x in g if x != 0)}
out['cleanEffect'] = cl
json.dump(out, open(f'{D}/results/summary.json', 'w'), ensure_ascii=False, indent=1)
# ---- markdown
L = []; P = L.append
P('# 比較表（tools/analyze.py が生成）\n'); P(f"試合数 {out['counts']}、異常終了 {out['abnormal']}\n")
P('## 1. 能力値選択の一致率（勝負中、ちから／ちえを選ぶ候補を選んだ時）\n')
P('| 条件 | 難易度 | 全体 | スキージャンプ | かくとうバトル |'); P('|---|---|---|---|---|')
for k, v in acc.items():
    arm, diff = k.split('/')
    f = lambda x: f"{x['rate']} ({x['match']}/{x['match'] + x['mismatch']})"
    P(f"| {arm} | {JA[diff]} | {f(v['all'])} | {f(v['G-ski-jump'])} | {f(v['G-street-fight'])} |")
P('\n## 2. 変更した難易度の席への効果（同じ試合IDで base と対応比較、平均 ± 95%幅）\n')
P('| 条件 | 対象 | 席数 | 最終そだち base→条件 | 差 | 勝点 base→条件 | 勝点差 | 宣言勝率 base→条件 | 防御勝率 base→条件 |'); P('|---|---|---|---|---|---|---|---|---|')
for arm, v in eff.items():
    c = v['challenge']
    P(f"| {arm} | {JA[v['difficulty']]} | {v['seats']} | {v['meanGrowth']['base']}→{v['meanGrowth']['arm']} | {v['growthDiff'][0]} ±{v['growthDiff'][1]} | {v['points']['base']}→{v['points']['arm']} | {v['pointsDiff'][0]} ±{v['pointsDiff'][1]} | {c['base']['declaredWinRate']}→{c['arm']['declaredWinRate']} | {c['base']['defendedWinRate']}→{c['arm']['defendedWinRate']} |")
P('\n## 3. 初級と中級の差（BI/IB、中級側の勝点。勝1・分0.5・負0）\n')
P('| 条件 | 試合 | 中級の勝点 | 中級勝 | 初級勝 | 分 |'); P('|---|---|---|---|---|---|')
for arm, v in gap.items(): P(f"| {arm} | {v['games']} | {v['intermediatePoints']} | {v['intWin']} | {v['begWin']} | {v['draw']} |")
P('\n## 4. 先攻の勝点（同じ難易度同士）\n')
P('| 条件/組 | 試合 | 先攻の勝点 |'); P('|---|---|---|')
for k, v in fb.items(): P(f"| {k} | {v['games']} | {v['firstPoints']} |")
P('\n## 5. デッキ間バランス（中級×中級、他デッキに対する勝点）\n')
P('| デッキ | base | E1 | E2 | E3 |'); P('|---|---|---|---|---|')
cell = lambda a, d: f"{bal[a]['overall'][d]} ({bal[a]['overallShift'][d]:+})" if a in bal else '—'
for d in DECKS: P(f"| {JA[d]} | {bal['base']['overall'][d]} | {cell('E1', d)} | {cell('E2', d)} | {cell('E3', d)} |")
for arm in [x for x in ['E1', 'E2', 'E3'] if x in bal]: P(f"\n- {arm} で最も動いた組（各8試合）：{bal[arm]['maxPairShift'][0]} {bal[arm]['maxPairShift'][1]:+}")
P('\n## 6. デッキ別の効果（変更した難易度の席、対応比較）\n')
P('| 条件/デッキ | 席数 | 結果が変わった席 | そだち差 | 勝点差 |'); P('|---|---|---|---|---|')
for k, v in pd.items(): P(f"| {k} | {v['seats']} | {v['changedGames']} | {v['growthDiff'][0]} ±{v['growthDiff'][1]} | {v['pointsDiff'][0]} ±{v['pointsDiff'][1]} |")
P('\n## 6b. 単独効果（相手は変更なしの難易度＝初級×中級の組だけ、対応比較）\n')
P('| 条件/デッキ | 席数 | 結果が変わった席 | そだち差 | 勝点差 |'); P('|---|---|---|---|---|')
for k, v in cl.items(): P(f"| {k} | {v['seats']} | {v['changedGames']} | {v['growthDiff'][0]} ±{v['growthDiff'][1]} | {v['pointsDiff'][0]} ±{v['pointsDiff'][1]} |")
P('\n## 7. 判断時間（観測＋選択、1判断あたりms）\n')
P('| 条件/難易度 | 判断数 | ms/判断 |'); P('|---|---|---|')
for k, v in tm.items(): P(f"| {k} | {v['decisions']} | {v['msPerDecision']} |")
P('\n## 8. しかけ・R10\n')
P('| 条件/難易度 | しかけ | 発動 | 発動率 | 発動までのR | 終局時に残存 | 満杯でしかけ不可/試合 | R10使用/試合 | R10の時/試合 |'); P('|---|---|---|---|---|---|---|---|---|')
for k, v in tr.items(): P(f"| {k} | {v['set']} | {v['fired']} | {v['firedShare']} | {v['meanRoundsToFire']} | {v['leftAtEnd']} | {v['blockedFullPerGame']} | {v['r10PlaysPerGame']} | {v['r10TimePerGame']} |")
open(f'{D}/results/tables.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
