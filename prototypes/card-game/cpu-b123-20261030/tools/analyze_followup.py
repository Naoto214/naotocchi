#!/usr/bin/env python3
"""Follow-up E4 / E14 vs base / E1 on the same 672 match IDs (II, BI, IB). base and E1 are read from the stall-metric
re-measurement baseM / E1M, which must reproduce the stored base / E1 save sha256 (checked here).
Interaction per seat: E14 - E1 - E4 + base. 95% interval = mean +- 1.96 * standard error.
Usage: python3 tools/analyze_followup.py  -> results/followup-summary.json, results/followup-tables.md"""
import json, glob, os, gzip, math, collections
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
op = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
load = lambda arm: {r['match']: r for f in sorted(glob.glob(f'{D}/runs/{arm}-shard*.jsonl*')) for r in map(json.loads, op(f))}
R = {'base': load('baseM'), 'E1': load('E1M'), 'E4': load('E4'), 'E14': load('E14')}
stored = {'base': load('base'), 'E1': load('E1')}
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
JA = {'main': 'メイン成長', 'companion': 'なかま', 'partner': 'こいびと・交際', 'challenge': 'ちょうせん', 'growth': 'そだち獲得', 'item': 'アイテム・じゅんび', 'balance': 'バランス'}
ARMS = ['base', 'E1', 'E4', 'E14']
out = {'counts': {a: len(R[a]) for a in ARMS}, 'abnormal': {a: sum(r['status'] != 'completed' for r in R[a].values()) for a in ARMS}}
out['remeasureIdentity'] = {a: {'compared': len(R[a]), 'sameAsStored': sum(1 for m, r in R[a].items() if stored[a].get(m, {}).get('saveSha256') == r['saveSha256'])} for a in ['base', 'E1']}
ids = sorted(set.intersection(*[set(R[a]) for a in ARMS]))
pts = lambda r, a: 1.0 if r['result']['winner'] == a else 0.5 if r['result']['winner'] is None else 0.0
def ci(xs):
    n = len(xs)
    if not n: return None
    m = sum(xs) / n; sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1)) if n > 1 else 0
    return [round(m, 3), round(m - 1.96 * sd / math.sqrt(n), 3), round(m + 1.96 * sd / math.sqrt(n), 3), n]
def seats(filt=lambda r, a: True):
    for m in ids:
        r = R['base'][m]
        for a in 'AB':
            if r['difficulty'][a] == 'intermediate' and filt(r, a): yield m, a
def paired(key, arm, filt):
    f = {'growth': lambda r, a: r['growth'][a], 'points': pts}[key]
    return ci([f(R[arm][m], a) - f(R['base'][m], a) for m, a in seats(filt)])
def interaction(key, filt):
    f = {'growth': lambda r, a: r['growth'][a], 'points': pts}[key]
    return ci([f(R['E14'][m], a) - f(R['E1'][m], a) - f(R['E4'][m], a) + f(R['base'][m], a) for m, a in seats(filt)])
opp = lambda r, a: r['difficulty']['B' if a == 'A' else 'A']
GROUPS = {'clean(相手が初級)': lambda r, a: opp(r, a) == 'beginner', 'II(相手も同じ変更)': lambda r, a: opp(r, a) == 'intermediate', 'all': lambda r, a: True}
out['effect'] = {g: {arm: {'growth': paired('growth', arm, f), 'points': paired('points', arm, f)} for arm in ['E1', 'E4', 'E14']} for g, f in GROUPS.items()}
out['interaction'] = {g: {'growth': interaction('growth', f), 'points': interaction('points', f)} for g, f in GROUPS.items()}
out['perDeckClean'] = {d: {arm: paired('points', arm, lambda r, a, d=d: opp(r, a) == 'beginner' and r['deck'][a] == d) for arm in ['E1', 'E4', 'E14']} | {'interaction': interaction('points', lambda r, a, d=d: opp(r, a) == 'beginner' and r['deck'][a] == d)} for d in DECKS}
# stat accuracy and unnatural passes (intermediate seats)
acc, stall = {}, {}
for arm in ARMS:
    c = collections.Counter(); s = collections.Counter(); kinds = collections.Counter(); births = []; n = 0
    for m, a in seats():
        S = R[arm][m]['seat'][a]; n += 1
        for v in S['statChoice'].values(): c['match'] += v['match']; c['mismatch'] += v['mismatch']
        st = S['stall']
        for k in ['zeroTiePass', 'zeroTieOwn', 'zeroTieOpp', 'eggStall', 'earlyMainStall']: s[k] += st[k]
        kinds.update(st['byKind'])
        if st['firstBirth'] is not None: births.append(st['firstBirth'])
    acc[arm] = {'match': c['match'], 'mismatch': c['mismatch'], 'rate': round(c['match'] / max(1, c['match'] + c['mismatch']), 3)}
    stall[arm] = {'seats': n, **{k: s[k] for k in s}, 'perGame': {k: round(s[k] / n, 3) for k in s}, 'byKind': dict(kinds.most_common()), 'firstBirthMean': round(sum(births) / len(births), 3), 'neverBorn': n - len(births)}
for arm in ['E1', 'E4', 'E14']:
    stall[arm]['resolved'] = {k: round(1 - stall[arm][k] / stall['base'][k], 3) if stall['base'][k] else None for k in ['zeroTiePass', 'zeroTieOwn', 'zeroTieOpp', 'eggStall', 'earlyMainStall']}
