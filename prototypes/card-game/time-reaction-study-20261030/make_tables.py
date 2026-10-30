#!/usr/bin/env python3
"""Markdown tables for REPORT.md, generated only from results/*.json (no hand-typed numbers).
Usage: python3 make_tables.py > results/tables.md"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(f'{HERE}/results/summary.json'))
DECKS = ['main', 'companion', 'partner', 'challenge', 'growth', 'item', 'balance']
NAMES = {'main': 'メイン成長', 'companion': 'なかま', 'partner': 'こいびと・交際', 'challenge': 'ちょうせん', 'growth': 'そだち獲得', 'item': 'アイテム・じゅんび', 'balance': 'バランス'}
DIFF = {'intermediate': '中級', 'beginner': '初級'}
pct = lambda a, b: f'{100 * a / b:.1f}%' if b else '—'


def opp_table(src='TR'):
    W = S[src]['windows']
    seats = 280 * 2 if src == 'TR' else None  # TR: each difficulty has 560 seat-matches
    print(f'\n### 相手ターンの発動機会（{src}）\n')
    print('| デッキ | 難易度 | 機会/試合 | 自動パス（合法手なし） | 合法なすぐつかうあり | うち価値>0 | 価値>0で使用 | 使用率（価値>0） | 時だけ不足 | 条件・時機が不成立 | 手札にすぐつかうなし |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for deck in ['all'] + DECKS:
        for df in ['intermediate', 'beginner']:
            v = W.get(f'{deck}|{df}|opp')
            if not v:
                continue
            n = 560 if deck == 'all' else 80
            print(f"| {NAMES.get(deck, '全体')} | {DIFF[df]} | {v['windows'] / n:.1f} | {pct(v['auto'], v['windows'])} | {pct(v['withLegalQuick'], v['windows'])} | {v['withPositiveQuick']} | {v['usedWhenPositive']} | {pct(v['usedWhenPositive'], v['withPositiveQuick'])} | {pct(v['onlyTimeShort'], v['windows'])} | {pct(v['onlyCondition'], v['windows'])} | {pct(v['noQuickInHand'], v['windows'])} |")
    for pos in ['first', 'second']:
        for df in ['intermediate', 'beginner']:
            v = W[f'pos:{pos}|{df}|opp']
            print(f"| {'先攻' if pos == 'first' else '後攻'}（全デッキ） | {DIFF[df]} | {v['windows'] / 280:.1f} | {pct(v['auto'], v['windows'])} | {pct(v['withLegalQuick'], v['windows'])} | {v['withPositiveQuick']} | {v['usedWhenPositive']} | {pct(v['usedWhenPositive'], v['withPositiveQuick'])} | {pct(v['onlyTimeShort'], v['windows'])} | {pct(v['onlyCondition'], v['windows'])} | {pct(v['noQuickInHand'], v['windows'])} |")


def time_table(src='TR'):
    T = S[src]['time']
    print(f'\n### 時の台帳（{src}、自分ターン1回あたり平均）\n')
    print('| 区分 | 難易度 | 開始時の時 | 自分ターンで使用 | 終了時の残り | 相手ターンで使用 | 次の開始で失われた時 | 失われた割合 |')
    print('|---|---|---|---|---|---|---|---|')
    rows = [('all', 'all', '全体')] + [(d, 'all', NAMES[d]) for d in DECKS] + [('pos:first', 'all', '先攻'), ('pos:second', 'all', '後攻')] + [('all', f'R{r}', f'R{r}') for r in range(1, 11)]
    for a, b, label in rows:
        for df in ['intermediate', 'beginner']:
            v = T.get(f'{df}|{a}|{b}')
            if not v:
                continue
            lost = v.get('lost', None)
            share = v['lostTotal'] / v['startTotal'] if v['startTotal'] else 0
            note = '（R10は終局）' if b == 'R10' else ''
            print(f"| {label}{note} | {DIFF[df]} | {v['start']:.2f} | {v['ownSpent']:.2f} | {v.get('end', 0):.2f} | {v['oppSpent']:.3f} | {'—' if lost is None else f'{lost:.2f}'} | {100 * share:.1f}% |")


def lost_reason(src='TR'):
    L = S[src]['lostTimeReason']
    keys = [('declinedPositiveQuick', '価値>0のすぐつかうを持ったまま見送り'), ('declinedNonPositiveQuick', '合法だが価値≤0のすぐつかうだけ'), ('quickConditionUnmet', 'すぐつかうはあるが条件・時機が不成立'), ('quickTooExpensive', 'すぐつかうはあるが時が足りない'), ('noQuickInHand', '手札にすぐつかうなし')]
    print(f'\n### 失われた時の内訳（{src}、相手ターン最後の発動機会で判定、時の単位数）\n')
    print('| デッキ | 難易度 | ' + ' | '.join(k[1] for k in keys) + ' |')
    print('|---|---|' + '---|' * len(keys))
    for deck in ['all'] + DECKS:
        for df in ['intermediate', 'beginner']:
            v = L.get(f'{df}|{deck}')
            if not v:
                continue
            tot = sum(v.values())
            print(f"| {NAMES.get(deck, '全体')} | {DIFF[df]} | " + ' | '.join(f"{v.get(k, 0)}（{pct(v.get(k, 0), tot)}）" for k, _ in keys) + ' |')


def traps(src='ALL'):
    T = S[src]['traps']
    print(f'\n### しかける（{src}＝X再生＋TR）\n')
    print('| カード | 難易度 | しかけた | 発動 | 発動率 | 発動せず場を離れた | 伏せたまま終局 | 平均しかけR |')
    print('|---|---|---|---|---|---|---|---|')
    for card in ['G-ski-jump', 'G-takoyaki-grill', 'G-missile-command', 'all']:
        for df in ['intermediate', 'beginner']:
            v = T.get(f'{df}|{card}')
            if not v:
                continue
            print(f"| {card} | {DIFF[df]} | {v['set']} | {v.get('activated', 0)} | {pct(v.get('activated', 0), v['set'])} | {v.get('removed', 0)} | {v.get('faceDownAtEnd', 0)} | {v['meanSetRound']} |")


def ab():
    p = f'{HERE}/results/ab-summary.json'
    if not os.path.exists(p):
        return
    A = json.load(open(p))
    print('\n### 改善候補の対戦比較（実験のみ・正式CPUは不変）\n')
    print('| 候補 | 区分 | 試合 | 候補側の得点率 | 95%区間 | 初たんじょうR（候補／正式） | 失われた時/試合（候補／正式） | 判断が異なった回数/試合 |')
    print('|---|---|---|---|---|---|---|---|')
    for k, v in A['by'].items():
        name, _, part = k.partition('|')
        part = {'first': '候補が先攻（先攻有利を含む）', 'second': '候補が後攻（先攻有利を含む）'}.get(part, part)
        print(f"| {name} | {NAMES.get(part, part or '全体')} | {v['n']} | {v['candidateScore']:.3f} | {v['ci95'][0]:.3f}〜{v['ci95'][1]:.3f} | {v['firstBirthRound']['candidate']:.2f}／{v['firstBirthRound']['official']:.2f} | {v['timeLostPerMatch']['candidate']:.1f}／{v['timeLostPerMatch']['official']:.1f} | {v['decisionsWherePoliciesDiffer']:.2f} |")


opp_table('TR')
time_table('TR')
lost_reason('TR')
traps('ALL')
ab()
