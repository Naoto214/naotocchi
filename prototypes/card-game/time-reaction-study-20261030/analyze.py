#!/usr/bin/env python3
"""Aggregates the instrumented runs (runs/X-*.jsonl.gz, runs/TR-*.jsonl.gz). Read-only.
Output: results/summary.json (all tables) and results/reproduction-X.json.
Window row: [seat, round, ctx, auto, window, time, legal[], timeShort[], cond[], chosenKind, chosenCard, chosenScore,
             bestQuickScore, bestQuickCard, turnKey, preparedFull, challenge, bestQuickValue]
bestQuickValue: intermediate evaluation of the best legal quick play without time cost (same yardstick for both levels).
"Positive" = bestQuickValue > 0, i.e. the evaluation itself says the effect is worth more than the card."""
import gzip, json, glob, os, collections, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
CG = os.path.dirname(HERE)
C = collections.Counter
PLAY = {'play', 'programPlay'}
# Cards whose effect is limited to "this turn" / own turn (no value when played in the opponent's end windows).
THIS_TURN = {'E-fateful-transform', 'E-reconciliation', 'G-basketball-3d', 'G-race-3d', 'G-beach-volley', 'G-street-fight'}


def load(prefix):
    out = []
    for f in sorted(glob.glob(f"{os.environ.get('RUNS_DIR', HERE + '/runs')}/{prefix}-shard*.jsonl.gz")):
        out += [json.loads(l) for l in gzip.open(f, 'rt')]
    return out


def diff_tag(d, seat):
    return d['difficulty'][seat]


def first_tag(seat):
    return 'first' if seat == 'A' else 'second'


def rate(a, b):
    return round(a / b, 4) if b else None


def window_tables(matches):
    T = collections.defaultdict(C)
    cards_used = collections.defaultdict(C)
    skipped_cards = collections.defaultdict(C)
    last_opp = collections.defaultdict(C)
    challenge_rows = collections.defaultdict(C)
    this_turn_opp = C()
    short_cards = collections.defaultdict(C)
    for d in matches:
        last = {}
        for w in d['windows']:
            seat, rnd, ctx, auto, win, time, legal, short, cond, kind, card, sc, bq, bqc, tk, full, ch, bv = w
            used = kind in PLAY and card in legal
            pos = bv is not None and bv > 0
            for key in [('all', diff_tag(d, seat), ctx), (d['deck'][seat], diff_tag(d, seat), ctx), ('pos:' + first_tag(seat), diff_tag(d, seat), ctx)]:
                t = T['|'.join(key)]
                t['windows'] += 1
                t['auto'] += auto
                t['withLegalQuick'] += 1 if legal else 0
                t['used'] += 1 if used else 0
                t['usedOtherAction'] += 1 if (kind not in ('pass',) and not used) else 0
                t['skippedWithLegal'] += 1 if (legal and not used) else 0
                t['withPositiveQuick'] += 1 if pos else 0
                t['usedWhenPositive'] += 1 if (pos and used) else 0
                t['skippedPositive'] += 1 if (pos and not used) else 0
                t['onlyTimeShort'] += 1 if (not legal and short) else 0
                t['onlyCondition'] += 1 if (not legal and not short and cond) else 0
                t['noQuickInHand'] += 1 if (not legal and not short and not cond) else 0
            if used:
                cards_used[f"{diff_tag(d, seat)}|{ctx}"][card] += 1
                if ctx == 'opp' and card in THIS_TURN:
                    this_turn_opp[f"{diff_tag(d, seat)}|{card}|{win}"] += 1
            if legal and not used:
                for c in set(legal):
                    skipped_cards[f"{diff_tag(d, seat)}|{ctx}"][c] += 1
                if pos:
                    skipped_cards[f"{diff_tag(d, seat)}|{ctx}|positive"][bqc] += 1
            if not legal and short:
                for c in set(short):
                    short_cards[f"{diff_tag(d, seat)}|{ctx}{'|challenge' if ch else ''}"][c] += 1
            if ctx == 'opp':
                last[(seat, tk)] = w
                if ch:
                    k = f"{diff_tag(d, seat)}"
                    challenge_rows[k]['windows'] += 1
                    challenge_rows[k]['legal'] += 1 if legal else 0
                    challenge_rows[k]['used'] += 1 if used else 0
                    challenge_rows[k]['timeShort'] += 1 if (short and not legal) else 0
        # The last window of each opponent turn: time still held there is lost at the next own start.
        for (seat, tk), w in last.items():
            seat, rnd, ctx, auto, win, time, legal, short, cond, kind, card, *_ = w
            used = kind in PLAY and card in legal
            pos = w[17] is not None and w[17] > 0
            k = f"{diff_tag(d, seat)}|{d['deck'][seat]}"
            for kk in (f"{diff_tag(d, seat)}|all", k):
                t = last_opp[kk]
                t['oppTurns'] += 1
                t['timeHeld'] += time
                t['heldWithLegalQuickAndPassed'] += 1 if (legal and not used and time > 0) else 0
                t['timeHeldWithLegalQuickAndPassed'] += time if (legal and not used) else 0
                t['heldWithPositiveQuickAndPassed'] += 1 if (pos and not used and time > 0) else 0
                t['timeHeldWithPositiveQuickAndPassed'] += time if (pos and not used) else 0
    out = {k: dict(v) for k, v in T.items()}
    for v in out.values():
        v['useRateWhenLegal'] = rate(v['used'], v['withLegalQuick'])
        v['useRateWhenPositive'] = rate(v['usedWhenPositive'], v['withPositiveQuick'])
        v['legalShare'] = rate(v['withLegalQuick'], v['windows'])
    out['_timeShortCards'] = {k: dict(v.most_common(15)) for k, v in short_cards.items()}
    return out, {k: dict(v.most_common()) for k, v in cards_used.items()}, {k: dict(v.most_common(15)) for k, v in skipped_cards.items()}, {k: dict(v) for k, v in last_opp.items()}, {k: dict(v) for k, v in challenge_rows.items()}, dict(this_turn_opp.most_common())


