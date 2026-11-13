"""V3 の 設定で 楽器・役割ごとに 描き、高域（4〜12 kHz）の 突出を 比べる（原因の 特定用）。"""
import sys, json, pathlib, numpy as np
sys.argv, ids = sys.argv[:1], sys.argv[1:]
import render_v3 as V; R = V.R; L = V.L
from scipy.signal import butter, sosfiltfilt
from scipy.ndimage import median_filter
SR = L.SR; lib = L.Library()
scores = {s['id']: s for s in json.load(open(V.ROOT / 'scores-v3.json'))}
def hb(x):
    m = x.mean(1); h = sosfiltfilt(butter(4, [6000, 12000], 'bandpass', fs=SR, output='sos'), m)
    hop = int(SR * .005); n = len(h) // hop
    return 10 * np.log10((h[:n * hop] ** 2).reshape(n, hop).mean(1) + 1e-14)
for sid in ids:
    s = scores[sid]; length = int(round(s['period'] * SR)); buses = {}
    for e in s['events']:
        role = e['role'] if e['role'] in R.BUS else 'accompaniment'
        x = lib.note(e['instrument'], e['midi'], e['dur'], e['vel'] * 10 ** (R.ROLE_DB[role] / 20), e.get('layer', 1))
        b = buses.setdefault((role, e['instrument']), np.zeros((length, 2)))
        R.place(b, x.astype(np.float64), int(round(e['t'] * SR)), e.get('pan', 0), R.BUS[role][2], True)
    roles = {}
    for k, b in buses.items(): buses[k] = R.eq(b, R.INST_EQ.get(k[1], []) + R.BUS[k[0]][0], True)
    ref = R.rms(sum(b for k, b in buses.items() if k[0] == 'melody')); tgt = dict(R.BALANCE); tgt.update(R.FAMILY_BALANCE.get(s['family'], {}))
    byrole = {}
    for k, b in buses.items(): byrole.setdefault(k[0], []).append(k)
    for role, ks in byrole.items():
        if role == 'melody': continue
        g = ref * 10 ** (tgt.get(role, -10) / 20) / max(R.rms(sum(buses[k] for k in ks)), 1e-12)
        for k in ks: buses[k] = buses[k] * g
    tot = sum(buses.values()); T = hb(tot); med = median_filter(T, 601, mode='wrap')
    print('==', sid)
    for k, b in buses.items():
        h = hb(b); j = h - med
        print('  %-28s maxJump %+5.1f  p99.9 %+5.1f  frames>15dB %4d  share %3.0f%%' % (k, j.max(), np.percentile(j, 99.9), (j > 15).sum(), 100 * (10 ** (h / 10)).sum() / (10 ** (T / 10)).sum()))
