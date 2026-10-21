#!/usr/bin/env python3
"""Aggregate independent CPU-vs-CPU balance runs into CSV/JSON/Markdown tables. Read-only on run logs."""
import json, gzip, glob, math, csv, collections, sys, os, statistics as st
OUT = 'results'; os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, '.')
def load(exp):
    rows = []
    for f in sorted(glob.glob(f'runs/{exp}-shard*.jsonl.gz')):
        rows += [json.loads(l) for l in gzip.open(f, 'rt') if l.strip()]
    order = {m['match']: i for i, m in enumerate(json.load(open(f'runs/{exp}-manifest.json'))['matches'])}
    return sorted(rows, key=lambda r: order[r['match']]), len(order)
def wilson(k, n, z=1.96):
    if n == 0: return (None, None)
    p = k / n; d = 1 + z*z/n; c = p + z*z/(2*n); h = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))
    return (round((c-h)/d, 3), round((c+h)/d, 3))
def binom_two_sided(k, n):
    if n == 0: return None
    pk = [math.comb(n, i) / 2**n for i in range(n+1)]
    return round(min(1.0, sum(p for p in pk if p <= pk[k] + 1e-15)), 4)
def score(r, seat):  # 1 win, .5 draw, 0 loss
    w = (r.get('result') or {}).get('winner', 'X')
    return None if r['status'] != 'completed' else (0.5 if w is None else 1.0 if w == seat else 0.0)
