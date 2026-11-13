"""「チン」「キン」探し: 高い 帯域（4〜12 kHz）の 立ち上がりが まわりより 突出する 瞬間を 見つけ、楽譜の どの 音かを 対応づける。
使い方: python3 ping_scan.py <audio-dir> <scores.json> id [id ...]
"""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
adir, scores = sys.argv[1], {s['id']: s for s in json.load(open(sys.argv[2]))}
def scan(sid, top=12):
    x, sr = sf.read(f'{adir}/{sid}.flac'); m = x.mean(1) if x.ndim > 1 else x
    hi = sosfiltfilt(butter(4, [4000, 12000], 'bandpass', fs=sr, output='sos'), m)
    full = sosfiltfilt(butter(2, [100, 4000], 'bandpass', fs=sr, output='sos'), m)
    hop = int(sr * .005); n = len(m) // hop
    e = np.sqrt(np.add.reduceat(hi[:n * hop] ** 2, np.arange(0, n * hop, hop)) / hop) + 1e-9
    f = np.sqrt(np.add.reduceat(full[:n * hop] ** 2, np.arange(0, n * hop, hop)) / hop) + 1e-9
    db = 20 * np.log10(e); fdb = 20 * np.log10(f)
    # 突出度 = 高域の 瞬間値 − 前後 1.5 秒の 中央値。さらに 中低域との 比（高域だけ 飛び出す ものを 拾う）
    w = int(1.5 / .005); med = np.array([np.median(db[max(0, i - w):i + w]) for i in range(0, n)])
    ratio = db - fdb
    rmed = np.array([np.median(ratio[max(0, i - w):i + w]) for i in range(0, n)])
    score = (db - med) + .5 * (ratio - rmed)
    peaks = []
    order = np.argsort(-score)
    for i in order:
        if all(abs(i - j) > 40 for j, _ in peaks): peaks.append((i, score[i]))
        if len(peaks) >= top: break
    s = scores[sid]; ev = s['events']
    out = []
    for i, sc in sorted(peaks, key=lambda p: -p[1]):
        t = i * .005
        near = [x for x in ev if -0.03 <= t - x['t'] <= 0.06]
        near.sort(key=lambda x: -x['midi'])
        out.append((round(t, 2), round(float(sc), 1), round(float(db[i] - med[i]), 1), [(x['instrument'], x['role'], x['midi'], round(x['vel'], 3), x.get('layer')) for x in near[:4]]))
    return out
for sid in sys.argv[3:]:
    print('==', sid)
    for r in scan(sid): print('  ', r)
