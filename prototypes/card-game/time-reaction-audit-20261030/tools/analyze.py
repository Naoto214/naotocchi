#!/usr/bin/env python3
"""Aggregates runs/T-shard*.jsonl (tools/audit-run.mjs) into results/summary.json and results/tables.md.
Read-only. Seat-level metrics are grouped by the acting seat's difficulty, deck and seat order (first/second).
Usage: python3 tools/analyze.py"""
import json, glob, os, collections, gzip
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
# Reads runs/T-shard*.jsonl(.gz); the committed copies are gzip-compressed.
open_ = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
rows = [json.loads(l) for f in sorted(glob.glob(D + '/runs/T-shard*.jsonl*')) for l in open_(f)]
ok = [r for r in rows if r['status'] == 'completed']
JA = {'beginner': '初級', 'intermediate': '中級'}
DECK = {'main': 'メイン成長', 'companion': 'なかま', 'partner': 'こいびと・交際', 'challenge': 'ちょうせん', 'growth': 'そだち獲得', 'item': 'アイテム・じゅんび', 'balance': 'バランス'}
def seats():
    for r in ok:
        for a in 'AB':
            yield r, a, r['seat'][a], r['difficulty'][a], r['deck'][a], ('先攻' if a == 'A' else '後攻')
C = collections.Counter
def opp_block(items):
    n = len(items); c = C(); used = C(); dec = C(); short = C(); own = C(); ownused = C()
    for r, a, S, *_ in items:
        o = S['opp']
        for k in ['windows', 'auto', 'decided', 'withUsable', 'used', 'declined', 'timeShortOnly', 'condOnly', 'noQuickInHand', 'challengeWindows', 'challengeUsed', 'usedCost', 'usedQuick', 'usedAbility']:
            c[k] += o[k]
        used.update(o['usedCards']); dec.update(o['declinedCards']); short.update(o['timeShortCards'])
        c['ownWindows'] += S['own']['windows']; c['ownWithUsable'] += S['own']['withUsable']; c['ownUsed'] += S['own']['used']; ownused.update(S['own']['usedCards'])
        c['quickOwn'] += S['quickPlays']['own']; c['quickOpp'] += S['quickPlays']['opp']
        # turns with >=1 opponent-turn window holding a usable card
        for t in S['turns']:
            c['oppTurns'] += 1 if t.get('oppWindows') else 0
            c['oppTurnsUsable'] += 1 if t.get('oppUsable') else 0
            c['oppTurnsUsed'] += 1 if t.get('oppUsed') else 0
            c['oppTurnsShort'] += 1 if t.get('oppShort') else 0
    pg = lambda k: round(c[k] / n, 2) if n else None
    return {'seats': n, 'perGame': {k: pg(k) for k in ['windows', 'auto', 'decided', 'withUsable', 'used', 'declined', 'timeShortOnly', 'condOnly', 'noQuickInHand', 'challengeWindows', 'challengeUsed', 'oppTurns', 'oppTurnsUsable', 'oppTurnsUsed', 'oppTurnsShort', 'ownWindows', 'ownWithUsable', 'ownUsed', 'quickOwn', 'quickOpp', 'usedCost']},
            'useRateGivenUsable': round(c['used'] / c['withUsable'], 3) if c['withUsable'] else None,
            'turnUseRateGivenUsable': round(c['oppTurnsUsed'] / c['oppTurnsUsable'], 3) if c['oppTurnsUsable'] else None,
            'usedCards': dict(used.most_common()), 'declinedCards': dict(dec.most_common(12)), 'timeShortCards': dict(short.most_common(12)), 'ownUsedCards': dict(ownused.most_common(10))}
def lost_class(t):
    if t.get('lost') is None: return 'final'
    if t['lost'] == 0: return '0:残りなし'
    if t.get('oppUsed'): return '1:相手ターンで一部使用'
    if t.get('oppUsable'): return '2:使えるカードがあったが見送り'
    if t.get('endScoreMax') is None: return '3:使い道なし(合法の有償行動なし)'
    return '4:評価が0以下の行動のみ'