def time_tables(matches):
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    lost_reason = collections.defaultdict(C)
    end_short = collections.defaultdict(C)
    own_declined = collections.defaultdict(C)
    for d in matches:
        # last opponent-turn window per seat & opponent turn, for the reason a lost remainder was not spent
        last = {}
        for w in d['windows']:
            if w[2] == 'opp':
                last[(w[0], w[1])] = w
        for t in d['turns']:
            seat, rnd = t['seat'], t['round']
            lost = t['lost'] if t['lost'] is not None else None
            dk, df = d['deck'][seat], diff_tag(d, seat)
            for key in (f'{df}|all|all', f'{df}|{dk}|all', f'{df}|all|R{rnd}', f'{df}|pos:{first_tag(seat)}|all'):
                b = by[key]
                b['start'].append(t['start'])
                b['ownSpent'].append(t['ownSpent'])
                if t['end'] is not None:
                    b['end'].append(t['end'])
                b['oppSpent'].append(t['oppSpent'])
                b['gain'].append(t['gain'])
                if lost is not None:
                    b['lost'].append(lost)
                else:
                    b['finalLeft'].append(t.get('finalLeft', 0))
            if lost:
                # the opponent turn following this own turn: same round if seat is first, next round if second
                w = last.get((seat, rnd)) if seat == 'A' else last.get((seat, rnd + 1))
                if w is None:
                    reason = 'noWindowSeen'
                else:
                    legal, short, cond = w[6], w[7], w[8]
                    pos = w[17] is not None and w[17] > 0
                    reason = ('declinedPositiveQuick' if pos else 'declinedNonPositiveQuick') if legal else 'quickTooExpensive' if short else 'quickConditionUnmet' if cond else 'noQuickInHand'
                lost_reason[f'{df}|all'][reason] += lost
                lost_reason[f'{df}|{dk}'][reason] += lost
            eh = t.get('endHand')
            if eh and eh['time'] > 0:
                for kind, card, slot, cost in t['timeShortActions']:
                    end_short[df][f'{kind}:{slot}'] += 1
                for kind, card, cost, v, base, slot in t.get('declined', []):
                    if kind in PLAY:
                        own_declined[df][card] += 1
    out = {}
    for key, b in by.items():
        out[key] = {k: round(statistics.mean(v), 3) for k, v in b.items() if v}
        out[key]['turns'] = len(b['start'])
        out[key]['lostTotal'] = sum(b['lost'])
        out[key]['startTotal'] = sum(b['start'])
    return out, {k: dict(v) for k, v in lost_reason.items()}, {k: dict(v.most_common(12)) for k, v in end_short.items()}, {k: dict(v.most_common(15)) for k, v in own_declined.items()}


