"""V2 の 描き方で 楽器・役割ごとに 別々に 描き、高い 帯域（4〜12 kHz）の 突出（瞬間の ピーク）を 比べる。"""
import sys, json, pathlib, numpy as np
V2 = pathlib.Path('/home/user/v3/prototypes/bgm-v2-20261112/tools'); sys.path.insert(0, str(V2))
import library as L, render_v2 as R
from scipy.signal import butter, sosfiltfilt
SR = L.SR; lib = L.Library()
scores = {s['id']: s for s in json.load(open(V2.parent / 'scores-v2.json'))}
def hb(x):
    m = x.mean(1); h = sosfiltfilt(butter(4, [4000, 12000], 'bandpass', fs=SR, output='sos'), m)
    hop = int(SR * .005); n = len(h) // hop
    return 20 * np.log10(np.sqrt((h[:n * hop] ** 2).reshape(n, hop).mean(1)) + 1e-9)
for sid in sys.argv[1:]:
    s = scores[sid]; length = int(round(s['period'] * SR)); buses = {}
    for e in s['events']:
        role = e['role'] if e['role'] in R.BUS else 'accompaniment'
        x = lib.note(e['instrument'], e['midi'], e['dur'], e['vel'] * 10 ** (R.ROLE_DB[role] / 20), e.get('layer', 1))
        b = buses.setdefault((role, e['instrument']), np.zeros((length, 2)))
        R.place(b, x.astype(np.float64), int(round(e['t'] * SR)), e.get('pan', 0), R.BUS[role][2] * .9, True)
    tot = None
    out = {}
    for k, b in buses.items():
        b = R.eq(b, R.INST_EQ.get(k[1], []) + R.BUS[k[0]][0], True); buses[k] = b
        tot = b if tot is None else tot + b
    T = hb(tot); med = np.median(T[T > -120])
    print('==', sid, 'mix high-band median %.1f dB' % med)
    for k, b in buses.items():
        h = hb(b); full = 20 * np.log10(np.sqrt((b ** 2).mean()) + 1e-12)
        # 各 楽器の 高域ピーク（上位1%）が 全体の 中央値より どれだけ 上か、全体の 高域に 占める 割合
        print('  %-28s level %6.1f dB  hiP99 %+5.1f  hiMax %+5.1f  share-of-hi %4.0f%%' % (k, full, np.percentile(h, 99) - med, h.max() - med, 100 * (10 ** (h / 10)).sum() / (10 ** (T / 10)).sum()))