def time_block(items, by_round=False):
    agg = collections.defaultdict(C); cls = collections.defaultdict(C)
    for r, a, S, *_ in items:
        for t in S['turns']:
            key = t['round'] if by_round else 'all'
            g = agg[key]; g['turns'] += 1
            for k in ['start', 'spentOwn', 'spentOpp', 'gain', 'shortAtEnd']: g[k] += t.get(k) or 0
            g['end'] += t['end'] or 0
            if t.get('lost') is not None: g['lostTurns'] += 1; g['lost'] += t['lost']; g['lostPositive'] += t['lost'] > 0
            else: g['finalLeft'] += t.get('finalLeft') or 0; g['finalTurns'] += 1
            g['endUsable'] += 1 if t.get('endUsable') else 0
            cls[key][lost_class(t)] += t.get('lost') or 0 if lost_class(t) != 'final' else 0
            cls[key]['n:' + lost_class(t)] += 1
    out = {}
    for key, g in sorted(agg.items(), key=lambda x: str(x[0]).zfill(3)):
        n = g['turns']; L = g['lostTurns'] or 1
        out[key] = {'turns': n, 'start': round(g['start'] / n, 2), 'spentOwn': round(g['spentOwn'] / n, 2), 'end': round(g['end'] / n, 2),
                    'spentOpp': round(g['spentOpp'] / n, 2), 'gain': round(g['gain'] / n, 2), 'lostAtReset': round(g['lost'] / L, 2), 'lostPositiveShare': round(g['lostPositive'] / L, 3),
                    'finalLeft': round(g['finalLeft'] / g['finalTurns'], 2) if g['finalTurns'] else None,
                    'ownUseShare': round(g['spentOwn'] / g['start'], 3) if g['start'] else None, 'oppUseShare': round(g['spentOpp'] / g['start'], 3) if g['start'] else None,
                    'lostShare': round(g['lost'] / g['start'], 3) if g['start'] else None,
                    'shortAtEndPerTurn': round(g['shortAtEnd'] / n, 2), 'endUsableShare': round(g['endUsable'] / n, 3),
                    'lostByClass': {k: v for k, v in sorted(cls[key].items()) if not k.startswith('n:')}, 'turnsByClass': {k[2:]: v for k, v in sorted(cls[key].items()) if k.startswith('n:')}}
    return out
def trap_block(items):
    c = C(); s = C(); f = C(); k = C(); left = C()
    for r, a, S, *_ in items:
        T = S['traps']; s.update(T['set']); f.update(T['fired']); k.update(T['skipped']); left.update(T['leftAtEnd'])
        c['blockedFull'] += T['blockedFull']; c['heldPlaceable'] += T['heldPlaceable']; c['quickWhileFull'] += S['quickWhileFull']; c['equips'] += S['equips']
        c['quickOwn'] += S['quickPlays']['own']; c['quickOpp'] += S['quickPlays']['opp']
    n = len(items)
    return {'seats': n, 'set': dict(s), 'fired': dict(f), 'skipped': dict(k), 'leftAtEnd': dict(left),
            'setPerGame': round(sum(s.values()) / n, 3) if n else None, 'firedShare': round(sum(f.values()) / sum(s.values()), 3) if sum(s.values()) else None,
            'leftShare': round(sum(left.values()) / sum(s.values()), 3) if sum(s.values()) else None,
            'blockedFullTurnsPerGame': round(c['blockedFull'] / n, 3) if n else None, 'heldPlaceableTurnsPerGame': round(c['heldPlaceable'] / n, 3) if n else None,
            'quickWhileFull': c['quickWhileFull'], 'equipsPerGame': round(c['equips'] / n, 2) if n else None,
            'quickPerGame': {'own': round(c['quickOwn'] / n, 2), 'opp': round(c['quickOpp'] / n, 2)} if n else None}
S_all = list(seats())
summary = {'matches': len(rows), 'completed': len(ok), 'abnormal': [r['match'] + ' ' + str(r['error']) for r in rows if r['status'] != 'completed']}
groups = collections.defaultdict(list)
for x in S_all:
    r, a, S, diff, deck, order = x
    groups[('diff', diff)].append(x); groups[('deckdiff', deck + '/' + diff)].append(x); groups[('orderdiff', order + '/' + diff)].append(x)
    groups[('pairdiff', r['pair'] + '/' + diff)].append(x)
summary['opp'] = {f'{k[0]}:{k[1]}': opp_block(v) for k, v in sorted(groups.items())}
summary['time'] = {f'{k[0]}:{k[1]}': time_block(v) for k, v in sorted(groups.items()) if k[0] in ('diff', 'deckdiff', 'orderdiff')}
summary['timeByRound'] = {f'diff:{d}': time_block(groups[('diff', d)], True) for d in ['beginner', 'intermediate']}
summary['traps'] = {f'{k[0]}:{k[1]}': trap_block(v) for k, v in sorted(groups.items()) if k[0] in ('diff', 'deckdiff')}
# Results by pairing (context only; strength is not the subject of this audit)
res = C()
for r in ok:
    if r['pair'] in ('BI', 'IB'):
        w = r['result']['winner']
        res['games'] += 1
        if w is None: res['draw'] += 1
        elif r['difficulty'][w] == 'intermediate': res['intWin'] += 1
        else: res['begWin'] += 1