def trap_tables(matches):
    T = collections.defaultdict(C)
    for d in matches:
        for tr in d['traps']:
            df = diff_tag(d, tr['seat'])
            for k in (f"{df}|{tr['card']}", f"{df}|all"):
                T[k]['set'] += 1
                T[k][tr['fate']] += 1
                if tr['fate'] == 'activated':
                    T[k]['activated:' + (tr['leftCtx'] or '?')] += 1
                for off in tr.get('offers', []):
                    T[k]['offer:' + off[2]] += 1
                T[k]['setRoundSum'] += tr['setRound']
        for s in d['slotBlocked']:
            T[f"{diff_tag(d, s[0])}|slotBlocked:{s[3]}"][s[2]] += 1
        for seat in 'AB':
            T[f"{diff_tag(d, seat)}|quickWhileFull"]['n'] += d['quickWhileFull'][seat]
    out = {k: dict(v) for k, v in T.items()}
    for k, v in out.items():
        if 'set' in v:
            v['activationRate'] = rate(v.get('activated', 0), v['set'])
            v['meanSetRound'] = round(v.pop('setRoundSum') / v['set'], 2)
    return out


def play_counts(matches):
    # How often each method is used, from the window rows (quick) and traps; equips are not in this study's scope.
    P = collections.defaultdict(C)
    for d in matches:
        for w in d['windows']:
            if w[9] in PLAY and w[10] in w[6]:
                P[diff_tag(d, w[0])]['quick:' + w[2]] += 1
        for tr in d['traps']:
            P[diff_tag(d, tr['seat'])]['trapSet'] += 1
            if tr['fate'] == 'activated':
                P[diff_tag(d, tr['seat'])]['trapActivated:' + (tr['leftCtx'] or '?')] += 1
    return {k: dict(v) for k, v in P.items()}


def cf_tables(matches):
    T = collections.defaultdict(C)
    ex = collections.defaultdict(list)
    seats = C()
    for d in matches:
        for seat in 'AB':
            seats[diff_tag(d, seat)] += 1
        for r in d['cf']:
            seat, rnd, ctx, phase, time, ck, cc, cs, fk, fc, fslot, fs, fbase, tag = r
            kind = 'passInstead' if ck == 'pass' else ('equalScoreReorder' if abs(cs - fs) < 1e-9 else 'differentAction')
            key = f"{tag}|{diff_tag(d, seat)}"
            T[key][kind] += 1
            T[key][f'{kind}:{ctx}'] += 1
            if kind == 'passInstead':
                T[key][f'passInstead:{fk}:{fslot}'] += 1
                T[key][f'passInstead:R{min(rnd, 4) if rnd < 4 else "4+"}'] += 1
                if len(ex[key]) < 12:
                    ex[key].append({'match': d['match'], 'seat': seat, 'deck': d['deck'][seat], 'round': rnd, 'ctx': ctx, 'phase': phase, 'time': time,
                                    'chosen': ck, 'counterfactual': f'{fk}:{fc}:{fslot}', 'cfScore': fs, 'base': fbase})
    per_match = {}
    for d in matches:
        for seat in 'AB':
            n = sum(1 for r in d['cf'] if r[0] == seat and r[5] == 'pass' and r[13] == 'strictlyBetter')
            per_match.setdefault(diff_tag(d, seat), C())['seatsWithPassInstead' if n else 'seatsWithout'] += 1
    return {k: dict(v) for k, v in T.items()}, dict(ex), {k: dict(v) for k, v in per_match.items()}, dict(seats)


