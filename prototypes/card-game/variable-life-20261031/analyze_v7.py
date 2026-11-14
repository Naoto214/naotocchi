# VERSION 7 analysis (PLAN-V7.md). Reuses the analyze_v2/v4/v5 helpers (paired seed-group bootstrap CIs).
# Usage: python3 analyze_v7.py > results/summary-v7.json   (records: runs-v7/*.jsonl.gz, see integration/run-v7.sh)
import json, glob, sys, random
from collections import defaultdict, Counter
exec(open('analyze_v5.py').read().split('\nout = {}')[0])
random.seed(20261107)
def L(name): return load(f'runs-v7/{name}-shard*.jsonl.gz', f'runs-v7/{name}-manifest.json')
def raw(name):
    import gzip
    return [json.loads(l) for f in sorted(glob.glob(f'runs-v7/{name}-shard*.jsonl.gz')) for l in gzip.open(f, 'rt')]
out = {'plan': 'PLAN-V7.md', 'base': '88ff5e1f (main after PR #518, hotseat-8 / heuristic-3)'}
# ---- E1 / E2: identity checks (every match must agree) ----
def ident(a, b, field_b='saveSha256'):
    ka = {tuple(r['match'].split(':')[i] for i in (2, 3)) + (r['match'].split(':')[-1],): r for r in raw(a)}
    kb = {tuple(r['match'].split(':')[i] for i in (2, 3)) + (r['match'].split(':')[-1],): r for r in raw(b)}
    same = sum(1 for k in ka if k in kb and ka[k]['saveSha256'] == kb[k][field_b])
    return {'pairs': len(set(ka) & set(kb)), 'identical': same, 'all': same == len(ka) == len(kb),
            'notCompleted': sum(r['status'] != 'completed' for r in [*ka.values(), *kb.values()]),
            'policy': sorted({r['policy'] for r in ka.values()} | {r['policy'] for r in kb.values()})}
out['E1'] = {'OFFICIAL=L-A0': ident('EQ_OFF', 'EQ_LA0'), 'OFFICIAL=I7(no new cards)': ident('EQ_OFF', 'EQ_I7N0')}
out['E2'] = {} if not glob.glob('runs-v7/EQ_I7P3-shard3.jsonl.gz') else {'I-7(experiment IDs)=I7(candidate IDs, mapped back)': ident('EQ_IX', 'EQ_I7P3', 'saveSha256Unmapped')}
# ---- hotseat-8 conditions ----
cond = {'A0': L('EQ_LA0'), 'B4': L('M_B4'), 'P3': L('EQ_IX'), 'REC': L('M_REC'), 'RECP3': L('M_RECP3')}
out['conditions'] = {}
for c, rows in cond.items():
    sm = summary(rows); sm['comeback'] = comeback(rows); sm['cardUse'] = card_use5(rows); out['conditions'][c] = sm
M = ['behindR8', 'close', 'firstSeat', 'holdWin', 'spread', 'deck:main', 'deck:companion', 'deck:partner', 'deck:challenge', 'deck:growth', 'deck:item', 'deck:balance']
pairs = [('P3', 'B4'), ('P3', 'A0'), ('RECP3', 'A0'), ('P3', 'RECP3'), ('RECP3', 'REC'), ('B4', 'A0'), ('REC', 'A0')]
out['contrasts'] = {f'{a}-{b}': {m: contrast4(cond[a], cond[b], m) for m in M} for a, b in pairs}
# ---- decisions fixed in PLAN-V7 §2 ----
c = out['contrasts']
def sig_pos(x): return x['ci95'][0] > 0
def lo(x): return x['ci95'][0]
v6_holds = sig_pos(c['P3-B4']['behindR8'])
fs = lambda k: abs(c[f'{k}-A0']['firstSeat']['diff'])
alt = sig_pos(c['P3-RECP3']['behindR8']) and fs('P3') <= fs('RECP3') and out['conditions']['P3']['deckSpread'] <= out['conditions']['RECP3']['deckSpread']
out['decision'] = {'v6ConclusionHoldsOnHotseat8': v6_holds, 'standard': 'RECP3', 'P3IsImprovedAlternative': alt}
STD = {'main': 'N0P3', 'companion': 'N0P3', 'partner': 'L2P3', 'challenge': 'N0P3', 'growth': 'N0P3', 'item': 'N0P3', 'balance': 'L2P3'}
out['recommended'] = STD
out['alternative'] = {d: 'P3' for d in STD}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
