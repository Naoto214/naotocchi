#!/usr/bin/env python3
"""PR #406 (legacy-card fix) vs stage 3 (time opportunity, search, recovery). Read-only on both result sets."""
import json, csv, gzip, glob, collections
BEFORE, AFTER = '../balance-verification-20261020-cpufix', '.'
LEGACY = ['I-c_coin2', 'G-hit-blow', 'G-area-claim', 'E-first-date', 'G-animal-shogi', 'G-archery-3d']
SEARCH = ['I-c_match', 'I-c_friend', 'I-c_time_forward', 'G-picross-5', 'G-stack-acorn', 'E-new-encounter', 'E-mirror', 'I-c_egg_normal', 'G-animal-shogi', 'C-cat_friend', 'G-jump-quest', 'E-midlife-travel-plan', 'G-real-fishing']
AFFECTED = set(LEGACY) | {'C-cat_friend'}  # cards whose CPU observation hint changed
sb, sa = (json.load(open(f'{d}/results/summary.json')) for d in (BEFORE, AFTER))
cards = {tag: {(r['exp'], r['card']): r for r in csv.DictReader(open(f'{d}/results/card-usage.csv'))} for tag, d in (('before', BEFORE), ('after', AFTER))}
decks = json.load(open('runs/E1-manifest.json'))['decks']
touch = {k for k, v in decks.items() if AFFECTED & set(v['cards'])}
def recs(d, exp):
    out = {}
    for f in glob.glob(f'{d}/runs/{exp}-shard*.jsonl.gz'):
        for l in gzip.open(f, 'rt'): r = json.loads(l); out[r['match']] = r
    return out
C = {'decks_containing_changed_cards': sorted(touch), 'experiments': {}}
for exp in ['E1', 'E2', 'E3']:
    B, A = sb[exp], sa[exp]; X = C['experiments'][exp] = {}
    X['completed'] = [B['completed'], A['completed']]; X['abnormal'] = [len(B['abnormal']), len(A['abnormal'])]; X['replay_mismatch'] = [len(B['replay_mismatch']), len(A['replay_mismatch'])]
    X['first_second'] = {k: [B['first_second'][k], A['first_second'][k]] for k in ('first_wins', 'second_wins', 'draws', 'first_rate_decisive', 'ci95', 'sign_test_p')}
    X['mirror_pairs'] = [B.get('mirror_pairs'), A.get('mirror_pairs')]
    X['decision'] = {k: [B['decision'][k], A['decision'][k]] for k in ('early_rate', 'r10_completion_rate', 'round_hist')}
    X['progress'] = {k: [B['progress'][k], A['progress'][k]] for k in B['progress'] if k not in ('max_chain_hist', 'action_kinds_per_game')}
    X['max_chain_hist'] = [B['progress']['max_chain_hist'], A['progress']['max_chain_hist']]
    X['action_kinds_per_game'] = [B['progress']['action_kinds_per_game'], A['progress']['action_kinds_per_game']]
    X['growth_by_round_mean'] = [B['growth_by_round_mean'], A['growth_by_round_mean']]
    X['deck_overall_vs_others'] = {d: [B['deck_overall_vs_others'][d], A['deck_overall_vs_others'][d]] for d in B['deck_overall_vs_others']}
    X['deck_matrix'] = {k: [B['deck_matrix'][k][0], A['deck_matrix'][k][0], A['deck_matrix'][k][1]] for k in B['deck_matrix']}
    X['deck_behaviour'] = {d: {k: [B['deck_behaviour'][d].get(k), A['deck_behaviour'][d].get(k)] for k in ('growth', 'time_left', 'ch_declared', 'ch_won', 'responses', 'reached100')} for d in B['deck_behaviour']}
    if exp == 'E2':
        X['difficulty_score'] = [B['difficulty_score'], A['difficulty_score']]
    # match-level attribution: identical records expected when no changed card is in either deck
    rb, ra = recs(BEFORE, exp), recs(AFTER, exp); att = collections.Counter()
    for m, r in rb.items():
        a = ra.get(m)
        if not a: att['missing_after'] += 1; continue
        same = r['saveSha256'] == a['saveSha256']; involved = bool({r['deck']['A'], r['deck']['B']} & touch)
        att['identical' if same else 'changed'] += 1
        if (r['result'] or {}).get('winner') != (a['result'] or {}).get('winner'): att['winner_changed'] += 1
    X['match_attribution'] = dict(att)
    # legacy six and other cards
    L = {}
    for cid in LEGACY:
        b, a = cards['before'].get((exp, cid)), cards['after'].get((exp, cid))
        if b and a: L[cid] = {k: [b[k], a[k]] for k in ('name', 'drawn', 'played', 'activated', 'play_or_activate_per_draw', 'hand_end_per_draw', 'score_when_used', 'n_used', 'score_when_drawn_unused')}
    X['legacy_cards'] = L
    Sx = {}
    for cid in SEARCH:
        b, a = cards['before'].get((exp, cid)), cards['after'].get((exp, cid))
        if b and a: Sx[cid] = {k: [b[k], a[k]] for k in ('name', 'drawn', 'played', 'activated', 'hand_end_per_draw', 'score_when_used', 'n_used')}
    X['search_cards'] = Sx
    for tag in ('before', 'after'):
        used = sum(1 for (e, _), r in cards[tag].items() if e == exp and int(r['played']) + int(r['activated']) > 0)
        X.setdefault('distinct_cards_used', []).append(used)
    others = []
    for (e, cid), b in cards['before'].items():
        if e != exp or cid in LEGACY: continue
        a = cards['after'].get((e, cid))
        if not a or not b['play_or_activate_per_draw'] or not a['play_or_activate_per_draw']: continue
        others.append((cid, b['name'], float(b['play_or_activate_per_draw']), float(a['play_or_activate_per_draw'])))
    X['other_cards_use_rate_mean_abs_change'] = round(sum(abs(a - b) for _, _, b, a in others) / len(others), 4)
    X['other_cards_largest_change'] = [[c, n, b, a] for c, n, b, a in sorted(others, key=lambda x: -abs(x[3] - x[2]))[:12]]
    X['never_used_after'] = sorted(r['card'] for (e, _), r in cards['after'].items() if e == exp and int(r['drawn']) > 0 and int(r['played']) + int(r['activated']) == 0)