def birth_round(matches):
    """Round of own first birth per seat from the window/turn data is not recorded; use cf passInstead births instead."""
    return None


def reproduction(matches):
    old = {}
    for f in glob.glob(f'{CG}/deck-balance-20261025/runs/X-shard*.jsonl.gz'):
        for line in gzip.open(f, 'rt'):
            d = json.loads(line)
            old[d['match']] = d
    same = C()
    diffs = []
    for d in matches:
        o = old.get(d['match'])
        if not o:
            same['missing'] += 1
            continue
        ok_result = o['result'] == d['result']
        ok_rev = o['revision'] == d['revision']
        ok_ch = [c['winner'] for c in o['challenges']] == [c['winner'] for c in d['challenges']]
        key = 'identical' if (ok_result and ok_ch and ok_rev and o['growth'] == d['growth']) else 'different'
        same[key] += 1
        opp = d['deck']['B'] if d['deck']['A'] == 'partner' else d['deck']['A']
        same[f'{key}:{opp}'] += 1
        if key == 'different':
            played = set(k for s in 'AB' for k, v in o['cards'][s].items() if v['played'] or v['activated'])
            same['different:usedTakoyaki' if 'G-takoyaki-grill' in played else 'different:noTakoyaki'] += 1
        if key == 'different' and len(diffs) < 20:
            diffs.append({'match': d['match'], 'old': o['result'], 'new': d['result']})
    return {'compared': 'result, final growth, challenge winners and final revision against deck-balance-20261025 X records',
            'note': 'save hashes are not compared: the save format/version changed since 2026-10-25 (hotseat-6); every difference is in an item-deck match after the 2026-10-29 takoyaki self-target fix (e5a57fb9)',
            'counts': dict(same), 'examples': diffs}


def main():
    X, TR = load('X'), load('TR')
    S = {}
    for name, ms in (('X', X), ('TR', TR), ('ALL', X + TR)):
        ok = [d for d in ms if d['status'] == 'completed']
        w, used, skipped, last_opp, chal, this_turn = window_tables(ok)
        tt, lost_reason, end_short, own_declined = time_tables(ok)
        cf, cf_ex, cf_seats, seats = cf_tables(ok)
        S[name] = {
            'matches': len(ms), 'completed': len(ok),
            'policyCheck': dict(sum((C(d['policyCheck']) for d in ok), C())),
            'cfCheck': dict(sum((C(d['cfCheck']) for d in ok), C())),
            'windows': w, 'quickCardsUsed': used, 'quickCardsSkippedWhenLegal': skipped, 'lastOppWindow': last_opp,
            'oppChallengeWindows': chal, 'thisTurnCardsUsedOnOppTurn': this_turn,
            'time': tt, 'lostTimeReason': lost_reason, 'ownEndTimeShortActions': end_short, 'ownEndDeclinedQuick': own_declined,
            'traps': trap_tables(ok), 'methodUse': play_counts(ok),
            'counterfactual': cf, 'counterfactualExamples': cf_ex, 'counterfactualSeats': cf_seats, 'seatsByDifficulty': seats,
        }
    os.makedirs(f'{HERE}/results', exist_ok=True)
    json.dump(S, open(f'{HERE}/results/summary.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(reproduction([d for d in X if d['status'] == 'completed']), open(f'{HERE}/results/reproduction-X.json', 'w'), ensure_ascii=False, indent=1)
    print('written')


main()