DECKS = json.load(open('runs/E1-manifest.json'))['decks']
LABEL = {k: v['label'] for k, v in DECKS.items()}
summary = {}
cards_all = collections.defaultdict(lambda: collections.Counter())
card_win = collections.defaultdict(lambda: [0, 0.0, 0, 0.0])  # played_n, played_score, drawn_not_played_n, score
match_rows = []
for exp in ['E1', 'E2', 'E3']:
    rows, planned = load(exp)
    S = summary[exp] = {'planned': planned, 'recorded': len(rows)}
    comp = [r for r in rows if r['status'] == 'completed']
    S['completed'] = len(comp); S['abnormal'] = [{'match': r['match'], 'error': r['error'], 'round': r['round']} for r in rows if r['status'] != 'completed']
    S['replay_mismatch'] = [r['match'] for r in comp if r.get('replay') != 'match']
    S['not_recorded'] = planned - len(rows)
    # A. first / second
    fa = [score(r, 'A') for r in comp]
    wins_first = sum(1 for x in fa if x == 1); wins_second = sum(1 for x in fa if x == 0); draws = sum(1 for x in fa if x == .5)
    dec = wins_first + wins_second
    S['first_second'] = {'games': len(comp), 'first_wins': wins_first, 'second_wins': wins_second, 'draws': draws,
        'first_rate_decisive': round(wins_first/dec, 3) if dec else None, 'ci95': wilson(wins_first, dec), 'sign_test_p': binom_two_sided(wins_first, dec)}
    rounds = collections.Counter(r['round'] for r in comp); reasons = collections.Counter(r['result']['reason'] for r in comp)
    S['decision'] = {'round_hist': dict(sorted(rounds.items())), 'reasons': dict(reasons),
        'early_rate': round(sum(1 for r in comp if r['result']['reason'] != 'R10最終比較')/len(comp), 4) if comp else None,
        'r10_completion_rate': round(sum(1 for r in comp if r['round'] == 10)/max(1, len(rows)), 4)}
    # mirror pairs (same group, same orders, first player swapped)
    byg = collections.defaultdict(dict)
    for r in comp:
        if exp == 'E2': continue
        byg[r['group']][r['first']] = r
    pair = collections.Counter()
    for g, d in byg.items():
        if set(d) != {'X', 'Y'}: pair['incomplete'] += 1; continue
        x, y = d['X'], d['Y']   # X-first: X sits A; Y-first: Y sits A
        wx, wy = x['result']['winner'], y['result']['winner']
        if wx is None or wy is None: pair['contains_draw'] += 1
        elif wx == 'A' and wy == 'A': pair['first_won_both'] += 1
        elif wx == 'B' and wy == 'B': pair['second_won_both'] += 1
        else: pair['same_order_won_both'] += 1
    if byg: S['mirror_pairs'] = dict(pair)
    # D. progress
    def avg(f): return round(sum(f(r) for r in comp)/len(comp), 3) if comp else None
    S['progress'] = {
        'reached100_any_rate': avg(lambda r: r['reached100']['A'] or r['reached100']['B']),
        'final_growth_mean': avg(lambda r: (r['growth']['A']+r['growth']['B'])/2),
        'final_growth_median_winner': st.median([max(r['growth'].values()) for r in comp]) if comp else None,
        'growth_stuck_at_20_rate': avg(lambda r: r['growth']['A'] == 20) / 2 + avg(lambda r: r['growth']['B'] == 20) / 2,
        'draw_rate': round(draws/len(comp), 4) if comp else None,
        'abs_growth_gap_mean': avg(lambda r: abs(r['growth']['A']-r['growth']['B'])),
        'challenges_per_game': avg(lambda r: len(r['challenges'])),
        'challenge_draw_share': round(sum(1 for r in comp for c in r['challenges'] if c['winner'] is None)/max(1, sum(len(r['challenges']) for r in comp)), 3),
        'no_action_turn_rate': round(sum(r['noActionTurns'][a] for r in comp for a in 'AB')/max(1, sum(r['turns'][a] for r in comp for a in 'AB')), 4),
        'time_left_at_turn_end_mean': round(sum(r['timeLeft'][a] for r in comp for a in 'AB')/max(1, sum(r['turns'][a] for r in comp for a in 'AB')), 3),
        'time_spent_share': round(1 - sum(r['timeLeft'][a] for r in comp for a in 'AB')/max(1, len(comp)*2*55), 3),
        'unaffordable_hand_cards_at_turn_end_mean': round(sum(r['unaffordable'][a] for r in comp for a in 'AB')/max(1, sum(r['turns'][a] for r in comp for a in 'AB')), 3),
        'manual_response_decisions_per_game': avg(lambda r: r['responseDecisions']['A']+r['responseDecisions']['B']),
        'responses_used_per_game': avg(lambda r: r['responsesUsed']['A']+r['responsesUsed']['B']),
        'auto_pass_per_game': avg(lambda r: r['autoPass']),
        'max_chain_hist': dict(sorted(collections.Counter(r['maxChain'] for r in comp).items())),
        'chain_links_ge2_per_game': avg(lambda r: r['chainLinks']),
        'decisions_per_game': avg(lambda r: r['decisions']['A']+r['decisions']['B']),
        'elapsed_ms_mean': avg(lambda r: r['elapsedMs']), 'elapsed_ms_max': max((r['elapsedMs'] for r in comp), default=None),
        'action_kinds_per_game': {k: round(v/len(comp), 2) for k, v in sorted(sum((collections.Counter(r['kinds'][a]) for r in comp for a in 'AB'), collections.Counter()).items())} if comp else {},
    }
    S['growth_by_round_mean'] = [round(st.mean([r['growthByRound'][a][i] for r in comp for a in 'AB' if len(r['growthByRound'][a]) > i]), 2) for i in range(10)] if comp else []
    # B. deck matrix (row deck score vs column deck)
    M = collections.defaultdict(lambda: [0.0, 0]); diff_rows = collections.defaultdict(lambda: [0.0, 0])
    for r in comp:
        for seat, opp in (('A', 'B'), ('B', 'A')):
            M[(r['deck'][seat], r['deck'][opp])][0] += score(r, seat); M[(r['deck'][seat], r['deck'][opp])][1] += 1
            if exp == 'E2':
                diff_rows[r['difficulty'][seat]][0] += score(r, seat); diff_rows[r['difficulty'][seat]][1] += 1
    S['deck_matrix'] = {f'{a}|{b}': [round(s/n, 3), n] for (a, b), (s, n) in sorted(M.items())}
    overall = collections.defaultdict(lambda: [0.0, 0])
    for (a, b), (s, n) in M.items():
        if a != b: overall[a][0] += s; overall[a][1] += n
    S['deck_overall_vs_others'] = {a: {'score': round(s/n, 3), 'n': n, 'ci95': wilson(s, n)} for a, (s, n) in sorted(overall.items())}
    if exp == 'E2':
        S['difficulty_score'] = {d: {'score': round(s/n, 3), 'n': n, 'ci95': wilson(s, n)} for d, (s, n) in diff_rows.items()}
        per = collections.defaultdict(lambda: [0.0, 0])
        for r in comp:
            for seat in 'AB':
                if r['difficulty'][seat] == 'intermediate': per[r['deck'][seat]][0] += score(r, seat); per[r['deck'][seat]][1] += 1
        S['intermediate_score_by_deck'] = {d: [round(s/n, 3), n] for d, (s, n) in sorted(per.items())}
    # per deck behaviour (seat-level)
    beh = collections.defaultdict(lambda: collections.Counter())
    for r in comp:
        for a in 'AB':
            b = beh[r['deck'][a]]; b['n'] += 1; b['growth'] += r['growth'][a]; b['time_left'] += r['timeLeft'][a]
            b['ch_declared'] += sum(1 for c in r['challenges'] if c['actor'] == a); b['ch_won'] += sum(1 for c in r['challenges'] if c['winner'] == a)
            b['responses'] += r['responsesUsed'][a]; b['decisions'] += r['decisions'][a]
            for k, v in r['kinds'][a].items(): b['k_'+k] += v
            b['reached100'] += r['reached100'][a]
    S['deck_behaviour'] = {d: {k: round(v/b['n'], 3) if k != 'n' else v for k, v in b.items()} for d, b in sorted(beh.items())}
    # C. cards (E1 + E3 pooled separately per exp)
    for r in comp:
        for a in 'AB':
            sc = score(r, a)
            for cid, c in r['cards'][a].items():
                key = (exp, cid); cards_all[key].update({k: v for k, v in c.items()}); cards_all[key]['games'] += 1
                if c['drawn']:
                    w = card_win[key]
                    if c['played'] or c['activated']: w[0] += 1; w[1] += sc
                    else: w[2] += 1; w[3] += sc
        match_rows.append([exp, r['match'], r['group'], r['first'], r['deck']['A'], r['deck']['B'], r['difficulty']['A'], r['difficulty']['B'],
            r['orderSeed'], r['policySeed']['A'], r['policySeed']['B'], r['status'], (r['result'] or {}).get('winner'), (r['result'] or {}).get('reason'),
            r['round'], r['growth']['A'], r['growth']['B'], len(r['challenges']), r['responsesUsed']['A']+r['responsesUsed']['B'], r['maxChain'], r['autoPass'],
            r['decisions']['A']+r['decisions']['B'], r['revision'], r['elapsedMs'], r.get('replay'), r.get('saveSha256'), r['initialOrderSha']['A'], r['initialOrderSha']['B']])