json.dump(C, open('results/comparison.json', 'w'), ensure_ascii=False, indent=1)
# markdown summary
E = C['experiments']['E1']; L = []
L.append('| 指標 (E1 中級×中級) | PR#406 | 今回 |'); L.append('|---|---|---|')
for k in ('time_spent_share', 'time_left_at_turn_end_mean', 'final_growth_mean', 'reached100_any_rate', 'draw_rate', 'challenges_per_game', 'responses_used_per_game', 'manual_response_decisions_per_game', 'auto_pass_per_game', 'chain_links_ge2_per_game', 'no_action_turn_rate', 'growth_stuck_at_20_rate', 'decisions_per_game'):
    L.append(f'| {k} | {E["progress"][k][0]} | {E["progress"][k][1]} |')
L.append(f'| early_rate | {E["decision"]["early_rate"][0]} | {E["decision"]["early_rate"][1]} |')
L.append(f'| first_rate_decisive | {E["first_second"]["first_rate_decisive"][0]} | {E["first_second"]["first_rate_decisive"][1]} |')
L.append('\n| デッキ (E1 対他平均) | PR#406 | 今回 [95%CI] |'); L.append('|---|---|---|')
for d, (b, a) in E['deck_overall_vs_others'].items(): L.append(f'| {d} | {b["score"]} | {a["score"]} [{a["ci95"][0]}–{a["ci95"][1]}] |')
L.append('\n| 旧規則カード (E1) | ドロー 前→後 | 使用 前→後 | 使用/ドロー 前→後 | 手札残り/ドロー 前→後 |'); L.append('|---|---|---|---|---|')
for cid, v in E['legacy_cards'].items(): L.append(f'| {cid} {v["name"][0]} | {v["drawn"][0]}→{v["drawn"][1]} | {v["played"][0]}→{v["played"][1]} | {v["play_or_activate_per_draw"][0]}→{v["play_or_activate_per_draw"][1]} | {v["hand_end_per_draw"][0]}→{v["hand_end_per_draw"][1]} |')
L.append('\n| 探索・回収系 (E1) | ドロー 前→後 | 使用 前→後 | 手札残り/ドロー 前→後 |'); L.append('|---|---|---|---|')
for cid, v in E['search_cards'].items(): L.append(f'| {cid} {v["name"][0]} | {v["drawn"][0]}→{v["drawn"][1]} | {v["played"][0]}→{v["played"][1]} (発動 {v["activated"][0]}→{v["activated"][1]}) | {v["hand_end_per_draw"][0]}→{v["hand_end_per_draw"][1]} |')
open('results/comparison.md', 'w').write('\n'.join(L) + '\n')
print(json.dumps({e: {'attribution': C['experiments'][e]['match_attribution'], 'decks': {d: [v[0]['score'], v[1]['score']] for d, v in C['experiments'][e]['deck_overall_vs_others'].items()}} for e in C['experiments']}, ensure_ascii=False, indent=1))