out['statAccuracy'] = acc; out['stall'] = stall
# difficulty gap, first seat, deck balance, decision time
gap = {}; fs = {}; bal = {}; tm = {}
for arm in ARMS:
    xs = [pts(R[arm][m], a) for m, a in seats(lambda r, a: opp(r, a) == 'beginner')]
    gap[arm] = {'games': len(xs), 'intermediatePoints': round(sum(xs) / len(xs), 3), 'interval': ci(xs)}
    ys = [pts(R[arm][m], 'A') for m in ids if R[arm][m]['pair'] == 'II']; fs[arm] = round(sum(ys) / len(ys), 3)
    tab = collections.defaultdict(list)
    for m in ids:
        r = R[arm][m]
        if r['pair'] != 'II': continue
        for a in 'AB':
            o = 'B' if a == 'A' else 'A'
            if r['deck'][a] != r['deck'][o]: tab[r['deck'][a]].append(pts(r, a))
    bal[arm] = {d: round(sum(v) / len(v), 3) for d, v in tab.items()}
    ms = dec = 0
    for m, a in seats(): ms += R[arm][m]['seat'][a]['ms']; dec += R[arm][m]['seat'][a]['decisions']
    tm[arm] = round(ms / dec, 3)
out['difficultyGap'] = gap; out['firstSeatII'] = fs; out['deckBalanceII'] = bal; out['msPerDecision'] = tm
json.dump(out, open(f'{D}/results/followup-summary.json', 'w'), ensure_ascii=False, indent=1)
# ---- markdown
L = []; P = L.append
f3 = lambda c: f"{c[0]:+} [{c[1]:+}, {c[2]:+}]" if c else '—'
P('# 追加比較 E4・E14（tools/analyze_followup.py が生成）\n')
P(f"試合数 {out['counts']}、異常終了 {out['abnormal']}。base・E1 は計測付きの再生（baseM・E1M）で、記録との保存sha一致 {out['remeasureIdentity']}。\n")
P('## 1. 中級の席への効果（base と同じ試合IDの対応比較。平均 [95%区間]）\n')
P('| 組 | 条件 | 最終そだち差 | 勝点差 |'); P('|---|---|---|---|')
for g, v in out['effect'].items():
    for arm, x in v.items(): P(f"| {g} | {arm} | {f3(x['growth'])} | {f3(x['points'])} |")
P('\n## 2. 組み合わせの相乗効果（席ごとに E14 − E1 − E4 + base）\n')
P('| 組 | そだち | 勝点 | 席数 |'); P('|---|---|---|---|')
for g, v in out['interaction'].items(): P(f"| {g} | {f3(v['growth'])} | {f3(v['points'])} | {v['growth'][3]} |")
P('\n## 3. 能力値選択の一致率（中級）\n')
P('| 条件 | 一致率 | 一致/全体 |'); P('|---|---|---|')
for arm, v in acc.items(): P(f"| {arm} | {v['rate']} | {v['match']}/{v['match'] + v['mismatch']} |")
P('\n## 4. 不自然な見送り（中級、672試合の中級席の合計）と解消率\n')
P('| 条件 | 0点同点のパス | うち自分ターン | うち相手ターン | たまごの停滞 | R1〜R3 ときおくり停滞 | 初たんじょうR | 解消率（0点同点 / たまご） |'); P('|---|---|---|---|---|---|---|---|')
for arm, v in stall.items():
    rs = v.get('resolved'); rr = f"{rs['zeroTiePass']} / {rs['eggStall']}" if rs else '—'
    P(f"| {arm} | {v['zeroTiePass']} | {v['zeroTieOwn']} | {v['zeroTieOpp']} | {v['eggStall']} | {v['earlyMainStall']} | {v['firstBirthMean']} | {rr} |")
P('\n0点同点のパスの内訳（最初に見つかった候補の種類）：')
for arm, v in stall.items(): P(f"- {arm}: {v['byKind']}")
P('\n## 5. 初級と中級の差（初級×中級、中級の勝点 [95%区間]）\n')
P('| 条件 | 中級の勝点 |'); P('|---|---|')
for arm, v in gap.items(): P(f"| {arm} | {v['intermediatePoints']} [{v['interval'][1]}, {v['interval'][2]}]（{v['games']}席） |")
P('\n## 6. デッキ別の単独効果（相手が初級、勝点差 [95%区間]）\n')
P('| デッキ | E1 | E4 | E14 | 相乗 |'); P('|---|---|---|---|---|')
for d, v in out['perDeckClean'].items(): P(f"| {JA[d]} | {f3(v['E1'])} | {f3(v['E4'])} | {f3(v['E14'])} | {f3(v['interaction'])} |")
P('\n## 7. デッキ間（中級×中級、他デッキへの勝点）・先攻・判断時間\n')
P('| デッキ | ' + ' | '.join(ARMS) + ' |'); P('|---|' + '---|' * len(ARMS))
for d in DECKS: P(f"| {JA[d]} | " + ' | '.join(f"{bal[a][d]}" + (f" ({bal[a][d] - bal['base'][d]:+.3f})" if a != 'base' else '') for a in ARMS) + ' |')
P(f"\n- 先攻の勝点（中級×中級）：{fs}\n- 判断時間（ms/判断、中級）：{tm}")
open(f'{D}/results/followup-tables.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