# card table
from_names = {}
try:
    import subprocess
    from_names = json.loads(subprocess.check_output(['node', '-e', "import('../engine.mjs').then(e=>console.log(JSON.stringify(Object.fromEntries(Object.values(e.CARDS).map(c=>[c.id,[c.name,c.type,!!c.rare]])))))"], text=True))
except Exception as ex: print('names unavailable', ex)
card_rows = []
for (exp, cid), c in sorted(cards_all.items()):
    w = card_win[(exp, cid)]
    name, typ, rare = from_names.get(cid, ['?', '?', False])
    card_rows.append({'exp': exp, 'card': cid, 'name': name, 'type': typ, 'rare': rare, 'seat_games': c['games'], 'copies': c['deck'], 'drawn': c['drawn'],
        'played': c['played'], 'activated': c['activated'], 'hand_end': c['handEnd'],
        'play_or_activate_per_draw': round((c['played']+c['activated'])/c['drawn'], 3) if c['drawn'] else None,
        'played_per_draw': round(c['played']/c['drawn'], 3) if c['drawn'] else None,
        'hand_end_per_draw': round(c['handEnd']/c['drawn'], 3) if c['drawn'] else None,
        'score_when_used': round(w[1]/w[0], 3) if w[0] else None, 'n_used': w[0],
        'score_when_drawn_unused': round(w[3]/w[2], 3) if w[2] else None, 'n_unused': w[2]})
with open(f'{OUT}/card-usage.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(card_rows[0])); wr.writeheader(); wr.writerows(card_rows)
with open(f'{OUT}/matches.csv', 'w', newline='') as f:
    wr = csv.writer(f); wr.writerow(['exp','match','group','first_deck_role','deckA','deckB','diffA','diffB','orderSeed','policySeedA','policySeedB','status','winner','reason','round','growthA','growthB','challenges','responses_used','max_chain','auto_pass','decisions','commands','elapsed_ms','replay','save_sha256','orderShaA','orderShaB'])
    wr.writerows(match_rows)
json.dump(summary, open(f'{OUT}/summary.json', 'w'), ensure_ascii=False, indent=1)
# Markdown tables
L = []
ids = list(DECKS)
for exp in ['E1', 'E3']:
    S = summary[exp]; L.append(f'### {exp} デッキ相性（行デッキのスコア: 勝=1, 引分=0.5。n=行側の席数）\n')
    L.append('| 行＼列 | ' + ' | '.join(i.split('_')[0] for i in ids) + ' | 対他平均 [95%CI] |'); L.append('|' + '---|'*(len(ids)+2))
    for a in ids:
        cells = []
        for b in ids:
            v = S['deck_matrix'].get(f'{a}|{b}'); cells.append(f'{v[0]:.2f}' if v else '-')
        o = S['deck_overall_vs_others'][a]; L.append(f'| {a} {LABEL[a]} | ' + ' | '.join(cells) + f" | {o['score']:.3f} [{o['ci95'][0]}–{o['ci95'][1]}] n={o['n']} |")
    L.append('')
open(f'{OUT}/tables.md', 'w').write('\n'.join(L) + '\n')
print(json.dumps({k: {kk: v[kk] for kk in ('planned','recorded','completed','first_second','mirror_pairs','decision') if kk in v} for k, v in summary.items()}, ensure_ascii=False, indent=1))