summary['beginnerVsIntermediate'] = dict(res)
# Samples for representative positions
samples = {'decline': [], 'short': [], 'end': []}
for r, a, S, diff, deck, order in S_all:
    for k, key in [('declineSamples', 'decline'), ('shortSamples', 'short'), ('endSamples', 'end')]:
        for x in S[k]: samples[key].append({'match': r['match'], 'seat': a, 'difficulty': diff, 'deck': deck, **x})
json.dump(summary, open(D + '/results/summary.json', 'w'), ensure_ascii=False, indent=1)
with gzip.open(D + '/results/samples.json.gz', 'wt') as fh: json.dump(samples, fh, ensure_ascii=False)
# ---- Markdown tables
L = []
P = L.append
P('# 集計表（追加対戦 T: 896戦、tools/analyze.py が生成）\n')
P(f"完走 {len(ok)}/{len(rows)}。異常終了 {len(summary['abnormal'])}。\n")
P('## 1. 相手ターンの発動機会（1試合・1席あたり）\n')
P('「機会」＝相手ターン中に自分へ優先権が来た応答ウィンドウの数（同じ連鎖で何度も来る分を含む）。「機会のあったターン」＝自分の各ターンの直後の相手ターンに1回以上機会があったもの。\n')
P('| 区分 | 機会 | うち自動パス | すぐつかう使用可 | 使用 | 見送り | 時不足のみ | 条件不成立のみ | 手札にすぐつかうなし | ちょうせん中の機会 | ちょうせん中の使用 | 使用率(使用可→使用) | ターン単位の使用率 |')
P('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for key in ['diff:beginner', 'diff:intermediate']:
    b = summary['opp'][key]; g = b['perGame']
    P(f"| {JA[key.split(':')[1]]} | {g['windows']} | {g['auto']} | {g['withUsable']} | {g['used']} | {g['declined']} | {g['timeShortOnly']} | {g['condOnly']} | {g['noQuickInHand']} | {g['challengeWindows']} | {g['challengeUsed']} | {b['useRateGivenUsable']} | {b['turnUseRateGivenUsable']} |")
P('\n### デッキ別（相手ターン）\n')
P('| デッキ | 難易度 | 機会 | 使用可 | 使用 | 見送り | 時不足のみ | 条件不成立のみ | 使用率 | 使用したカード |')
P('|---|---|---|---|---|---|---|---|---|---|')
for d in DECK:
    for diff in ['beginner', 'intermediate']:
        b = summary['opp'][f'deckdiff:{d}/{diff}']; g = b['perGame']
        uc = '、'.join(f'{k}×{v}' for k, v in list(b['usedCards'].items())[:4]) or '—'
        P(f"| {DECK[d]} | {JA[diff]} | {g['windows']} | {g['withUsable']} | {g['used']} | {g['declined']} | {g['timeShortOnly']} | {g['condOnly']} | {b['useRateGivenUsable']} | {uc} |")
P('\n### 先攻・後攻別（相手ターン）\n')
P('| 席 | 難易度 | 機会 | 使用可 | 使用 | 時不足のみ |')
P('|---|---|---|---|---|---|')
for o in ['先攻', '後攻']:
    for diff in ['beginner', 'intermediate']:
        g = summary['opp'][f'orderdiff:{o}/{diff}']['perGame']
        P(f"| {o} | {JA[diff]} | {g['windows']} | {g['withUsable']} | {g['used']} | {g['timeShortOnly']} |")
P('\n### 見送られたカード・時不足だったカード（相手ターン、ウィンドウ数）\n')
for diff in ['beginner', 'intermediate']:
    b = summary['opp'][f'diff:{diff}']
    P(f"- {JA[diff]} 見送り: " + '、'.join(f'{k}×{v}' for k, v in b['declinedCards'].items()))
    P(f"- {JA[diff]} 時不足: " + '、'.join(f'{k}×{v}' for k, v in b['timeShortCards'].items()))
    P(f"- {JA[diff]} 使用: " + ('、'.join(f'{k}×{v}' for k, v in b['usedCards'].items()) or '—'))
P('\n## 2. 時の使い方（1ターンあたり平均）\n')
P('開始＝自分ターン開始時の時、自分で使用＝自分ターン中の支払い、終了時＝自分ターン終了時の残り、相手ターン使用＝その直後の相手ターン中の支払い、失効＝次の自分ターン開始で設定し直された時点で残っていた時（最終ターンは除外し、終局時残りとして別記）。\n')
P('| 区分 | 開始 | 自分で使用 | 終了時 | 相手ターン使用 | 失効 | 失効>0のターン率 | 終局時残り | 終了時の時不足候補数 |')
P('|---|---|---|---|---|---|---|---|---|')
def trow(label, t):
    P(f"| {label} | {t['start']} | {t['spentOwn']} | {t['end']} | {t['spentOpp']} | {t['lostAtReset']} | {t['lostPositiveShare']} | {t['finalLeft']} | {t['shortAtEndPerTurn']} |")
for diff in ['beginner', 'intermediate']: trow(JA[diff], summary['time'][f'diff:{diff}']['all'])
P('\n### ラウンド別\n')
P('| 難易度 | R | 開始 | 自分で使用 | 終了時 | 相手ターン使用 | 失効 | 失効>0率 |')
P('|---|---|---|---|---|---|---|---|')
for diff in ['beginner', 'intermediate']:
    for rd, t in summary['timeByRound'][f'diff:{diff}'].items():
        P(f"| {JA[diff]} | {rd} | {t['start']} | {t['spentOwn']} | {t['end']} | {t['spentOpp']} | {t['lostAtReset']} | {t['lostPositiveShare']} |")
P('\n### デッキ別\n')
P('| デッキ | 難易度 | 開始 | 自分で使用 | 終了時 | 相手ターン使用 | 失効 | 失効>0率 |')
P('|---|---|---|---|---|---|---|---|')
for d in DECK:
    for diff in ['beginner', 'intermediate']:
        t = summary['time'][f'deckdiff:{d}/{diff}']['all']
        P(f"| {DECK[d]} | {JA[diff]} | {t['start']} | {t['spentOwn']} | {t['end']} | {t['spentOpp']} | {t['lostAtReset']} | {t['lostPositiveShare']} |")
P('\n### 失効した時の内訳（R1〜R9＋相手の最終ターン前まで、合計値）\n')
P('| 区分 | 0:残りなし(ターン数) | 1:相手ターンで一部使用 | 2:使えるカードがあったが見送り | 3:使い道なし | 4:評価0以下のみ |')
P('|---|---|---|---|---|---|')
for key in ['diff:beginner', 'diff:intermediate'] + [f'deckdiff:{d}/{x}' for d in DECK for x in ['beginner', 'intermediate']]:
    t = summary['time'][key]['all']; lb = t['lostByClass']; tb = t['turnsByClass']
    lab = JA[key.split(':')[1]] if key.startswith('diff') else DECK[key.split(':')[1].split('/')[0]] + '/' + JA[key.split('/')[1]]
    cell = lambda k: f"{lb.get(k, 0)}時 ({tb.get(k, 0)}ターン)"
    P(f"| {lab} | {tb.get('0:残りなし', 0)} | {cell('1:相手ターンで一部使用')} | {cell('2:使えるカードがあったが見送り')} | {cell('3:使い道なし(合法の有償行動なし)')} | {cell('4:評価が0以下の行動のみ')} |")
P('\n## 3. すぐつかう／しかける\n')
P('| デッキ | 難易度 | すぐつかう(自分ターン) | すぐつかう(相手ターン) | しかけ/試合 | しかけ発動率 | しかけたまま終局率 | 準備枠満杯でしかけ不可(ターン/試合) | しかけ可能なのに保持(ターン/試合) | 満杯中のすぐつかう | みにつける/試合 |')
P('|---|---|---|---|---|---|---|---|---|---|---|')
for d in DECK:
    for diff in ['beginner', 'intermediate']:
        t = summary['traps'][f'deckdiff:{d}/{diff}']
        P(f"| {DECK[d]} | {JA[diff]} | {t['quickPerGame']['own']} | {t['quickPerGame']['opp']} | {t['setPerGame']} | {t['firedShare']} | {t['leftShare']} | {t['blockedFullTurnsPerGame']} | {t['heldPlaceableTurnsPerGame']} | {t['quickWhileFull']} | {t['equipsPerGame']} |")
for diff in ['beginner', 'intermediate']:
    t = summary['traps'][f'diff:{diff}']
    P(f"\n- {JA[diff]}: しかけ {t['set']} / 発動 {t['fired']} / 見送り {t['skipped']} / 終局時に残存 {t['leftAtEnd']}")
P(f"\n初級×中級（BI/IB, 席・先後入替）の結果: {summary['beginnerVsIntermediate']}（参考。強さ評価は本調査の対象外）\n")
open(D + '/results/tables.md', 'w').write('\n'.join(L) + '\n')
print('\n'.join(L))
